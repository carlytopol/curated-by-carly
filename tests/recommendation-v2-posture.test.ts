import assert from "node:assert/strict";
import test from "node:test";
import {
  ARTIFACT_REFERENCE_VERSION,
  CUSTOMER_DRESSING_BRIEF_VERSION,
  EVIDENCE_REFERENCE_VERSION,
  RECOMMENDATION_V2_TAXONOMY_VERSION,
  assertPipelineOrder,
  resolveDressingPosture,
  type CustomerDressingBrief,
  type EvidenceRef,
  type NarrowEventPolicyResult,
} from "@/lib/recommendations/v2";

const now = "2026-07-29T16:00:00.000Z";
const evidence = (id: string, sourceType: "customer-statement" | "weather" = "customer-statement"): EvidenceRef => ({
  schemaVersion: EVIDENCE_REFERENCE_VERSION,
  evidenceId: id,
  ownerUserId: "customer-a",
  authority: sourceType === "weather" ? "connected-external-service" : "customer-current",
  sourceType,
  sourceVersion: "fixture.v1",
  confidence: "high",
  observedAt: now,
  effectiveFrom: null,
  effectiveUntil: null,
});

const brief = (): CustomerDressingBrief => ({
  schemaVersion: CUSTOMER_DRESSING_BRIEF_VERSION,
  taxonomyVersion: RECOMMENDATION_V2_TAXONOMY_VERSION,
  artifactId: "brief-a",
  artifactRevision: "1",
  requestId: "request-a",
  ownerUserId: "customer-a",
  generatedAt: now,
  evidenceRefs: [evidence("statement")],
  originalLanguage: [],
  normalizedIntent: {
    occasion: "school-community",
    desiredTone: ["polished", "practical"],
    practicalPurpose: ["walking"],
    explicitInstructions: [],
    unresolvedLanguage: [],
    confidence: "high",
    evidenceRefs: [evidence("statement")],
  },
  desiredImpression: [],
  requiredQualities: [],
  avoidedQualities: [],
  comfortRequirements: [],
  accessibilityRequirements: [],
  coverageRequirements: [],
  footwearRequirements: [{ kind: "heel-height", operator: "at-most", value: "flat", evidenceRefs: [evidence("statement")] }],
  carryingNeeds: [],
  movementRequirements: [{ kind: "walking", value: "high", evidenceRefs: [evidence("statement")] }],
  explicitItemInstructions: [],
  activeCorrections: [],
  activeSuppressions: [],
  consequentialUnknowns: [],
  manageableAssumptions: [],
  confidence: "high",
});

const policy = (): NarrowEventPolicyResult => ({
  schemaVersion: "event-policy-result.v2.3.0",
  artifactId: "policy-a",
  artifactRevision: "1",
  requestId: "request-a",
  ownerUserId: "customer-a",
  generatedAt: now,
  requiredRoles: ["shoes"],
  prohibitedRoles: [],
  confirmedVenueProhibitions: [],
  confirmedActivityRequirements: [],
  evidenceRefs: [],
});

test("Dressing Posture resolves the lived day before any garment retrieval", () => {
  const posture = resolveDressingPosture({
    artifactId: "posture-a",
    artifactRevision: "1",
    generatedAt: now,
    brief: brief(),
    eventPolicy: policy(),
    weather: {
      temperatureF: 92,
      feelsLikeF: 98,
      humidityPercent: 74,
      precipitationProbability: 10,
      windMph: 5,
      daylight: true,
      evidenceRefs: [evidence("weather", "weather")],
    },
  });
  assert.equal(posture.dayCharacter, "professional");
  assert.equal(posture.formalityRange.preferredFloor, "polished-casual");
  assert.equal(posture.formalityRange.ceiling, "professional");
  assert.equal(posture.thermalPosture.severity, "hot");
  assert.equal(posture.thermalPosture.humidity, "high");
  assert.equal(posture.effortBudget, "low");
  assert.ok(posture.materialDirection.some((item) => item.operator === "avoid" && item.value === "denim-heavy"));
});

test("pipeline contract rejects garment retrieval before Dressing Posture", () => {
  assert.throws(
    () => assertPipelineOrder(["customer-dressing-brief", "direction-led-retrieval", "dressing-posture"]),
    /Invalid V2 pipeline order|cannot precede/,
  );
  assert.doesNotThrow(() => assertPipelineOrder([
    "customer-dressing-brief",
    "event-policy",
    "dressing-posture",
    "personal-outfit-directions",
    "direction-led-retrieval",
  ]));
});

test("posture artifacts retain governed provenance rather than hidden inference", () => {
  const posture = resolveDressingPosture({
    artifactId: "posture-a",
    artifactRevision: "1",
    generatedAt: now,
    brief: brief(),
    eventPolicy: policy(),
    weather: {
      temperatureF: null,
      feelsLikeF: null,
      humidityPercent: null,
      precipitationProbability: null,
      windMph: null,
      daylight: null,
      evidenceRefs: [],
    },
  });
  assert.equal(posture.briefRef.referenceVersion, ARTIFACT_REFERENCE_VERSION);
  assert.equal(posture.briefRef.artifactId, "brief-a");
  assert.ok(posture.evidenceRefs.some((item) => item.evidenceId === "statement"));
});
