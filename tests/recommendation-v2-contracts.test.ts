import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  ARTIFACT_REFERENCE_VERSION, CANDIDATE_LOOK_VERSION, CHECK_DEFINITIONS,
  CORRECTION_STATE_VERSION, CUSTOMER_DRESSING_BRIEF_VERSION, DRESSING_POSTURE_VERSION,
  EVIDENCE_REFERENCE_VERSION, EVENT_POLICY_RESULT_VERSION, MEMORY_SNAPSHOT_VERSION,
  PERSONAL_OUTFIT_DIRECTION_VERSION, RECOMMENDATION_ARCHITECTURE_V2,
  RECOMMENDATION_CONTINUITY_MANIFEST, RECOMMENDATION_CONTINUITY_VERIFICATION,
  RECOMMENDATION_V2_TAXONOMY_VERSION, STYLIST_ADJUDICATION_VERSION,
  SUPPRESSION_STATE_VERSION, buildV2CacheNamespace, validateCustomerDressingBrief,
  validateDressingPosture, validateEvidenceRef, validatePersonalOutfitDirection,
  validateStylistAdjudicationDecision, type ArtifactRef, type CustomerDressingBrief,
  type DressingPosture, type EvidenceAuthority, type EvidenceRef,
  type PersonalOutfitDirection, type RecommendDecision, type StylistAdjudicationDecision,
} from "@/lib/recommendations/v2";

let serial = 0;
const evidence = (
  authority: EvidenceAuthority = "customer-current",
  ownerUserId: string | null = authority.startsWith("customer") ? "user-a" : null,
): EvidenceRef => ({
  schemaVersion: EVIDENCE_REFERENCE_VERSION, evidenceId: `e-${++serial}`, ownerUserId,
  authority,
  sourceType: authority === "customer-current" ? "customer-statement"
    : authority === "customer-durable" ? "profile"
      : authority === "founder-evaluation" ? "founder-evaluation"
        : authority === "product-evaluation" ? "product-evaluation"
          : authority === "automated-test" ? "automated-test" : "system",
  sourceVersion: "fixture.v1", confidence: "high", observedAt: "2026-07-29T12:00:00.000Z",
  effectiveFrom: null, effectiveUntil: null,
});
const artifact = <S extends string>(schemaVersion: S, artifactId: string): ArtifactRef<S> => ({
  referenceVersion: ARTIFACT_REFERENCE_VERSION, artifactId, ownerUserId: "user-a",
  requestId: "request-1", schemaVersion, artifactRevision: "rev-1",
  generatedAt: "2026-07-29T12:00:00.000Z",
});
const base = <S extends string>(schemaVersion: S, artifactId: string) => ({
  schemaVersion, taxonomyVersion: RECOMMENDATION_V2_TAXONOMY_VERSION,
  artifactId, artifactRevision: "rev-1", ownerUserId: "user-a", requestId: "request-1",
  generatedAt: "2026-07-29T12:00:00.000Z", evidenceRefs: [evidence()],
});
const brief = (): CustomerDressingBrief => ({
  ...base(CUSTOMER_DRESSING_BRIEF_VERSION, "brief-1"),
  originalLanguage: [{ text: "Polished, comfortable, conservative, with flats.", evidenceRef: evidence() }],
  normalizedIntent: {
    occasion: "school-community", desiredTone: ["polished", "restrained"],
    practicalPurpose: ["walking"], explicitInstructions: ["prohibit-item"],
    unresolvedLanguage: [], confidence: "high", evidenceRefs: [evidence()],
  },
  desiredImpression: [{ quality: "intentional", strength: "strong", evidenceRefs: [evidence()] }],
  requiredQualities: [{ quality: "comfortable", evidenceRefs: [evidence()] }],
  avoidedQualities: [{ quality: "weather-appropriate", evidenceRefs: [evidence()] }],
  comfortRequirements: [{ kind: "movement", intensity: "required", evidenceRefs: [evidence()] }],
  accessibilityRequirements: [],
  coverageRequirements: [{ kind: "shoulder-coverage", value: "required", evidenceRefs: [evidence()] }],
  footwearRequirements: [{ kind: "heel-height", operator: "at-most", value: "flat", evidenceRefs: [evidence()] }],
  carryingNeeds: [{ kind: "bag", value: "optional", evidenceRefs: [evidence()] }],
  movementRequirements: [{ kind: "walking", value: "high", evidenceRefs: [evidence()] }],
  explicitItemInstructions: [{ itemId: "tee-1", normalizedAction: "prohibit-item", scope: "until-restored", displayLanguage: "Take this shirt out of rotation.", evidenceRefs: [evidence()] }],
  activeCorrections: [{ correctionId: "c-1", ownerUserId: "user-a", scope: "similar-contexts", revision: "1", evidenceRef: evidence() }],
  activeSuppressions: [{ suppressionId: "s-1", ownerUserId: "user-a", itemId: "tee-1", scope: "until-restored", revision: "1", active: true, evidenceRef: evidence() }],
  consequentialUnknowns: [], manageableAssumptions: [], confidence: "high",
});
const posture = (): DressingPosture => ({
  ...base(DRESSING_POSTURE_VERSION, "posture-1"),
  briefRef: artifact(CUSTOMER_DRESSING_BRIEF_VERSION, "brief-1"),
  eventPolicyRef: artifact(EVENT_POLICY_RESULT_VERSION, "policy-1"),
  dayCharacter: "professional", socialStakes: "professionally-visible",
  formalityRange: { floor: "casual", preferredFloor: "polished-casual", preferredCeiling: "professional", ceiling: "professional" },
  ceremonyAllowance: "none", effortBudget: "moderate",
  movementPosture: brief().movementRequirements,
  thermalPosture: { severity: "warm", humidity: "high", evidenceRefs: [evidence()] },
  weatherProtection: { rain: "possible", wind: "low", sun: "moderate", evidenceRefs: [evidence()] },
  carryingPosture: { bag: "optional", secureStorage: "not-required", evidenceRefs: [evidence()] },
  accessibilityRequirements: [], coverageRequirements: brief().coverageRequirements,
  footwearRequirements: brief().footwearRequirements, preferredFoundationDirections: ["top-bottom"],
  overdoneGenres: [{ kind: "garment-genre", operator: "prohibit", value: "cocktail", evidenceRefs: [evidence()] }],
  materialDirection: [{ kind: "material", operator: "avoid", value: "wool-heavy", evidenceRefs: [evidence()] }],
  requiredSupportRoles: ["shoes"], optionalSupportRoles: ["bag", "fragrance"],
  adjustmentTolerance: "low", simplicity: "strong", criticalUnknowns: [],
  manageableAssumptions: [], confidence: "high", reasonCodes: [],
});
const direction = (): PersonalOutfitDirection => ({
  ...base(PERSONAL_OUTFIT_DIRECTION_VERSION, "direction-1"),
  briefRef: artifact(CUSTOMER_DRESSING_BRIEF_VERSION, "brief-1"),
  postureRef: artifact(DRESSING_POSTURE_VERSION, "posture-1"),
  eventPolicyRef: artifact(EVENT_POLICY_RESULT_VERSION, "policy-1"),
  correctionStateRef: artifact(CORRECTION_STATE_VERSION, "corrections-1"),
  suppressionStateRef: artifact(SUPPRESSION_STATE_VERSION, "suppressions-1"),
  memorySnapshotRef: artifact(MEMORY_SNAPSHOT_VERSION, "memory-1"),
  styleProfileRevision: "style-4", intent: "characteristic", foundationConcept: "top-bottom",
  compliancePlan: { coverage: brief().coverageRequirements, footwear: brief().footwearRequirements, carrying: brief().carryingNeeds, movement: brief().movementRequirements, materials: posture().materialDirection, genres: posture().overdoneGenres },
  requiredRoles: ["top", "bottom", "shoes"], prohibitedRoles: [], maxSupportPieces: 2,
  silhouetteIntent: ["tailored"], proportionIntent: ["balanced"], paletteIntent: ["neutral"],
  materialIntent: ["cotton"], formalityBand: { minimum: "polished-casual", maximum: "professional" },
  ceremonyCeiling: "none", effortBurden: "moderate", contextualReservations: [],
  personalPlausibilityReasons: ["confirmed-worn-pattern"], activeCorrections: brief().activeCorrections,
  activeSuppressions: brief().activeSuppressions, uncertainty: [], confidence: "high",
});
const look = (id: string) => artifact(CANDIDATE_LOOK_VERSION, id);
const check = (id: keyof typeof CHECK_DEFINITIONS, candidates = [look("look-1")]) => ({
  check: id, status: "pass" as const, reasonCodes: ["approved" as const],
  candidateRefs: candidates, evidenceRefs: [evidence()],
  explanationFacts: [{ factId: `f-${id}`, displayText: "Supported fact.", evidenceRefs: [evidence()] }],
});
const recommend = (): RecommendDecision => {
  const selected = look("look-1");
  return {
    ...base(STYLIST_ADJUDICATION_VERSION, "decision-1"), adjudicatorVersion: "adjudicator.v2",
    briefRef: artifact(CUSTOMER_DRESSING_BRIEF_VERSION, "brief-1"),
    eventPolicyRef: artifact(EVENT_POLICY_RESULT_VERSION, "policy-1"),
    postureRef: artifact(DRESSING_POSTURE_VERSION, "posture-1"),
    directionRefs: [artifact(PERSONAL_OUTFIT_DIRECTION_VERSION, "direction-1")],
    candidateLookRefs: [selected],
    correctionStateRef: artifact(CORRECTION_STATE_VERSION, "corrections-1"),
    suppressionStateRef: artifact(SUPPRESSION_STATE_VERSION, "suppressions-1"),
    memorySnapshotRef: artifact(MEMORY_SNAPSHOT_VERSION, "memory-1"),
    outcome: "recommend", selectedLookRef: selected, challengerLookRef: null,
    deterministicChecks: ["ownership-availability", "event-policy", "brief-compliance", "suppression", "outfit-completeness"].map((id) => check(id as keyof typeof CHECK_DEFINITIONS)),
    comparativeChecks: ["lived-day-reality", "personal-plausibility", "effort-proportionality", "whole-look-coherence", "restraint", "uncertainty", "editorial-judgment"].map((id) => check(id as keyof typeof CHECK_DEFINITIONS)),
    decisiveReasonCodes: ["approved"], confidence: "high",
    explanationFacts: [{ factId: "final-1", displayText: "The complete look supports the lived day.", evidenceRefs: [evidence()] }],
  };
};

test("all revised Phase 0 contracts validate with exact upstream artifact references", () => {
  assert.equal(validateCustomerDressingBrief(brief()).success, true);
  assert.equal(validateDressingPosture(posture()).success, true);
  assert.equal(validatePersonalOutfitDirection(direction()).success, true);
  assert.equal(validateStylistAdjudicationDecision(recommend()).success, true);
  assert.equal(posture().briefRef.artifactId, "brief-1");
  assert.equal(recommend().candidateLookRefs[0].artifactRevision, "rev-1");
});
test("unsupported governed registry identifiers fail safely", () => {
  const value = brief(); value.normalizedIntent.occasion = "invented" as never;
  assert.equal(validateCustomerDressingBrief(value).success, false);
  const arbitraryQuality = brief(); arbitraryQuality.requiredQualities[0].quality = "invented" as never;
  assert.equal(validateCustomerDressingBrief(arbitraryQuality).success, false);
  const arbitraryMaterial = direction(); arbitraryMaterial.materialIntent[0] = "invented" as never;
  assert.equal(validatePersonalOutfitDirection(arbitraryMaterial).success, false);
});
test("unresolved customer language is display-only and cannot become a deterministic veto", () => {
  const value = brief();
  value.normalizedIntent.unresolvedLanguage = [{ kind: "unresolved-customer-language", text: "not too much", status: "display-and-audit-only", mayDriveDecision: false, evidenceRefs: [evidence()] }];
  assert.equal(validateCustomerDressingBrief(value).success, true);
  value.normalizedIntent.unresolvedLanguage[0].mayDriveDecision = true as false;
  assert.equal(validateCustomerDressingBrief(value).success, false);
});
test("complete authority/source matrix rejects institutional evidence as customer evidence", () => {
  const founder = evidence("founder-evaluation"); founder.sourceType = "customer-statement";
  assert.match(validateEvidenceRef(founder, "user-a").join(" "), /authority\/source/);
  const inferred = evidence("customer-current"); inferred.sourceType = "wardrobe-item";
  assert.match(validateEvidenceRef(inferred, "user-a").join(" "), /authority\/source/);
});
test("Product findings cannot become customer corrections or suppressions", () => {
  const value = brief(); value.activeCorrections[0].evidenceRef = evidence("product-evaluation");
  assert.equal(validateCustomerDressingBrief(value).success, false);
});
test("recommendation with no checks or any missing required check is rejected", () => {
  const empty = recommend(); empty.deterministicChecks = []; empty.comparativeChecks = [];
  assert.equal(validateStylistAdjudicationDecision(empty).success, false);
  const missing = recommend(); missing.deterministicChecks.pop();
  assert.equal(validateStylistAdjudicationDecision(missing).success, false);
});
test("duplicate and misclassified checks are rejected", () => {
  const duplicate = recommend(); duplicate.deterministicChecks.push(duplicate.deterministicChecks[0]);
  assert.equal(validateStylistAdjudicationDecision(duplicate).success, false);
  const misplaced = recommend(); misplaced.deterministicChecks[0] = check("editorial-judgment");
  assert.equal(validateStylistAdjudicationDecision(misplaced).success, false);
});
test("suppression failure is centrally disqualifying and viability unknown prevents recommendation", () => {
  const suppressed = recommend(); suppressed.deterministicChecks.find((entry) => entry.check === "suppression")!.status = "fail";
  suppressed.deterministicChecks.find((entry) => entry.check === "suppression")!.reasonCodes = ["suppressed"];
  assert.equal(CHECK_DEFINITIONS.suppression.failureDisqualifies, true);
  assert.equal(validateStylistAdjudicationDecision(suppressed).success, false);
  const forged = recommend();
  Object.assign(forged.deterministicChecks.find((entry) => entry.check === "suppression")!, { disqualifying: false });
  assert.equal(validateStylistAdjudicationDecision(forged).success, false);
  const unknown = recommend(); unknown.comparativeChecks.find((entry) => entry.check === "uncertainty")!.status = "unknown";
  unknown.comparativeChecks.find((entry) => entry.check === "uncertainty")!.reasonCodes = ["consequential-unknown"];
  assert.equal(validateStylistAdjudicationDecision(unknown).success, false);
});
test("unsupported adjudication check identifiers fail safely", () => {
  const value = recommend();
  value.deterministicChecks[0].check = "invented" as never;
  assert.equal(validateStylistAdjudicationDecision(value).success, false);
});
test("every check references the selected look and challenger comparison references both looks", () => {
  const invalid = recommend(); invalid.deterministicChecks[0].candidateRefs = [look("other")];
  assert.equal(validateStylistAdjudicationDecision(invalid).success, false);
  const value = recommend(); const challenger = look("look-2");
  value.challengerLookRef = challenger; value.candidateLookRefs.push(challenger);
  value.comparativeChecks.push(check("simpler-challenger", [value.selectedLookRef]));
  assert.equal(validateStylistAdjudicationDecision(value).success, false);
  value.comparativeChecks.at(-1)!.candidateRefs.push(challenger);
  assert.equal(validateStylistAdjudicationDecision(value).success, true);
});
test("explanation facts require supporting evidence", () => {
  const value = recommend(); value.explanationFacts[0].evidenceRefs = [];
  assert.equal(validateStylistAdjudicationDecision(value).success, false);
});
test("outcome-specific irrelevant fields are rejected at runtime", () => {
  const value = recommend() as StylistAdjudicationDecision & { revisionOperations: [] };
  value.revisionOperations = [];
  assert.equal(validateStylistAdjudicationDecision(value).success, false);
});
test("cache identity varies with all revisions and customers", () => {
  const revisions = { agendaContextRevision: "1", weatherRevision: "1", styleProfileRevision: "1", wardrobeEvidenceRevision: "1", correctionRevision: "1", suppressionRevision: "1", personalOutfitMemoryRevision: "1", engineRevision: "1", featureFlagRevision: "1" };
  const input = { architectureVersion: RECOMMENDATION_ARCHITECTURE_V2, taxonomyVersion: RECOMMENDATION_V2_TAXONOMY_VERSION, contractVersion: CUSTOMER_DRESSING_BRIEF_VERSION, requestId: "r", ownerUserId: "a", revisions } as const;
  const initial = buildV2CacheNamespace(input);
  for (const key of Object.keys(revisions) as Array<keyof typeof revisions>) assert.notEqual(initial, buildV2CacheNamespace({ ...input, revisions: { ...revisions, [key]: "2" } }));
  assert.notEqual(initial, buildV2CacheNamespace({ ...input, ownerUserId: "b" }));
});
test("V2 remains dormant by default and is exposed only through the server router", () => {
  const route = readFileSync(join(process.cwd(), "app/api/daily-events/[id]/recommendations/route.ts"), "utf8");
  assert.match(route, /resolveServerRecommendationEngine\(userId\)/);
  assert.match(route, /generateMainAppV2Recommendation/);
  assert.match(readFileSync(join(process.cwd(), "lib/recommendations/v2/account-routing.server.ts"), "utf8"), /import "server-only"/);
  assert.equal(RECOMMENDATION_CONTINUITY_MANIFEST.v2Evaluation.enabled, false);
  assert.equal(RECOMMENDATION_CONTINUITY_VERIFICATION.phaseOnePersistence.status, "implemented-isolated");
});

// Compile-time proof that governed discriminants reject incompatible values.
// @ts-expect-error heel-height cannot use a walking value
const invalidFootwear = { kind: "heel-height", operator: "at-most", value: "sustained", evidenceRefs: [] } satisfies import("@/lib/recommendations/v2").FootwearPredicate;
// @ts-expect-error arbitrary silhouette text is not governed
const invalidSilhouette: import("@/lib/recommendations/v2").SilhouetteId = "whatever";
void invalidFootwear; void invalidSilhouette;
