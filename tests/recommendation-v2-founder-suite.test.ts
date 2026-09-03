import assert from "node:assert/strict";
import test from "node:test";
import {
  ARTIFACT_REFERENCE_VERSION,
  CUSTOMER_DRESSING_BRIEF_VERSION,
  EVIDENCE_REFERENCE_VERSION,
  RECOMMENDATION_V2_TAXONOMY_VERSION,
  projectPersonalOutfitMemory,
  runIsolatedRecommendationV2,
  type ArtifactRef,
  type CustomerDressingBrief,
  type EvidenceRef,
  type NarrowEventPolicyResult,
  type StyleProfileProjection,
  type WardrobeGarment,
} from "@/lib/recommendations/v2";

const generatedAt = "2026-07-29T16:00:00.000Z";

type Scenario = {
  id: string;
  occasion: NonNullable<CustomerDressingBrief["normalizedIntent"]["occasion"]>;
  temperatureF: number;
  walking: boolean;
  rain: number;
  expectedFormalityCeiling: string;
};

const scenarios: Scenario[] = [
  { id: "outdoor-concert", occasion: "outdoor-social", temperatureF: 94, walking: true, rain: 5, expectedFormalityCeiling: "dressy" },
  { id: "nice-dinner", occasion: "dinner", temperatureF: 78, walking: false, rain: 5, expectedFormalityCeiling: "formal" },
  { id: "casual-lunch", occasion: "lunch", temperatureF: 82, walking: false, rain: 5, expectedFormalityCeiling: "dressy" },
  { id: "property-tour", occasion: "business-meeting", temperatureF: 84, walking: true, rain: 5, expectedFormalityCeiling: "formal" },
  { id: "travel-day", occasion: "travel", temperatureF: 74, walking: true, rain: 5, expectedFormalityCeiling: "professional" },
  { id: "date-night", occasion: "date", temperatureF: 76, walking: false, rain: 5, expectedFormalityCeiling: "formal" },
  { id: "saturday-shopping", occasion: "shopping", temperatureF: 88, walking: true, rain: 5, expectedFormalityCeiling: "professional" },
  { id: "business-casual", occasion: "work", temperatureF: 72, walking: false, rain: 5, expectedFormalityCeiling: "dressy" },
  { id: "outdoor-brunch", occasion: "outdoor-social", temperatureF: 86, walking: false, rain: 5, expectedFormalityCeiling: "dressy" },
  { id: "rainy-day", occasion: "errands", temperatureF: 65, walking: true, rain: 85, expectedFormalityCeiling: "professional" },
];

function externalEvidence(id: string): EvidenceRef {
  return {
    schemaVersion: EVIDENCE_REFERENCE_VERSION,
    evidenceId: id,
    ownerUserId: null,
    authority: "connected-external-service",
    sourceType: "weather",
    sourceVersion: "synthetic-founder-suite.v1",
    confidence: "high",
    observedAt: generatedAt,
    effectiveFrom: null,
    effectiveUntil: null,
  };
}

function customerEvidence(ownerUserId: string, id: string): EvidenceRef {
  return {
    schemaVersion: EVIDENCE_REFERENCE_VERSION,
    evidenceId: `${ownerUserId}:${id}`,
    ownerUserId,
    authority: "customer-current",
    sourceType: "customer-statement",
    sourceVersion: "synthetic-founder-suite.v1",
    confidence: "high",
    observedAt: generatedAt,
    effectiveFrom: null,
    effectiveUntil: null,
  };
}

function ref<S extends string>(
  ownerUserId: string,
  requestId: string,
  schemaVersion: S,
  artifactId: string,
): ArtifactRef<S> {
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

function inputs(scenario: Scenario, ownerUserId = `synthetic:${scenario.id}`) {
  const requestId = `${ownerUserId}:request`;
  const evidence = customerEvidence(ownerUserId, "brief");
  const brief: CustomerDressingBrief = {
    schemaVersion: CUSTOMER_DRESSING_BRIEF_VERSION,
    taxonomyVersion: RECOMMENDATION_V2_TAXONOMY_VERSION,
    artifactId: `${ownerUserId}:brief`,
    artifactRevision: "1",
    requestId,
    ownerUserId,
    generatedAt,
    evidenceRefs: [evidence],
    originalLanguage: [],
    normalizedIntent: {
      occasion: scenario.occasion,
      desiredTone: ["polished", "practical"],
      practicalPurpose: scenario.walking ? ["walking"] : [],
      explicitInstructions: [],
      unresolvedLanguage: [],
      confidence: "high",
      evidenceRefs: [evidence],
    },
    desiredImpression: [],
    requiredQualities: [],
    avoidedQualities: [],
    comfortRequirements: [],
    accessibilityRequirements: [],
    coverageRequirements: [],
    footwearRequirements: scenario.walking
      ? [{ kind: "walking", value: "sustained", evidenceRefs: [evidence] }]
      : [],
    carryingNeeds: [],
    movementRequirements: scenario.walking
      ? [{ kind: "walking", value: "high", evidenceRefs: [evidence] }]
      : [],
    explicitItemInstructions: [],
    activeCorrections: [],
    activeSuppressions: [],
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
  const garment = (
    itemId: string,
    role: WardrobeGarment["role"],
    overrides: Partial<WardrobeGarment> = {},
  ): WardrobeGarment => ({
    ownerUserId,
    itemId,
    name: itemId,
    role,
    foundationKind: role === "top" || role === "bottom" ? "top-bottom" : null,
    available: true,
    suppressed: false,
    formality: ["dinner", "date", "work", "business-meeting"].includes(scenario.occasion)
      ? "professional"
      : scenario.occasion === "workout"
        ? "casual"
        : "polished-casual",
    materials: ["cotton"],
    silhouettes: ["balanced"],
    palettes: ["neutral"],
    genres: ["everyday"],
    securePockets: role === "bottom",
    walkability: role === "shoes" ? "high" : null,
    descriptors: [],
    evidenceRefs: [evidence],
    ...overrides,
  });
  return {
    generatedAt,
    brief,
    eventPolicy,
    weather: {
      temperatureF: scenario.temperatureF,
      feelsLikeF: scenario.temperatureF + 2,
      humidityPercent: 55,
      precipitationProbability: scenario.rain,
      windMph: 6,
      daylight: true,
      evidenceRefs: [externalEvidence(`${scenario.id}:weather`)],
    },
    memory,
    style,
    wardrobe: [garment("top", "top"), garment("bottom", "bottom"), garment("shoe", "shoes")],
    correctionStateRef: ref(ownerUserId, requestId, "correction-state.v2.3.0", `${ownerUserId}:correction`),
    suppressionStateRef: ref(ownerUserId, requestId, "suppression-state.v2.3.0", `${ownerUserId}:suppression`),
    adjudicate: ({ validated }: { validated: Array<{ look: { artifactId: string }; passed: boolean }> }) =>
      validated.map(({ look, passed }, index) => ({
        lookId: look.artifactId,
        comparativeRank: index + 1,
        reality: passed ? "pass" as const : "fail" as const,
        personalPlausibility: passed ? "pass" as const : "fail" as const,
        effort: passed ? "pass" as const : "fail" as const,
        coherence: passed ? "pass" as const : "fail" as const,
        restraint: passed ? "pass" as const : "fail" as const,
        editorial: passed ? "pass" as const : "fail" as const,
        decisiveReasonCodes: passed ? ["approved" as const] : ["editorial-rejection" as const],
      })),
  };
}

test("Founder Validation Suite exercises ten universal contexts through the governed stage order", () => {
  for (const scenario of scenarios) {
    const result = runIsolatedRecommendationV2(inputs(scenario));
    assert.equal(result.outcome.outcome, "recommend", scenario.id);
    assert.deepEqual(result.trace.stages, [
      "customer-dressing-brief",
      "event-policy",
      "dressing-posture",
      "personal-outfit-memory",
      "personal-outfit-directions",
      "direction-led-retrieval",
      "restrained-composition",
      "hard-validation",
      "stylist-adjudication",
    ]);
    assert.equal(result.trace.rejectedCandidates.length, 0);
    assert.ok(result.trace.posture.evidenceIds.includes(`${scenario.id}:weather`));
    if (scenario.temperatureF >= 88) {
      assert.ok(result.trace.retrievals.every((retrieval) =>
        retrieval.rejectedItems.every((item) => !item.reasonCodes.includes("approved"))));
    }
  }
});

test("unknown venue data remains manageable when it does not change viability", () => {
  const result = runIsolatedRecommendationV2(inputs(scenarios[2]!));
  assert.equal(result.outcome.outcome, "recommend");
  assert.equal(result.trace.posture.criticalUnknownCount, 0);
});
