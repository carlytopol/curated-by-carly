import assert from "node:assert/strict";
import test from "node:test";
import {
  ARTIFACT_REFERENCE_VERSION,
  CUSTOMER_DRESSING_BRIEF_VERSION,
  EVIDENCE_REFERENCE_VERSION,
  RECOMMENDATION_V2_TAXONOMY_VERSION,
  buildPersonalOutfitDirections,
  projectPersonalOutfitMemory,
  resolveDressingPosture,
  retrieveGarmentsForDirections,
  type ArtifactRef,
  type CustomerDressingBrief,
  type EvidenceRef,
  type NarrowEventPolicyResult,
  type StyleProfileProjection,
  type WardrobeGarment,
} from "@/lib/recommendations/v2";

const now = "2026-07-29T16:00:00.000Z";

function evidence(ownerUserId: string, id: string): EvidenceRef {
  return {
    schemaVersion: EVIDENCE_REFERENCE_VERSION,
    evidenceId: `${ownerUserId}:${id}`,
    ownerUserId,
    authority: "customer-current",
    sourceType: "customer-statement",
    sourceVersion: "fixture.v1",
    confidence: "high",
    observedAt: now,
    effectiveFrom: null,
    effectiveUntil: null,
  };
}

function artifacts(ownerUserId: string) {
  const requestId = `${ownerUserId}:request`;
  const customerEvidence = evidence(ownerUserId, "brief");
  const brief: CustomerDressingBrief = {
    schemaVersion: CUSTOMER_DRESSING_BRIEF_VERSION,
    taxonomyVersion: RECOMMENDATION_V2_TAXONOMY_VERSION,
    artifactId: `${ownerUserId}:brief`,
    artifactRevision: "1",
    requestId,
    ownerUserId,
    generatedAt: now,
    evidenceRefs: [customerEvidence],
    originalLanguage: [],
    normalizedIntent: {
      occasion: "lunch",
      desiredTone: ["polished"],
      practicalPurpose: [],
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
    coverageRequirements: [],
    footwearRequirements: [],
    carryingNeeds: [],
    movementRequirements: [],
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
    generatedAt: now,
    requiredRoles: ["shoes"],
    prohibitedRoles: [],
    confirmedVenueProhibitions: [],
    confirmedActivityRequirements: [],
    evidenceRefs: [],
  };
  const posture = resolveDressingPosture({
    artifactId: `${ownerUserId}:posture`,
    artifactRevision: "1",
    generatedAt: now,
    brief,
    eventPolicy,
    weather: {
      temperatureF: 76,
      feelsLikeF: 77,
      humidityPercent: 50,
      precipitationProbability: 5,
      windMph: 3,
      daylight: true,
      evidenceRefs: [],
    },
  });
  return { brief, eventPolicy, posture, requestId };
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
    generatedAt: now,
  };
}

function wardrobe(ownerUserId: string): WardrobeGarment[] {
  const base: Omit<WardrobeGarment, "itemId" | "name" | "role" | "foundationKind" | "walkability"> = {
    ownerUserId,
    available: true,
    suppressed: false,
    formality: "professional" as const,
    materials: ["cotton"],
    silhouettes: ["balanced"],
    palettes: ["neutral"],
    genres: ["everyday"],
    securePockets: null,
    descriptors: [],
    evidenceRefs: [],
  };
  return [
    { ...base, itemId: "dress", name: "Dress", role: "dress", foundationKind: "dress", walkability: null },
    { ...base, itemId: "top", name: "Top", role: "top", foundationKind: "top-bottom", walkability: null },
    { ...base, itemId: "bottom", name: "Bottom", role: "bottom", foundationKind: "top-bottom", walkability: null, securePockets: true },
    { ...base, itemId: "shoe", name: "Shoe", role: "shoes", foundationKind: null, walkability: "high" as const },
  ];
}

test("identical wardrobes remain customer-isolated and different explicit profiles produce different directions", () => {
  const a = artifacts("customer-a");
  const b = artifacts("customer-b");
  const makeStyle = (ownerUserId: string, foundation: "dress" | "top-bottom"): StyleProfileProjection => ({
    ownerUserId,
    revision: "1",
    preferredFoundations: [foundation],
    silhouettes: ["balanced"],
    palettes: ["neutral"],
    materials: ["cotton"],
    avoidedItemIds: [],
    preferredItemIds: [],
    evidenceRefs: [],
  });
  const run = (ownerUserId: string, values: ReturnType<typeof artifacts>, style: StyleProfileProjection) => {
    const memory = projectPersonalOutfitMemory({
      artifactId: `${ownerUserId}:memory`,
      artifactRevision: "1",
      requestId: values.requestId,
      ownerUserId,
      generatedAt: now,
      observations: [],
    });
    const directions = buildPersonalOutfitDirections({
      posture: values.posture,
      brief: values.brief,
      eventPolicy: values.eventPolicy,
      memory,
      style,
      correctionStateRef: ref(ownerUserId, values.requestId, "correction-state.v2.3.0", `${ownerUserId}:correction`),
      suppressionStateRef: ref(ownerUserId, values.requestId, "suppression-state.v2.3.0", `${ownerUserId}:suppression`),
      maximumDirections: 1,
    });
    return { memory, directions };
  };
  const runA = run("customer-a", a, makeStyle("customer-a", "dress"));
  const runB = run("customer-b", b, makeStyle("customer-b", "top-bottom"));
  assert.equal(runA.directions[0]?.foundationConcept, "dress");
  assert.equal(runB.directions[0]?.foundationConcept, "top-bottom");

  assert.throws(() => retrieveGarmentsForDirections({
    directions: runA.directions,
    posture: a.posture,
    brief: a.brief,
    style: makeStyle("customer-a", "dress"),
    memory: runA.memory,
    wardrobe: wardrobe("customer-b"),
  }), /owner mismatch/i);
});

test("low-confidence or inferred style avoidances rank down but cannot become hard exclusions", () => {
  const values = artifacts("customer-a");
  const style: StyleProfileProjection = {
    ownerUserId: "customer-a",
    revision: "1",
    preferredFoundations: ["top-bottom"],
    silhouettes: ["balanced"],
    palettes: ["neutral"],
    materials: ["cotton"],
    avoidedItemIds: ["top"],
    preferredItemIds: [],
    evidenceRefs: [],
  };
  const memory = projectPersonalOutfitMemory({
    artifactId: "customer-a:memory",
    artifactRevision: "1",
    requestId: values.requestId,
    ownerUserId: "customer-a",
    generatedAt: now,
    observations: [],
  });
  const directions = buildPersonalOutfitDirections({
    posture: values.posture,
    brief: values.brief,
    eventPolicy: values.eventPolicy,
    memory,
    style,
    correctionStateRef: ref("customer-a", values.requestId, "correction-state.v2.3.0", "correction"),
    suppressionStateRef: ref("customer-a", values.requestId, "suppression-state.v2.3.0", "suppression"),
    maximumDirections: 1,
  });
  const [retrieval] = retrieveGarmentsForDirections({
    directions,
    posture: values.posture,
    brief: values.brief,
    style,
    memory,
    wardrobe: wardrobe("customer-a"),
  });
  assert.ok(retrieval?.foundationCandidates.some((candidate) => candidate.some((item) => item.itemId === "top")));
  assert.equal(retrieval?.rejectionReasons.some((item) => item.itemId === "top"), false);
});
