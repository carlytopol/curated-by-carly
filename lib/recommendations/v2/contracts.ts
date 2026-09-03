import {
  ARTIFACT_REFERENCE_VERSION, CHECK_DEFINITIONS, EVIDENCE_REFERENCE_VERSION,
  GOVERNED_SEMANTICS, RECOMMENDATION_V2_TAXONOMY_VERSION,
  isGovernedSemantic, isValidFormalityRange, validateArtifactRef, validateEvidenceRef,
  type AccessibilityKind, type AdjudicationCheckId, type ArtifactRef,
  type CarryingPredicate, type CeremonyAllowance, type Confidence,
  type ConsequentialUnknown, type ContextualReservation, type CoveragePredicate,
  type DayCharacter, type EvidenceAuthority, type EvidenceRef, type EffortLevel,
  type FootwearPredicate, type FormalityLevel, type FormalityRange,
  type GarmentGenrePredicate, type GarmentRole, type GovernedPreference,
  type GovernedProhibition, type GovernedRequirement, type ManageableAssumption,
  type MaterialId, type MaterialPredicate, type MovementPredicate,
  type NormalizedIntent, type OriginalLanguage, type OutfitFoundationKind,
  type PaletteId, type PersonalPlausibilityReasonId, type ProportionId,
  type ReasonCode, type SilhouetteId, type SocialStakes, type SupportRole,
} from "./taxonomy";

export const CUSTOMER_DRESSING_BRIEF_VERSION = "customer-dressing-brief.v2.3.0" as const;
export const EVENT_POLICY_RESULT_VERSION = "event-policy-result.v2.3.0" as const;
export const DRESSING_POSTURE_VERSION = "dressing-posture.v2.3.0" as const;
export const PERSONAL_OUTFIT_DIRECTION_VERSION = "personal-outfit-direction.v2.3.0" as const;
export const CANDIDATE_LOOK_VERSION = "candidate-look.v2.3.0" as const;
export const CORRECTION_STATE_VERSION = "correction-state.v2.3.0" as const;
export const SUPPRESSION_STATE_VERSION = "suppression-state.v2.3.0" as const;
export const MEMORY_SNAPSHOT_VERSION = "memory-snapshot.v2.3.0" as const;
export const STYLIST_ADJUDICATION_VERSION = "stylist-adjudication.v2.3.0" as const;

type ArtifactBase<V extends string> = {
  schemaVersion: V;
  taxonomyVersion: typeof RECOMMENDATION_V2_TAXONOMY_VERSION;
  artifactId: string;
  artifactRevision: string;
  requestId: string;
  ownerUserId: string;
  generatedAt: string;
  evidenceRefs: EvidenceRef[];
};

export type ComfortRequirement = {
  kind: (typeof GOVERNED_SEMANTICS.comfort)[number];
  intensity: "preferred" | "required";
  evidenceRefs: EvidenceRef[];
};
export type AccessibilityRequirement = {
  kind: AccessibilityKind;
  intensity: "preferred" | "required";
  evidenceRefs: EvidenceRef[];
};
export type ExplicitItemInstruction = {
  itemId: string | null;
  normalizedAction: "require-item" | "prefer-item" | "avoid-item" | "prohibit-item";
  scope: "today-only" | "similar-contexts" | "until-restored";
  displayLanguage: string;
  evidenceRefs: EvidenceRef[];
};
export type ScopedCorrectionReference = {
  correctionId: string; ownerUserId: string;
  scope: "today-only" | "similar-contexts" | "until-restored";
  revision: string; evidenceRef: EvidenceRef;
};
export type SuppressionReference = {
  suppressionId: string; ownerUserId: string; itemId: string;
  scope: "today-only" | "similar-contexts" | "until-restored";
  revision: string; active: boolean; evidenceRef: EvidenceRef;
};

export type CustomerDressingBrief = ArtifactBase<typeof CUSTOMER_DRESSING_BRIEF_VERSION> & {
  originalLanguage: OriginalLanguage[];
  normalizedIntent: NormalizedIntent;
  desiredImpression: GovernedPreference[];
  requiredQualities: GovernedRequirement[];
  avoidedQualities: GovernedProhibition[];
  comfortRequirements: ComfortRequirement[];
  accessibilityRequirements: AccessibilityRequirement[];
  coverageRequirements: CoveragePredicate[];
  footwearRequirements: FootwearPredicate[];
  carryingNeeds: CarryingPredicate[];
  movementRequirements: MovementPredicate[];
  explicitItemInstructions: ExplicitItemInstruction[];
  activeCorrections: ScopedCorrectionReference[];
  activeSuppressions: SuppressionReference[];
  consequentialUnknowns: ConsequentialUnknown[];
  manageableAssumptions: ManageableAssumption[];
  confidence: Confidence;
};

export type ThermalPosture = {
  severity: "cold" | "cool" | "temperate" | "warm" | "hot" | "extreme-heat";
  humidity: "unknown" | "low" | "moderate" | "high";
  evidenceRefs: EvidenceRef[];
};
export type WeatherProtection = {
  rain: "none" | "possible" | "likely"; wind: "low" | "moderate" | "high";
  sun: "low" | "moderate" | "high"; evidenceRefs: EvidenceRef[];
};
export type CarryingPosture = {
  bag: "required" | "optional" | "prohibited";
  secureStorage: "not-required" | "pocket-required" | "bag-or-pocket";
  evidenceRefs: EvidenceRef[];
};

export type DressingPosture = ArtifactBase<typeof DRESSING_POSTURE_VERSION> & {
  briefRef: ArtifactRef<typeof CUSTOMER_DRESSING_BRIEF_VERSION>;
  eventPolicyRef: ArtifactRef<typeof EVENT_POLICY_RESULT_VERSION>;
  dayCharacter: DayCharacter;
  socialStakes: SocialStakes;
  formalityRange: FormalityRange;
  ceremonyAllowance: CeremonyAllowance;
  effortBudget: EffortLevel;
  movementPosture: MovementPredicate[];
  thermalPosture: ThermalPosture;
  weatherProtection: WeatherProtection;
  carryingPosture: CarryingPosture;
  accessibilityRequirements: AccessibilityRequirement[];
  coverageRequirements: CoveragePredicate[];
  footwearRequirements: FootwearPredicate[];
  preferredFoundationDirections: OutfitFoundationKind[];
  overdoneGenres: GarmentGenrePredicate[];
  materialDirection: MaterialPredicate[];
  requiredSupportRoles: SupportRole[];
  optionalSupportRoles: SupportRole[];
  adjustmentTolerance: EffortLevel;
  simplicity: "strong" | "moderate" | "neutral";
  criticalUnknowns: ConsequentialUnknown[];
  manageableAssumptions: ManageableAssumption[];
  confidence: Confidence;
  reasonCodes: ReasonCode[];
};

export type DirectionCompliancePlan = {
  coverage: CoveragePredicate[]; footwear: FootwearPredicate[];
  carrying: CarryingPredicate[]; movement: MovementPredicate[];
  materials: MaterialPredicate[]; genres: GarmentGenrePredicate[];
};
export type PersonalOutfitDirection = ArtifactBase<typeof PERSONAL_OUTFIT_DIRECTION_VERSION> & {
  briefRef: ArtifactRef<typeof CUSTOMER_DRESSING_BRIEF_VERSION>;
  postureRef: ArtifactRef<typeof DRESSING_POSTURE_VERSION>;
  eventPolicyRef: ArtifactRef<typeof EVENT_POLICY_RESULT_VERSION>;
  correctionStateRef: ArtifactRef<typeof CORRECTION_STATE_VERSION>;
  suppressionStateRef: ArtifactRef<typeof SUPPRESSION_STATE_VERSION>;
  memorySnapshotRef: ArtifactRef<typeof MEMORY_SNAPSHOT_VERSION>;
  styleProfileRevision: string;
  intent: "practical" | "characteristic" | "expressive";
  foundationConcept: OutfitFoundationKind;
  compliancePlan: DirectionCompliancePlan;
  requiredRoles: GarmentRole[];
  prohibitedRoles: GarmentRole[];
  maxSupportPieces: number;
  silhouetteIntent: SilhouetteId[];
  proportionIntent: ProportionId[];
  paletteIntent: PaletteId[];
  materialIntent: MaterialId[];
  formalityBand: { minimum: FormalityLevel; maximum: FormalityLevel };
  ceremonyCeiling: CeremonyAllowance;
  effortBurden: EffortLevel;
  contextualReservations: ContextualReservation[];
  personalPlausibilityReasons: PersonalPlausibilityReasonId[];
  activeCorrections: ScopedCorrectionReference[];
  activeSuppressions: SuppressionReference[];
  uncertainty: ConsequentialUnknown[];
  confidence: Confidence;
};

export type ExplanationFact = {
  factId: string;
  displayText: string;
  evidenceRefs: EvidenceRef[];
};
export type CheckResult = {
  check: AdjudicationCheckId;
  status: "pass" | "fail" | "unknown";
  reasonCodes: ReasonCode[];
  candidateRefs: ArtifactRef<typeof CANDIDATE_LOOK_VERSION>[];
  evidenceRefs: EvidenceRef[];
  explanationFacts: ExplanationFact[];
};
type AdjudicationReferences = {
  briefRef: ArtifactRef<typeof CUSTOMER_DRESSING_BRIEF_VERSION>;
  eventPolicyRef: ArtifactRef<typeof EVENT_POLICY_RESULT_VERSION>;
  postureRef: ArtifactRef<typeof DRESSING_POSTURE_VERSION>;
  directionRefs: ArtifactRef<typeof PERSONAL_OUTFIT_DIRECTION_VERSION>[];
  candidateLookRefs: ArtifactRef<typeof CANDIDATE_LOOK_VERSION>[];
  correctionStateRef: ArtifactRef<typeof CORRECTION_STATE_VERSION>;
  suppressionStateRef: ArtifactRef<typeof SUPPRESSION_STATE_VERSION>;
  memorySnapshotRef: ArtifactRef<typeof MEMORY_SNAPSHOT_VERSION>;
};
type AdjudicationBase = ArtifactBase<typeof STYLIST_ADJUDICATION_VERSION> & AdjudicationReferences & {
  adjudicatorVersion: string;
  deterministicChecks: CheckResult[];
  comparativeChecks: CheckResult[];
  decisiveReasonCodes: ReasonCode[];
  confidence: Confidence;
  explanationFacts: ExplanationFact[];
};
export type GovernedRevisionOperation =
  | { operation: "replace-foundation"; directionRef: ArtifactRef<typeof PERSONAL_OUTFIT_DIRECTION_VERSION> }
  | { operation: "remove-role"; role: SupportRole }
  | { operation: "replace-role"; role: GarmentRole; governingReason: ReasonCode }
  | { operation: "simplify"; maximumSupportPieces: number };

export type RecommendDecision = AdjudicationBase & {
  outcome: "recommend";
  selectedLookRef: ArtifactRef<typeof CANDIDATE_LOOK_VERSION>;
  challengerLookRef: ArtifactRef<typeof CANDIDATE_LOOK_VERSION> | null;
};
export type ReviseDecision = AdjudicationBase & {
  outcome: "revise-composition";
  candidateLookRef: ArtifactRef<typeof CANDIDATE_LOOK_VERSION>;
  revisionOperations: GovernedRevisionOperation[];
  explanationText: string | null;
};
export type AskDecision = AdjudicationBase & {
  outcome: "ask-one-question";
  affectedDecision: "viability" | "foundation" | "footwear" | "coverage" | "carrying";
  question: ConsequentialUnknown;
};
export type AbstainDecision = AdjudicationBase & {
  outcome: "abstain";
  abstentionReason: ReasonCode;
  nextAction: "review-wardrobe" | "resolve-unknown" | "restore-availability" | "adjust-brief" | null;
};
export type StylistAdjudicationDecision = RecommendDecision | ReviseDecision | AskDecision | AbstainDecision;

export type ContractValidationResult<T> = { success: true; value: T } | { success: false; errors: string[] };
const result = <T>(value: T, errors: string[]): ContractValidationResult<T> =>
  errors.length ? { success: false, errors: [...new Set(errors)] } : { success: true, value };

function validateBase(value: ArtifactBase<string>, expectedSchema: string) {
  const errors: string[] = [];
  if (value.schemaVersion !== expectedSchema) errors.push("unsupported schemaVersion");
  if (value.taxonomyVersion !== RECOMMENDATION_V2_TAXONOMY_VERSION) errors.push("unsupported taxonomyVersion");
  if (![value.artifactId, value.artifactRevision, value.requestId, value.ownerUserId, value.generatedAt].every((entry) => entry.trim())) errors.push("artifact identity is incomplete");
  for (const ref of value.evidenceRefs) errors.push(...validateEvidenceRef(ref, value.ownerUserId));
  return errors;
}
function validateRef(ref: ArtifactRef, value: ArtifactBase<string>, schema: string) {
  const errors = validateArtifactRef(ref, value.ownerUserId, value.requestId);
  if (ref.schemaVersion !== schema) errors.push(`artifact reference requires ${schema}`);
  return errors;
}
function nestedEvidence(value: unknown, owner: string, path = "artifact"): string[] {
  if (!value || typeof value !== "object") return [];
  if ((value as { schemaVersion?: string }).schemaVersion === EVIDENCE_REFERENCE_VERSION) {
    return validateEvidenceRef(value as EvidenceRef, owner).map((error) => `${path}: ${error}`);
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => nestedEvidence(child, owner, `${path}.${key}`));
}
function correctionEvidenceAllowed(authority: EvidenceAuthority) {
  return authority === "customer-current"
    || authority === "customer-durable"
    || authority === "authorized-customer-service";
}
function validateCustomerState(value: CustomerDressingBrief | PersonalOutfitDirection) {
  const errors: string[] = [];
  for (const correction of value.activeCorrections) {
    if (correction.ownerUserId !== value.ownerUserId) errors.push("correction owner mismatch");
    if (!correctionEvidenceAllowed(correction.evidenceRef.authority)) errors.push("institutional or inferred evidence cannot become a customer correction");
  }
  for (const suppression of value.activeSuppressions) {
    if (suppression.ownerUserId !== value.ownerUserId) errors.push("suppression owner mismatch");
    if (!correctionEvidenceAllowed(suppression.evidenceRef.authority)) errors.push("institutional or inferred evidence cannot become a customer suppression");
  }
  return errors;
}
function validateSemanticList<K extends keyof typeof GOVERNED_SEMANTICS>(
  registry: K,
  values: readonly unknown[],
  label: string,
) {
  return values
    .filter((value) => !isGovernedSemantic(registry, value))
    .map(() => `unsupported ${label} registry identifier`);
}
export function validateCustomerDressingBrief(value: CustomerDressingBrief): ContractValidationResult<CustomerDressingBrief> {
  const errors = validateBase(value, CUSTOMER_DRESSING_BRIEF_VERSION);
  if (value.normalizedIntent.occasion && !isGovernedSemantic("occasion", value.normalizedIntent.occasion)) errors.push("unsupported occasion registry identifier");
  errors.push(
    ...validateSemanticList("tone", value.normalizedIntent.desiredTone, "tone"),
    ...validateSemanticList("practicalPurpose", value.normalizedIntent.practicalPurpose, "practical purpose"),
    ...validateSemanticList("instruction", value.normalizedIntent.explicitInstructions, "instruction"),
    ...validateSemanticList("quality", value.desiredImpression.map(({ quality }) => quality), "desired-impression quality"),
    ...validateSemanticList("quality", value.requiredQualities.map(({ quality }) => quality), "required quality"),
    ...validateSemanticList("quality", value.avoidedQualities.map(({ quality }) => quality), "avoided quality"),
    ...validateSemanticList("comfort", value.comfortRequirements.map(({ kind }) => kind), "comfort"),
    ...validateSemanticList("accessibility", value.accessibilityRequirements.map(({ kind }) => kind), "accessibility"),
    ...validateSemanticList("instruction", value.explicitItemInstructions.map(({ normalizedAction }) => normalizedAction), "item instruction"),
  );
  for (const unresolved of value.normalizedIntent.unresolvedLanguage) if (unresolved.mayDriveDecision !== false || unresolved.status !== "display-and-audit-only") errors.push("unresolved customer language cannot drive decisions");
  errors.push(...validateCustomerState(value), ...nestedEvidence(value, value.ownerUserId));
  return result(value, errors);
}
export function validateDressingPosture(value: DressingPosture): ContractValidationResult<DressingPosture> {
  const errors = validateBase(value, DRESSING_POSTURE_VERSION);
  errors.push(...validateRef(value.briefRef, value, CUSTOMER_DRESSING_BRIEF_VERSION));
  errors.push(...validateRef(value.eventPolicyRef, value, EVENT_POLICY_RESULT_VERSION));
  if (!isValidFormalityRange(value.formalityRange)) errors.push("invalid four-value formality chain");
  if (value.requiredSupportRoles.includes("fragrance")) errors.push("fragrance cannot be required");
  errors.push(
    ...validateSemanticList("accessibility", value.accessibilityRequirements.map(({ kind }) => kind), "accessibility"),
    ...validateSemanticList("garmentGenre", value.overdoneGenres.map(({ value: id }) => id), "garment genre"),
    ...validateSemanticList("material", value.materialDirection.map(({ value: id }) => id), "material"),
  );
  errors.push(...nestedEvidence(value, value.ownerUserId));
  return result(value, errors);
}
export function validatePersonalOutfitDirection(value: PersonalOutfitDirection): ContractValidationResult<PersonalOutfitDirection> {
  const errors = validateBase(value, PERSONAL_OUTFIT_DIRECTION_VERSION);
  for (const [ref, schema] of [
    [value.briefRef, CUSTOMER_DRESSING_BRIEF_VERSION], [value.postureRef, DRESSING_POSTURE_VERSION],
    [value.eventPolicyRef, EVENT_POLICY_RESULT_VERSION], [value.correctionStateRef, CORRECTION_STATE_VERSION],
    [value.suppressionStateRef, SUPPRESSION_STATE_VERSION], [value.memorySnapshotRef, MEMORY_SNAPSHOT_VERSION],
  ] as const) errors.push(...validateRef(ref, value, schema));
  const levels = ["very-casual", "casual", "polished-casual", "professional", "dressy", "formal", "ceremonial"];
  if (levels.indexOf(value.formalityBand.minimum) > levels.indexOf(value.formalityBand.maximum)) errors.push("formality band is inverted");
  if (value.requiredRoles.includes("fragrance")) errors.push("fragrance cannot be required");
  if (value.maxSupportPieces < 0) errors.push("maxSupportPieces cannot be negative");
  if (value.requiredRoles.some((role) => value.prohibitedRoles.includes(role))) errors.push("role cannot be required and prohibited");
  errors.push(
    ...validateSemanticList("silhouette", value.silhouetteIntent, "silhouette"),
    ...validateSemanticList("proportion", value.proportionIntent, "proportion"),
    ...validateSemanticList("palette", value.paletteIntent, "palette"),
    ...validateSemanticList("material", value.materialIntent, "material"),
    ...validateSemanticList("material", value.compliancePlan.materials.map(({ value: id }) => id), "material"),
    ...validateSemanticList("garmentGenre", value.compliancePlan.genres.map(({ value: id }) => id), "garment genre"),
    ...validateSemanticList("occasion", value.contextualReservations.map(({ occasion }) => occasion), "reservation occasion"),
    ...validateSemanticList("reservation", value.contextualReservations.map(({ reservation }) => reservation), "contextual reservation"),
    ...validateSemanticList("plausibility", value.personalPlausibilityReasons, "personal plausibility"),
  );
  errors.push(...validateCustomerState(value), ...nestedEvidence(value, value.ownerUserId));
  return result(value, errors);
}

const deterministicRequired = Object.entries(CHECK_DEFINITIONS).filter(([, definition]) => definition.collection === "deterministic" && definition.required === "always").map(([id]) => id);
const comparativeAlways = Object.entries(CHECK_DEFINITIONS).filter(([, definition]) => definition.collection === "comparative" && definition.required === "always").map(([id]) => id);
function sameRef(left: ArtifactRef, right: ArtifactRef) {
  return left.artifactId === right.artifactId && left.artifactRevision === right.artifactRevision;
}
function validateChecks(value: StylistAdjudicationDecision) {
  const errors: string[] = [];
  const all = [...value.deterministicChecks, ...value.comparativeChecks];
  const ids = all.map((check) => check.check);
  if (new Set(ids).size !== ids.length) errors.push("duplicate adjudication checks are prohibited");
  for (const id of deterministicRequired) if (!value.deterministicChecks.some((check) => check.check === id)) errors.push(`missing required deterministic check: ${id}`);
  for (const id of comparativeAlways) if (!value.comparativeChecks.some((check) => check.check === id)) errors.push(`missing required comparative check: ${id}`);
  for (const check of all) {
    if (!(check.check in CHECK_DEFINITIONS)) {
      errors.push("unsupported adjudication check identifier");
      continue;
    }
    if ("disqualifying" in check) errors.push("check results cannot override governed disqualification behavior");
  }
  for (const check of value.deterministicChecks) {
    const definition = CHECK_DEFINITIONS[check.check];
    if (definition && definition.collection !== "deterministic") errors.push("comparative check placed in deterministic collection");
  }
  for (const check of value.comparativeChecks) {
    const definition = CHECK_DEFINITIONS[check.check];
    if (definition && definition.collection !== "comparative") errors.push("deterministic check placed in comparative collection");
  }
  if (value.outcome === "recommend") {
    if (value.challengerLookRef && !value.comparativeChecks.some((check) => check.check === "simpler-challenger")) errors.push("challenger requires simpler-challenger check");
    for (const check of all) {
      const definition = CHECK_DEFINITIONS[check.check];
      if (!definition) continue;
      if (check.status === "fail" && definition.failureDisqualifies) errors.push(`recommend blocked by failed check: ${check.check}`);
      if (check.status === "unknown" && (definition.failureDisqualifies || check.reasonCodes.includes("consequential-unknown"))) errors.push(`recommend blocked by viability unknown: ${check.check}`);
      if (!check.candidateRefs.some((ref) => sameRef(ref, value.selectedLookRef))) errors.push(`check does not reference selected look: ${check.check}`);
    }
    const challenger = value.challengerLookRef;
    const challengerCheck = value.comparativeChecks.find((check) => check.check === "simpler-challenger");
    if (challenger && challengerCheck && (!challengerCheck.candidateRefs.some((ref) => sameRef(ref, value.selectedLookRef)) || !challengerCheck.candidateRefs.some((ref) => sameRef(ref, challenger)))) errors.push("challenger comparison must reference primary and challenger");
  }
  for (const fact of [...value.explanationFacts, ...all.flatMap((check) => check.explanationFacts)]) if (fact.evidenceRefs.length === 0) errors.push("explanation facts require supporting evidence");
  return errors;
}
export function validateStylistAdjudicationDecision(value: StylistAdjudicationDecision): ContractValidationResult<StylistAdjudicationDecision> {
  const errors = validateBase(value, STYLIST_ADJUDICATION_VERSION);
  for (const [ref, schema] of [
    [value.briefRef, CUSTOMER_DRESSING_BRIEF_VERSION], [value.eventPolicyRef, EVENT_POLICY_RESULT_VERSION],
    [value.postureRef, DRESSING_POSTURE_VERSION], [value.correctionStateRef, CORRECTION_STATE_VERSION],
    [value.suppressionStateRef, SUPPRESSION_STATE_VERSION], [value.memorySnapshotRef, MEMORY_SNAPSHOT_VERSION],
  ] as const) errors.push(...validateRef(ref, value, schema));
  for (const ref of value.directionRefs) errors.push(...validateRef(ref, value, PERSONAL_OUTFIT_DIRECTION_VERSION));
  for (const ref of value.candidateLookRefs) errors.push(...validateRef(ref, value, CANDIDATE_LOOK_VERSION));
  if (value.outcome === "recommend") {
    errors.push(...validateRef(value.selectedLookRef, value, CANDIDATE_LOOK_VERSION));
    if (!value.candidateLookRefs.some((ref) => sameRef(ref, value.selectedLookRef))) errors.push("selected look is absent from candidateLookRefs");
    if (value.challengerLookRef) errors.push(...validateRef(value.challengerLookRef, value, CANDIDATE_LOOK_VERSION));
    if ("revisionOperations" in value || "question" in value || "abstentionReason" in value) errors.push("recommend contains outcome-irrelevant fields");
  } else if (value.outcome === "revise-composition") {
    errors.push(...validateRef(value.candidateLookRef, value, CANDIDATE_LOOK_VERSION));
    if (!value.candidateLookRefs.some((ref) => sameRef(ref, value.candidateLookRef))) errors.push("revision candidate is absent from candidateLookRefs");
    if (value.revisionOperations.length === 0) errors.push("revise requires governed revision operations");
    for (const operation of value.revisionOperations) {
      if (operation.operation === "replace-foundation") {
        errors.push(...validateRef(operation.directionRef, value, PERSONAL_OUTFIT_DIRECTION_VERSION));
        if (!value.directionRefs.some((ref) => sameRef(ref, operation.directionRef))) errors.push("revision direction is absent from directionRefs");
      }
    }
    if ("selectedLookRef" in value || "question" in value || "abstentionReason" in value) errors.push("revise contains outcome-irrelevant fields");
  } else if (value.outcome === "ask-one-question") {
    if (value.question.consequence !== "changes-viability" || !value.question.focusedQuestion?.trim()) errors.push("ask requires one viability-changing focused question");
    if ("selectedLookRef" in value || "revisionOperations" in value || "abstentionReason" in value) errors.push("ask contains outcome-irrelevant fields");
  } else {
    if (value.abstentionReason === "approved") errors.push("abstain requires a governed failure reason");
    if ("selectedLookRef" in value || "revisionOperations" in value || "question" in value) errors.push("abstain contains outcome-irrelevant fields");
  }
  errors.push(...validateChecks(value), ...nestedEvidence(value, value.ownerUserId));
  return result(value, errors);
}

export { ARTIFACT_REFERENCE_VERSION };
