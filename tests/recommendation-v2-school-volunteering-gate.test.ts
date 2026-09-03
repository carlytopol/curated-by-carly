import assert from "node:assert/strict";
import test from "node:test";
import {
  ARTIFACT_REFERENCE_VERSION,
  CUSTOMER_DRESSING_BRIEF_VERSION,
  EVIDENCE_REFERENCE_VERSION,
  RECOMMENDATION_V2_TAXONOMY_VERSION,
  projectPersonalOutfitMemory,
  runIsolatedRecommendationV2,
  runRecommendationV2WithLazyWardrobe,
  type ArtifactRef,
  type CustomerDressingBrief,
  type EvidenceRef,
  type NarrowEventPolicyResult,
  type StyleProfileProjection,
  type WardrobeGarment,
} from "@/lib/recommendations/v2";

const generatedAt = "2026-07-29T17:00:00.000Z";
const ownerUserId = "synthetic:school-volunteering";
const requestId = `${ownerUserId}:request`;

function evidence(id: string): EvidenceRef {
  return {
    schemaVersion: EVIDENCE_REFERENCE_VERSION,
    evidenceId: `${ownerUserId}:${id}`,
    ownerUserId,
    authority: "customer-current",
    sourceType: "customer-statement",
    sourceVersion: "school-volunteering-release-gate.v1",
    confidence: "high",
    observedAt: generatedAt,
    effectiveFrom: null,
    effectiveUntil: null,
  };
}

function ref<S extends string>(schemaVersion: S, artifactId: string): ArtifactRef<S> {
  return {
    referenceVersion: ARTIFACT_REFERENCE_VERSION,
    schemaVersion,
    artifactId,
    artifactRevision: "1",
    requestId,
    ownerUserId,
    generatedAt,
  };
}

const customerEvidence = evidence("brief");
const brief: CustomerDressingBrief = {
  schemaVersion: CUSTOMER_DRESSING_BRIEF_VERSION,
  taxonomyVersion: RECOMMENDATION_V2_TAXONOMY_VERSION,
  artifactId: `${ownerUserId}:brief`,
  artifactRevision: "1",
  requestId,
  ownerUserId,
  generatedAt,
  evidenceRefs: [customerEvidence],
  originalLanguage: [],
  normalizedIntent: {
    occasion: "school-community",
    desiredTone: ["polished", "restrained"],
    practicalPurpose: ["walking"],
    explicitInstructions: [],
    unresolvedLanguage: [],
    confidence: "high",
    evidenceRefs: [customerEvidence],
  },
  desiredImpression: [],
  requiredQualities: [],
  avoidedQualities: [],
  comfortRequirements: [],
  accessibilityRequirements: [],
  coverageRequirements: [
    { kind: "neckline", operator: "at-most", value: "moderate", evidenceRefs: [customerEvidence] },
    { kind: "hem-length", operator: "at-least", value: "knee", evidenceRefs: [customerEvidence] },
    { kind: "opacity", value: "opaque", evidenceRefs: [customerEvidence] },
  ],
  footwearRequirements: [
    { kind: "walking", value: "sustained", evidenceRefs: [customerEvidence] },
    { kind: "heel-height", operator: "at-most", value: "flat", evidenceRefs: [customerEvidence] },
  ],
  carryingNeeds: [],
  movementRequirements: [{ kind: "walking", value: "high", evidenceRefs: [customerEvidence] }],
  explicitItemInstructions: [],
  activeCorrections: [],
  activeSuppressions: [{
    suppressionId: "suppress-roland-garros",
    ownerUserId,
    itemId: "roland-garros-tee",
    scope: "until-restored",
    revision: "1",
    active: true,
    evidenceRef: customerEvidence,
  }],
  consequentialUnknowns: [],
  manageableAssumptions: [],
  confidence: "high",
};

const eventPolicy: NarrowEventPolicyResult = {
  schemaVersion: "event-policy-result.v2.3.0",
  artifactId: `${ownerUserId}:policy`,
  artifactRevision: "1",
  requestId,
  ownerUserId,
  generatedAt,
  requiredRoles: ["shoes"],
  prohibitedRoles: [],
  confirmedVenueProhibitions: [],
  confirmedActivityRequirements: [],
  evidenceRefs: [],
};

function garment(
  itemId: string,
  role: WardrobeGarment["role"],
  overrides: Partial<WardrobeGarment> = {},
): WardrobeGarment {
  return {
    ownerUserId,
    itemId,
    name: itemId,
    role,
    foundationKind: role === "top" || role === "bottom" ? "top-bottom" : null,
    available: true,
    suppressed: false,
    formality: "polished-casual",
    materials: ["cotton"],
    silhouettes: ["balanced"],
    palettes: ["neutral"],
    genres: ["everyday"],
    securePockets: role === "bottom",
    walkability: role === "shoes" ? "high" : null,
    descriptors: [],
    evidenceRefs: [customerEvidence],
    ...overrides,
  };
}

test("school-volunteering release gate suppresses the graphic tee and surfaces only independently qualified looks", () => {
  const memory = projectPersonalOutfitMemory({
    artifactId: `${ownerUserId}:memory`,
    artifactRevision: "1",
    requestId,
    ownerUserId,
    generatedAt,
    observations: [],
  });
  const style: StyleProfileProjection = {
    ownerUserId,
    revision: "1",
    preferredFoundations: ["top-bottom"],
    silhouettes: ["balanced"],
    palettes: ["neutral"],
    materials: ["cotton"],
    avoidedItemIds: [],
    preferredItemIds: [],
    evidenceRefs: [],
  };
  const wardrobe = [
    garment("roland-garros-tee", "top", { descriptors: ["graphic tee"] }),
    garment("polished-knit-top", "top"),
    garment("walking-trouser", "bottom"),
    garment("flat-loafer", "shoes"),
    garment("cocktail-dress", "dress", {
      foundationKind: "dress",
      formality: "formal",
      genres: ["cocktail", "evening"],
    }),
    garment("high-heel", "shoes", {
      walkability: "low",
      descriptors: ["stiletto pump"],
    }),
  ];
  const result = runIsolatedRecommendationV2({
    generatedAt,
    brief,
    eventPolicy,
    weather: {
      temperatureF: 86,
      feelsLikeF: 89,
      humidityPercent: 68,
      precipitationProbability: 10,
      windMph: 4,
      daylight: true,
      evidenceRefs: [],
    },
    memory,
    style,
    wardrobe,
    correctionStateRef: ref("correction-state.v2.3.0", `${ownerUserId}:correction`),
    suppressionStateRef: ref("suppression-state.v2.3.0", `${ownerUserId}:suppression`),
    adjudicate: ({ validated }) => validated.filter((entry) => entry.passed).map((entry, index) => ({
      lookId: entry.look.artifactId,
      comparativeRank: index + 1,
      reality: "pass",
      personalPlausibility: "pass",
      effort: "pass",
      coherence: "pass",
      restraint: "pass",
      editorial: "pass",
      decisiveReasonCodes: ["approved"],
    })),
  });

  assert.equal(result.outcome.outcome, "recommend");
  if (result.outcome.outcome !== "recommend") return;
  assert.deepEqual(result.outcome.selected.items.map((item) => item.itemId), [
    "polished-knit-top",
    "walking-trouser",
    "flat-loafer",
  ]);
  assert.equal(result.outcome.challenger, null);
  assert.ok(result.trace.retrievals.some((retrieval) =>
    retrieval.rejectedItems.some((item) =>
      item.itemId === "roland-garros-tee" && item.reasonCodes.includes("suppressed"))));
  assert.ok(result.trace.retrievals.some((retrieval) =>
    retrieval.rejectedItems.some((item) =>
      item.itemId === "high-heel" && item.reasonCodes.includes("footwear-conflict"))));
  assert.ok(result.trace.stages.indexOf("dressing-posture") < result.trace.stages.indexOf("direction-led-retrieval"));
});

test("canonical wardrobe retrieval cannot run until Dressing Posture and directions exist", async () => {
  const memory = projectPersonalOutfitMemory({
    artifactId: `${ownerUserId}:memory`,
    artifactRevision: "1",
    requestId,
    ownerUserId,
    generatedAt,
    observations: [],
  });
  const style: StyleProfileProjection = {
    ownerUserId,
    revision: "1",
    preferredFoundations: ["top-bottom"],
    silhouettes: ["balanced"],
    palettes: ["neutral"],
    materials: ["cotton"],
    avoidedItemIds: [],
    preferredItemIds: [],
    evidenceRefs: [],
  };
  let loaderCalled = false;
  const result = await runRecommendationV2WithLazyWardrobe({
    generatedAt,
    brief,
    eventPolicy,
    weather: {
      temperatureF: 86,
      feelsLikeF: 89,
      humidityPercent: 68,
      precipitationProbability: 10,
      windMph: 4,
      daylight: true,
      evidenceRefs: [],
    },
    memory,
    style,
    correctionStateRef: ref("correction-state.v2.3.0", `${ownerUserId}:correction`),
    suppressionStateRef: ref("suppression-state.v2.3.0", `${ownerUserId}:suppression`),
    loadWardrobe: async ({ posture, directions }) => {
      loaderCalled = true;
      assert.equal(posture.ownerUserId, ownerUserId);
      assert.equal(posture.schemaVersion, "dressing-posture.v2.3.0");
      assert.ok(directions.length > 0);
      assert.ok(directions.every((direction) => direction.postureRef.artifactId === posture.artifactId));
      return [
        garment("polished-knit-top", "top"),
        garment("walking-trouser", "bottom"),
        garment("flat-loafer", "shoes"),
      ];
    },
    adjudicate: ({ validated }) => validated.filter((entry) => entry.passed).map((entry, index) => ({
      lookId: entry.look.artifactId,
      comparativeRank: index + 1,
      reality: "pass",
      personalPlausibility: "pass",
      effort: "pass",
      coherence: "pass",
      restraint: "pass",
      editorial: "pass",
      decisiveReasonCodes: ["approved"],
    })),
  });

  assert.equal(loaderCalled, true);
  assert.equal(result.outcome.outcome, "recommend");
  assert.ok(result.trace.stages.indexOf("dressing-posture") < result.trace.stages.indexOf("direction-led-retrieval"));
});

test("stylist adjudication fails closed when it omits, duplicates, or ambiguously ranks valid looks", () => {
  const memory = projectPersonalOutfitMemory({
    artifactId: `${ownerUserId}:memory`,
    artifactRevision: "1",
    requestId,
    ownerUserId,
    generatedAt,
    observations: [],
  });
  const style: StyleProfileProjection = {
    ownerUserId,
    revision: "1",
    preferredFoundations: ["top-bottom"],
    silhouettes: ["balanced"],
    palettes: ["neutral"],
    materials: ["cotton"],
    avoidedItemIds: [],
    preferredItemIds: [],
    evidenceRefs: [],
  };
  assert.throws(() => runIsolatedRecommendationV2({
    generatedAt,
    brief: { ...brief, activeSuppressions: [] },
    eventPolicy,
    weather: {
      temperatureF: 80,
      feelsLikeF: 82,
      humidityPercent: 50,
      precipitationProbability: 0,
      windMph: 2,
      daylight: true,
      evidenceRefs: [],
    },
    memory,
    style,
    wardrobe: [
      garment("top-a", "top"),
      garment("top-b", "top"),
      garment("bottom-a", "bottom"),
      garment("bottom-b", "bottom"),
      garment("shoe-a", "shoes"),
      garment("shoe-b", "shoes"),
    ],
    correctionStateRef: ref("correction-state.v2.3.0", `${ownerUserId}:correction`),
    suppressionStateRef: ref("suppression-state.v2.3.0", `${ownerUserId}:suppression`),
    adjudicate: () => [],
  }), /judge every deterministically valid look/i);
});
