import assert from "node:assert/strict";
import test from "node:test";
import {
  CUSTOMER_DRESSING_BRIEF_VERSION,
  EVIDENCE_REFERENCE_VERSION,
  buildCustomerDressingBrief,
  confirmCustomerDressingBrief,
  validateCustomerDressingBrief,
  type EvidenceAuthority,
  type EvidenceRef,
} from "@/lib/recommendations/v2";

const now = "2026-07-29T15:00:00.000Z";
const evidence = (
  evidenceId: string,
  ownerUserId = "customer-a",
  authority: EvidenceAuthority = "customer-current",
): EvidenceRef => ({
  schemaVersion: EVIDENCE_REFERENCE_VERSION,
  evidenceId,
  ownerUserId,
  authority,
  sourceType: authority === "customer-current"
    ? "customer-statement"
    : authority === "customer-durable" || authority === "inference"
      ? "profile"
      : "customer-service-action",
  sourceVersion: "fixture.v1",
  confidence: authority === "inference" ? "low" : "high",
  observedAt: now,
  effectiveFrom: null,
  effectiveUntil: null,
});

const base = (ownerUserId = "customer-a") => ({
  artifactId: `brief-${ownerUserId}`,
  artifactRevision: "1",
  requestId: `request-${ownerUserId}`,
  ownerUserId,
  generatedAt: now,
});

test("typed normalization preserves exact language and produces a runtime-valid governed brief", () => {
  const text = "Volunteering at school. Polished but comfortable, flat shoes, and a lot of walking.";
  const brief = buildCustomerDressingBrief({
    ...base(),
    statements: [{ text, evidenceRef: evidence("statement-1") }],
  });
  assert.equal(brief.schemaVersion, CUSTOMER_DRESSING_BRIEF_VERSION);
  assert.equal(brief.originalLanguage[0]?.text, text);
  assert.equal(brief.normalizedIntent.occasion, "school-community");
  assert.deepEqual(brief.normalizedIntent.desiredTone.sort(), ["polished"]);
  assert.ok(brief.requiredQualities.some(({ quality }) => quality === "comfortable"));
  assert.ok(brief.requiredQualities.some(({ quality }) => quality === "walkable"));
  assert.ok(brief.footwearRequirements.some((requirement) =>
    requirement.kind === "heel-height" && requirement.value === "flat"));
  assert.ok(brief.movementRequirements.some((requirement) =>
    requirement.kind === "walking" && requirement.value === "high"));
  assert.equal(validateCustomerDressingBrief(brief).success, true);
});

test("explicit current direction outranks inferred profile defaults without overwriting them", () => {
  const brief = buildCustomerDressingBrief({
    ...base(),
    statements: [{
      text: "Keep this relaxed and practical.",
      evidenceRef: evidence("statement-current"),
    }],
    profileDefaults: [{
      evidenceRef: evidence("profile-inferred", "customer-a", "inference"),
      desiredTone: ["expressive"],
      preferredQualities: ["intentional"],
    }],
  });
  assert.deepEqual(brief.normalizedIntent.desiredTone.sort(), ["practical", "relaxed"]);
  assert.equal(brief.evidenceRefs.some(({ evidenceId }) => evidenceId === "profile-inferred"), true);
});

test("failed or ambiguous normalization remains visible and cannot become a hidden veto", () => {
  const brief = buildCustomerDressingBrief({
    ...base(),
    statements: [{
      text: "Make it feel like the blue hour.",
      evidenceRef: evidence("statement-poetic"),
    }],
  });
  assert.equal(brief.normalizedIntent.unresolvedLanguage[0]?.text, "Make it feel like the blue hour.");
  assert.equal(brief.normalizedIntent.unresolvedLanguage[0]?.mayDriveDecision, false);
  assert.equal(brief.consequentialUnknowns.length, 0);
  assert.equal(brief.manageableAssumptions.length, 1);
});

test("consequential unknowns and direct conflicts ask one focused question", () => {
  const brief = buildCustomerDressingBrief({
    ...base(),
    statements: [
      { text: "I need it to honor the important rule.", evidenceRef: evidence("statement-unknown") },
      {
        text: "I need a bag.",
        evidenceRef: evidence("statement-bag-required"),
        confirmedMeaning: { carryingNeeds: [{ kind: "bag", value: "required" }] },
      },
      {
        text: "I cannot carry a bag.",
        evidenceRef: evidence("statement-bag-prohibited"),
        confirmedMeaning: { carryingNeeds: [{ kind: "bag", value: "prohibited" }] },
      },
    ],
  });
  assert.ok(brief.consequentialUnknowns.some(({ consequence }) => consequence === "changes-viability"));
  assert.ok(brief.consequentialUnknowns.some(({ subject }) => subject.includes("required or prohibited")));
  assert.ok(brief.consequentialUnknowns.every(({ focusedQuestion }) => Boolean(focusedQuestion)));
});

test("unknown evidence never defaults to false and an absent profile remains neutral", () => {
  const brief = buildCustomerDressingBrief(base());
  assert.equal(brief.normalizedIntent.occasion, null);
  assert.deepEqual(brief.normalizedIntent.desiredTone, []);
  assert.deepEqual(brief.requiredQualities, []);
  assert.deepEqual(brief.coverageRequirements, []);
  assert.deepEqual(brief.footwearRequirements, []);
  assert.deepEqual(brief.carryingNeeds, []);
  assert.equal(brief.confidence, "low");
  assert.match(brief.manageableAssumptions[0]?.statement ?? "", /remain neutral/);
});

test("protected characteristics do not become coverage or style rules", () => {
  const brief = buildCustomerDressingBrief({
    ...base(),
    statements: [{
      text: "I am 55 and live in Atlanta.",
      evidenceRef: evidence("statement-protected"),
    }],
  });
  assert.deepEqual(brief.coverageRequirements, []);
  assert.deepEqual(brief.normalizedIntent.desiredTone, []);
  assert.equal(brief.normalizedIntent.unresolvedLanguage.length, 1);
});

test("customer-readable confirmation states what is understood and is candid about unresolved language", () => {
  const brief = buildCustomerDressingBrief({
    ...base(),
    statements: [
      { text: "Dinner, polished, no heels.", evidenceRef: evidence("statement-clear") },
      { text: "Give it a particular energy.", evidenceRef: evidence("statement-unclear") },
    ],
  });
  const confirmation = confirmCustomerDressingBrief(brief);
  assert.match(confirmation.headline, /understood/i);
  assert.ok(confirmation.understood.some((line) => line.includes("dinner")));
  assert.ok(confirmation.unresolved.some((line) => line.includes("particular energy")));
});

test("item instructions preserve display language, scope, confidence, and provenance", () => {
  const statementEvidence = evidence("statement-item");
  const brief = buildCustomerDressingBrief({
    ...base(),
    statements: [{
      text: "Do not use the Roland Garros shirt today.",
      evidenceRef: statementEvidence,
      confirmedMeaning: {
        explicitItemInstructions: [{
          itemId: "item-roland-garros",
          normalizedAction: "prohibit-item",
          scope: "today-only",
        }],
      },
    }],
  });
  assert.deepEqual(brief.explicitItemInstructions[0], {
    itemId: "item-roland-garros",
    normalizedAction: "prohibit-item",
    scope: "today-only",
    displayLanguage: "Do not use the Roland Garros shirt today.",
    evidenceRefs: [statementEvidence],
  });
});

test("cross-customer statements, profiles, corrections, and suppressions fail closed", () => {
  assert.throws(() => buildCustomerDressingBrief({
    ...base("customer-a"),
    statements: [{ text: "Polished.", evidenceRef: evidence("foreign", "customer-b") }],
  }), /owner mismatch/);
  assert.throws(() => buildCustomerDressingBrief({
    ...base("customer-a"),
    profileDefaults: [{
      evidenceRef: evidence("foreign-profile", "customer-b", "inference"),
      desiredTone: ["polished"],
    }],
  }), /owner mismatch/);
  assert.throws(() => buildCustomerDressingBrief({
    ...base("customer-a"),
    activeCorrections: [{
      correctionId: "correction-b",
      ownerUserId: "customer-b",
      scope: "until-restored",
      revision: "1",
      evidenceRef: evidence("correction-b", "customer-b", "customer-durable"),
    }],
  }), /Invalid Customer Dressing Brief/);
});

test("institutional and connected-service evidence cannot impersonate customer direction", () => {
  for (const [authority, sourceType] of [
    ["connected-external-service", "calendar"],
    ["founder-evaluation", "founder-evaluation"],
    ["product-evaluation", "product-evaluation"],
    ["automated-test", "automated-test"],
  ] as const) {
    const ref: EvidenceRef = {
      ...evidence(`forbidden-${authority}`),
      ownerUserId: authority === "connected-external-service" ? "customer-a" : null,
      authority,
      sourceType,
    };
    assert.throws(() => buildCustomerDressingBrief({
      ...base(),
      statements: [{ text: "Make this formal.", evidenceRef: ref }],
    }), /customer-authorized evidence/);
  }
});
