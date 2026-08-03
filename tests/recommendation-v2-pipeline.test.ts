import assert from "node:assert/strict";
import test from "node:test";
import {
  ARTIFACT_REFERENCE_VERSION,
  CANDIDATE_LOOK_VERSION,
  CUSTOMER_DRESSING_BRIEF_VERSION,
  EVIDENCE_REFERENCE_VERSION,
  PERSONAL_OUTFIT_DIRECTION_VERSION,
  RECOMMENDATION_V2_TAXONOMY_VERSION,
  adjudicateValidatedLooks,
  buildPersonalOutfitDirections,
  composeRestrainedLooks,
  hardValidateLook,
  projectPersonalOutfitMemory,
  rebuildViableDirectionPortfolio,
  resolveDressingPosture,
  retrieveGarmentsForDirections,
  type ArtifactRef,
  type CandidateLook,
  type ComparativeJudgment,
  type CustomerDressingBrief,
  type EvidenceRef,
  type NarrowEventPolicyResult,
  type PersonalOutfitDirection,
  type StyleProfileProjection,
  type WardrobeGarment,
} from "@/lib/recommendations/v2";

const now = "2026-07-29T16:00:00.000Z";
const owner = "customer-a";
const evidence = (id: string): EvidenceRef => ({
  schemaVersion: EVIDENCE_REFERENCE_VERSION, evidenceId: id, ownerUserId: owner,
  authority: "customer-current", sourceType: "customer-statement", sourceVersion: "fixture.v1",
  confidence: "high", observedAt: now, effectiveFrom: null, effectiveUntil: null,
});
const weatherEvidence = (): EvidenceRef => ({
  schemaVersion: EVIDENCE_REFERENCE_VERSION, evidenceId: "weather", ownerUserId: null,
  authority: "connected-external-service", sourceType: "weather", sourceVersion: "fixture.v1",
  confidence: "high", observedAt: now, effectiveFrom: null, effectiveUntil: null,
});
const ref = <S extends string>(schemaVersion: S, artifactId: string): ArtifactRef<S> => ({
  referenceVersion: ARTIFACT_REFERENCE_VERSION, schemaVersion, artifactId, artifactRevision: "1",
  requestId: "request-a", ownerUserId: owner, generatedAt: now,
});
const brief = (): CustomerDressingBrief => ({
  schemaVersion: CUSTOMER_DRESSING_BRIEF_VERSION, taxonomyVersion: RECOMMENDATION_V2_TAXONOMY_VERSION,
  artifactId: "brief-a", artifactRevision: "1", requestId: "request-a", ownerUserId: owner,
  generatedAt: now, evidenceRefs: [evidence("brief")], originalLanguage: [],
  normalizedIntent: {
    occasion: "school-community", desiredTone: ["polished", "practical"], practicalPurpose: ["walking"],
    explicitInstructions: [], unresolvedLanguage: [], confidence: "high", evidenceRefs: [evidence("brief")],
  },
  desiredImpression: [], requiredQualities: [], avoidedQualities: [], comfortRequirements: [],
  accessibilityRequirements: [], coverageRequirements: [],
  footwearRequirements: [{ kind: "heel-height", operator: "at-most", value: "flat", evidenceRefs: [evidence("flat")] }],
  carryingNeeds: [], movementRequirements: [{ kind: "walking", value: "high", evidenceRefs: [evidence("walk")] }],
  explicitItemInstructions: [], activeCorrections: [], activeSuppressions: [], consequentialUnknowns: [],
  manageableAssumptions: [], confidence: "high",
});
const policy = (): NarrowEventPolicyResult => ({
  schemaVersion: "event-policy-result.v2.3.0", artifactId: "policy-a", artifactRevision: "1",
  requestId: "request-a", ownerUserId: owner, generatedAt: now, requiredRoles: ["shoes"],
  prohibitedRoles: [], confirmedVenueProhibitions: [], confirmedActivityRequirements: [], evidenceRefs: [],
});
const memory = () => projectPersonalOutfitMemory({
  artifactId: "memory-a", artifactRevision: "1", requestId: "request-a", ownerUserId: owner,
  generatedAt: now, observations: [],
});
const style = (): StyleProfileProjection => ({
  ownerUserId: owner, revision: "1", preferredFoundations: ["top-bottom"], silhouettes: ["balanced"],
  palettes: ["neutral"], materials: ["cotton"], avoidedItemIds: [], preferredItemIds: [], evidenceRefs: [],
});
const garment = (
  itemId: string,
  role: WardrobeGarment["role"],
  overrides: Partial<WardrobeGarment> = {},
): WardrobeGarment => ({
  ownerUserId: owner, itemId, name: itemId, role,
  foundationKind: role === "top" || role === "bottom" ? "top-bottom" : role === "dress" ? "dress" : null,
  available: true, suppressed: false, formality: "polished-casual", materials: ["cotton"],
  silhouettes: ["balanced"], palettes: ["neutral"], genres: ["everyday"], securePockets: role === "bottom",
  walkability: role === "shoes" ? "high" : null, descriptors: [], evidenceRefs: [evidence(itemId)], ...overrides,
});

function setup(customerBrief = brief()) {
  const eventPolicy = policy();
  const posture = resolveDressingPosture({
    artifactId: "posture-a", artifactRevision: "1", generatedAt: now, brief: customerBrief,
    eventPolicy, weather: {
      temperatureF: 90, feelsLikeF: 96, humidityPercent: 70, precipitationProbability: 10,
      windMph: 5, daylight: true, evidenceRefs: [weatherEvidence()],
    },
  });
  const personalMemory = memory();
  const styleProfile = style();
  const directions = buildPersonalOutfitDirections({
    posture, brief: customerBrief, eventPolicy, memory: personalMemory, style: styleProfile,
    correctionStateRef: ref("correction-state.v2.3.0", "corrections"),
    suppressionStateRef: ref("suppression-state.v2.3.0", "suppressions"),
  });
  return { customerBrief, eventPolicy, posture, personalMemory, styleProfile, directions };
}

test("V2 enforces an authoritative suppression across retrieval, regeneration, optional support, and explanation evidence", () => {
  const suppressionEvidence = evidence("authoritative-suppression");
  const customerBrief = brief();
  customerBrief.activeSuppressions = [{
    suppressionId: "suppression-a", ownerUserId: owner, itemId: "suppressed-graphic-top",
    scope: "until-restored", revision: "4", active: true, evidenceRef: suppressionEvidence,
  }];
  customerBrief.evidenceRefs.push(suppressionEvidence);
  const state = setup(customerBrief);
  assert.equal(state.customerBrief.activeSuppressions[0]?.active, true, "suppression must exist before enforcement");

  for (const direction of state.directions) {
    assert.equal(direction.briefRef.artifactId, state.customerBrief.artifactId);
    assert.equal(direction.postureRef.artifactId, state.posture.artifactId);
    assert.ok(direction.activeSuppressions.some((item) => item.active && item.itemId === "suppressed-graphic-top"));
  }

  const wardrobe = [
    garment("suppressed-graphic-top", "top"),
    garment("polished-top", "top"), garment("pocket-bottom", "bottom"), garment("walking-shoe", "shoes"),
    garment("optional-bag", "bag"), garment("optional-fragrance", "fragrance"),
  ];
  const retrieve = () => retrieveGarmentsForDirections({
    directions: state.directions, posture: state.posture, brief: state.customerBrief,
    style: state.styleProfile, memory: state.personalMemory, wardrobe,
  });
  const initial = retrieve();
  const regeneration = retrieve();
  for (const retrievals of [initial, regeneration]) {
    assert.ok(retrievals.every((retrieval) =>
      retrieval.rejectionReasons.some((item) => item.itemId === "suppressed-graphic-top" && item.reasonCodes.includes("suppressed"))));
    assert.ok(retrievals.every((retrieval) =>
      retrieval.foundationCandidates.flat().every((item) => item.itemId !== "suppressed-graphic-top")));
  }

  const looks = composeRestrainedLooks({ retrievals: initial, generatedAt: now });
  assert.equal(looks.length, 1, "fewer than three excellent foundations must remain fewer than three");
  assert.deepEqual(looks[0]?.items.map((item) => item.itemId), ["polished-top", "pocket-bottom", "walking-shoe"]);
  assert.ok(looks[0]?.omittedOptionalRoles.includes("bag"), "support pieces remain optional and foundation-relative");
  assert.ok(looks[0]?.omittedOptionalRoles.includes("fragrance"));
  assert.ok(looks.every((look) => look.items.every((item) => item.itemId !== "suppressed-graphic-top")));

  const consultationItemIds = looks.flatMap((look) => look.items.map((item) => item.itemId));
  const explanationFacts = looks.flatMap((look) => look.evidenceRefs.map((ref) => ref.evidenceId));
  assert.ok(!consultationItemIds.includes("suppressed-graphic-top"));
  assert.ok(!explanationFacts.includes("suppressed-graphic-top"));
});

test("Michelin date-night contract excludes a suppressed graphic tee and weak utility foundations", () => {
  const customerBrief = brief();
  customerBrief.normalizedIntent.occasion = "date";
  customerBrief.normalizedIntent.desiredTone = ["polished", "expressive"];
  customerBrief.activeSuppressions = [{
    suppressionId: "date-night-suppression",
    ownerUserId: owner,
    itemId: "suppressed-graphic-top",
    scope: "until-restored",
    revision: "7",
    active: true,
    evidenceRef: evidence("date-night-suppression"),
  }];
  const state = setup(customerBrief);
  const wardrobe = [
    garment("suppressed-graphic-top", "top", { formality: "professional", genres: ["streetwear"] }),
    garment("casual-tank", "top", { formality: "casual", genres: ["everyday"] }),
    garment("utility-pants", "bottom", { formality: "casual", genres: ["everyday"] }),
    garment("date-night-top", "top", { formality: "professional", genres: ["evening"] }),
    garment("date-night-bottom", "bottom", { formality: "professional", genres: ["evening"] }),
    garment("polished-flat", "shoes", { formality: "professional", walkability: "high" }),
    garment("optional-chain-bag", "bag", { formality: "dressy" }),
    garment("optional-fragrance", "fragrance", { formality: "dressy" }),
  ];
  const retrievals = retrieveGarmentsForDirections({
    directions: state.directions,
    posture: state.posture,
    brief: state.customerBrief,
    style: state.styleProfile,
    memory: state.personalMemory,
    wardrobe,
  });
  const rejected = retrievals.flatMap((retrieval) => retrieval.rejectionReasons);
  assert.ok(rejected.some((item) => item.itemId === "suppressed-graphic-top" && item.reasonCodes.includes("suppressed")));
  assert.ok(rejected.some((item) => item.itemId === "casual-tank" && item.reasonCodes.includes("formality-conflict")));
  assert.ok(rejected.some((item) => item.itemId === "utility-pants" && item.reasonCodes.includes("formality-conflict")));

  const looks = composeRestrainedLooks({ retrievals, generatedAt: now });
  assert.equal(looks.length, 1, "the engine must return fewer options instead of padding a weak date-night set");
  assert.deepEqual(looks[0]?.items.map((item) => item.itemId), ["date-night-top", "date-night-bottom", "polished-flat"]);
  assert.ok(looks[0]?.omittedOptionalRoles.includes("bag"));
  assert.ok(looks[0]?.omittedOptionalRoles.includes("fragrance"));
  assert.ok(looks.every((look) => !look.items.some((item) => item.itemId === "suppressed-graphic-top")));
  assert.ok(looks.every((look) => !look.evidenceRefs.some((item) => item.evidenceId === "suppressed-graphic-top")));
});

test("direction-led retrieval rejects formal, heat-inappropriate, suppressed, and impractical garments before composition", () => {
  const state = setup();
  const wardrobe = [
    garment("polished-top", "top"),
    garment("pocket-bottom", "bottom"),
    garment("flat-walking-shoe", "shoes"),
    garment("roland-garros-tee", "top", { suppressed: true }),
    garment("cocktail-dress", "dress", { genres: ["cocktail"], formality: "formal" }),
    garment("long-sleeve-wool", "top", { materials: ["wool-heavy"] }),
    garment("stiletto-pump", "shoes", { name: "Pointed-toe stiletto pump", walkability: "low" }),
  ];
  const [retrieval] = retrieveGarmentsForDirections({
    directions: state.directions, posture: state.posture, brief: state.customerBrief,
    style: state.styleProfile, memory: state.personalMemory, wardrobe,
  });
  assert.deepEqual(retrieval?.foundationCandidates.map((items) => items.map((item) => item.itemId)), [
    ["polished-top", "pocket-bottom"],
  ]);
  const rejected = new Map(retrieval?.rejectionReasons.map((item) => [item.itemId, item.reasonCodes]));
  assert.ok(rejected.get("roland-garros-tee")?.includes("suppressed"));
  assert.ok(rejected.get("cocktail-dress")?.includes("formality-conflict"));
  assert.ok(rejected.get("long-sleeve-wool")?.includes("material-conflict"));
  assert.ok(rejected.get("stiletto-pump")?.includes("footwear-conflict"));
});

test("restrained composition returns fewer options rather than duplicate foundations or repeated shoes", () => {
  const state = setup();
  const wardrobe = [
    garment("top-a", "top"), garment("bottom-a", "bottom"), garment("shoe-a", "shoes"),
  ];
  const retrievals = retrieveGarmentsForDirections({
    directions: state.directions, posture: state.posture, brief: state.customerBrief,
    style: state.styleProfile, memory: state.personalMemory, wardrobe,
  });
  const looks = composeRestrainedLooks({ retrievals, generatedAt: now });
  assert.equal(looks.length, 1);
  assert.deepEqual(looks[0]?.items.map((item) => item.itemId), ["top-a", "bottom-a", "shoe-a"]);
});

test("suppression rebuilds the direction portfolio and returns one complete surviving look", () => {
  const customerBrief = brief();
  customerBrief.normalizedIntent.occasion = "business-meeting";
  customerBrief.activeSuppressions = [{
    suppressionId: "suppression-rebuild", ownerUserId: owner, itemId: "preferred-top",
    scope: "until-restored", revision: "1", active: true,
    evidenceRef: evidence("suppression-rebuild"),
  }];
  const state = setup(customerBrief);
  assert.ok(state.directions.some((direction) => direction.foundationConcept === "coordinated-set"));
  const retrievals = retrieveGarmentsForDirections({
    directions: state.directions, posture: state.posture, brief: state.customerBrief,
    style: state.styleProfile, memory: state.personalMemory,
    wardrobe: [
      garment("preferred-top", "top", { formality: "professional" }),
      garment("orphan-bottom", "bottom", { formality: "professional" }),
      garment("surviving-dress", "dress", { formality: "professional" }),
      garment("polished-walking-shoe", "shoes", { formality: "polished-casual", walkability: "high" }),
      garment("support-piece", "accessory", { formality: "professional" }),
    ],
  });
  const topBottom = retrievals.find((entry) => entry.direction.foundationConcept === "top-bottom");
  assert.equal(topBottom?.foundationCandidates.length, 0, "a support piece cannot replace the suppressed top");
  const rebuilt = rebuildViableDirectionPortfolio(retrievals);
  assert.deepEqual(rebuilt.map((entry) => entry.direction.foundationConcept), ["dress"]);
  const looks = composeRestrainedLooks({ retrievals: rebuilt, generatedAt: now });
  assert.equal(looks.length, 1);
  assert.deepEqual(looks[0]?.items.map((item) => item.role), ["dress", "shoes"]);
});

test("zero complete directions produce an honest abstention before persistence surfaces", () => {
  const state = setup();
  const retrievals = retrieveGarmentsForDirections({
    directions: state.directions, posture: state.posture, brief: state.customerBrief,
    style: state.styleProfile, memory: state.personalMemory,
    wardrobe: [garment("top", "top"), garment("bottom", "bottom")],
  });
  const rebuilt = rebuildViableDirectionPortfolio(retrievals);
  assert.equal(rebuilt.length, 0);
  const looks = composeRestrainedLooks({ retrievals: rebuilt, generatedAt: now });
  assert.deepEqual(looks, []);
  assert.deepEqual(adjudicateValidatedLooks({ validated: [], judgments: [] }), {
    outcome: "abstain", reasonCodes: ["incomplete-outfit"], adjudicatorVersion: "stylist-adjudicator.v2.1.0",
  });
});

test("hard validation independently rejects dress plus top, duplicate roles, and suppressed items", () => {
  const state = setup();
  const direction = {
    ...state.directions[0],
    schemaVersion: PERSONAL_OUTFIT_DIRECTION_VERSION,
    foundationConcept: "dress",
    requiredRoles: ["dress", "shoes"],
  } as PersonalOutfitDirection;
  const look: CandidateLook = {
    schemaVersion: CANDIDATE_LOOK_VERSION, taxonomyVersion: RECOMMENDATION_V2_TAXONOMY_VERSION,
    artifactId: "invalid-look", artifactRevision: "1", requestId: "request-a", ownerUserId: owner,
    generatedAt: now, directionRef: ref(PERSONAL_OUTFIT_DIRECTION_VERSION, direction.artifactId),
    items: [garment("dress-a", "dress"), garment("unrelated-top", "top"), garment("shoe-a", "shoes")],
    omittedOptionalRoles: [], evidenceRefs: [], diagnostics: { cohesion: 99, personalPolish: 99, burden: 3, confidence: "high" },
  };
  const result = hardValidateLook({
    look, direction, posture: state.posture, eventPolicy: state.eventPolicy,
    brief: state.customerBrief, style: state.styleProfile,
  });
  assert.equal(result.passed, false);
  assert.ok(result.checks.find((check) => check.check === "outfit-completeness")?.reasonCodes.includes("incomplete-outfit"));
});

const judgment = (lookId: string, comparativeRank: number, pass = true): ComparativeJudgment => ({
  lookId, comparativeRank,
  reality: pass ? "pass" : "fail", personalPlausibility: pass ? "pass" : "fail",
  effort: pass ? "pass" : "fail", coherence: pass ? "pass" : "fail",
  restraint: pass ? "pass" : "fail", editorial: pass ? "pass" : "fail",
  decisiveReasonCodes: pass ? ["approved"] : ["editorial-rejection"],
});

test("stylist adjudication, not aggregate diagnostics, chooses the primary recommendation", () => {
  const state = setup();
  const direction = state.directions[0]!;
  const makeLook = (id: string, score: number): CandidateLook => ({
    schemaVersion: CANDIDATE_LOOK_VERSION, taxonomyVersion: RECOMMENDATION_V2_TAXONOMY_VERSION,
    artifactId: id, artifactRevision: "1", requestId: "request-a", ownerUserId: owner, generatedAt: now,
    directionRef: ref(PERSONAL_OUTFIT_DIRECTION_VERSION, direction.artifactId),
    items: [garment(`${id}-top`, "top"), garment(`${id}-bottom`, "bottom"), garment(`${id}-shoe`, "shoes")],
    omittedOptionalRoles: [], evidenceRefs: [], diagnostics: { cohesion: score, personalPolish: score, burden: 3, confidence: "high" },
  });
  const highScore = makeLook("high-score", 100);
  const stylistChoice = makeLook("stylist-choice", 10);
  const validated = [highScore, stylistChoice].map((look) => hardValidateLook({
    look, direction, posture: state.posture, eventPolicy: state.eventPolicy,
    brief: state.customerBrief, style: state.styleProfile,
  }));
  const outcome = adjudicateValidatedLooks({
    validated, judgments: [judgment("high-score", 2), judgment("stylist-choice", 1)],
  });
  assert.equal(outcome.outcome, "recommend");
  if (outcome.outcome === "recommend") assert.equal(outcome.selected.artifactId, "stylist-choice");
});
