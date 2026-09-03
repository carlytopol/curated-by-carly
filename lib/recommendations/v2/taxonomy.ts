export const RECOMMENDATION_V2_TAXONOMY_VERSION = "recommendation-taxonomy.v2.3.0" as const;
export const EVIDENCE_REFERENCE_VERSION = "evidence-reference.v2.3.0" as const;
export const ARTIFACT_REFERENCE_VERSION = "artifact-reference.v2.2.0" as const;

export const FORMALITY_LEVELS = [
  "very-casual", "casual", "polished-casual", "professional", "dressy", "formal", "ceremonial",
] as const;
export type FormalityLevel = (typeof FORMALITY_LEVELS)[number];
export type Confidence = "low" | "medium" | "high";
export type EffortLevel = "low" | "moderate" | "high";
export type CeremonyAllowance = "none" | "restrained" | "expressive" | "formal";
export type DayCharacter =
  | "routine" | "professional" | "social" | "active" | "travel"
  | "ceremonial" | "intimate" | "transitional" | "mixed";
export type SocialStakes =
  | "private" | "ordinary-public" | "professionally-visible" | "socially-visible" | "ceremonial";
export type OutfitFoundationKind = "dress" | "jumpsuit" | "top-bottom" | "coordinated-set";
export type GarmentRole =
  | "dress" | "jumpsuit" | "top" | "bottom" | "coordinated-set"
  | "outer-layer" | "shoes" | "bag" | "accessory" | "jewelry" | "fragrance";
export type SupportRole = "outer-layer" | "shoes" | "bag" | "accessory" | "jewelry" | "fragrance";

export const GOVERNED_SEMANTICS = {
  occasion: ["routine", "work", "business-meeting", "school-community", "errands", "shopping", "lunch", "dinner", "date", "travel", "workout", "outdoor-social", "ceremony"],
  tone: ["relaxed", "approachable", "practical", "polished", "restrained", "expressive", "professional", "romantic"],
  practicalPurpose: ["walking", "standing", "sitting", "travel", "hands-free", "secure-carrying", "weather-protection", "easy-adjustment"],
  quality: ["comfortable", "breathable", "secure", "covered", "walkable", "cohesive", "understated", "intentional", "weather-appropriate"],
  comfort: ["temperature", "movement", "sensory", "adjustment"],
  accessibility: ["mobility", "dexterity", "sensory", "medical", "other"],
  material: ["cotton", "linen", "denim-light", "denim-heavy", "silk", "satin", "wool-light", "wool-heavy", "leather", "suede", "synthetic-breathable", "synthetic-heavy"],
  garmentGenre: ["everyday", "workwear", "activewear", "travel", "cocktail", "evening", "ceremonial", "resort", "streetwear"],
  silhouette: ["close", "balanced", "relaxed", "tailored", "fluid", "structured"],
  proportion: ["balanced", "long-over-short", "short-over-long", "column", "defined-waist"],
  palette: ["neutral", "tonal", "analogous", "complementary", "high-contrast", "statement-accent"],
  reservation: ["occasion-reserved", "weather-reserved", "movement-reserved", "coverage-reserved", "formality-reserved"],
  plausibility: ["confirmed-worn-pattern", "explicit-profile-alignment", "occasion-behavior-alignment", "wardrobe-composition-alignment", "correction-alignment"],
  instruction: ["require-item", "prefer-item", "avoid-item", "prohibit-item", "require-quality", "avoid-quality"],
} as const;

type RegistryValues<K extends keyof typeof GOVERNED_SEMANTICS> = (typeof GOVERNED_SEMANTICS)[K][number];
export type OccasionId = RegistryValues<"occasion">;
export type ToneId = RegistryValues<"tone">;
export type PracticalPurposeId = RegistryValues<"practicalPurpose">;
export type QualityId = RegistryValues<"quality">;
export type ComfortKind = RegistryValues<"comfort">;
export type AccessibilityKind = RegistryValues<"accessibility">;
export type MaterialId = RegistryValues<"material">;
export type GarmentGenreId = RegistryValues<"garmentGenre">;
export type SilhouetteId = RegistryValues<"silhouette">;
export type ProportionId = RegistryValues<"proportion">;
export type PaletteId = RegistryValues<"palette">;
export type ContextualReservationId = RegistryValues<"reservation">;
export type PersonalPlausibilityReasonId = RegistryValues<"plausibility">;
export type InstructionId = RegistryValues<"instruction">;

export type UnresolvedCustomerLanguage = {
  kind: "unresolved-customer-language";
  text: string;
  status: "display-and-audit-only";
  mayDriveDecision: false;
  evidenceRefs: EvidenceRef[];
};

export function isGovernedSemantic<K extends keyof typeof GOVERNED_SEMANTICS>(
  registry: K,
  value: unknown,
): value is RegistryValues<K> {
  return typeof value === "string" && (GOVERNED_SEMANTICS[registry] as readonly string[]).includes(value);
}

export type EvidenceAuthority =
  | "customer-current" | "customer-durable" | "authorized-customer-service"
  | "connected-external-service"
  | "canonical-fact" | "verified-source" | "confirmed-behavior" | "inference"
  | "product-evaluation" | "founder-evaluation" | "automated-test" | "system-fact" | "unknown";
export type EvidenceSourceType =
  | "customer-statement" | "profile" | "wardrobe-item" | "worn-history" | "style-archive"
  | "correction" | "suppression" | "customer-service-action" | "calendar" | "weather" | "venue"
  | "outfit-memory" | "product-evaluation" | "founder-evaluation" | "automated-test" | "system";

export type EvidenceRef = {
  schemaVersion: typeof EVIDENCE_REFERENCE_VERSION;
  evidenceId: string;
  ownerUserId: string | null;
  authority: EvidenceAuthority;
  sourceType: EvidenceSourceType;
  sourceVersion: string;
  confidence: Confidence;
  observedAt: string;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
};

export type ArtifactRef<S extends string = string> = {
  referenceVersion: typeof ARTIFACT_REFERENCE_VERSION;
  artifactId: string;
  ownerUserId: string;
  requestId: string;
  schemaVersion: S;
  artifactRevision: string;
  generatedAt: string;
};

export type GovernedValue<T> = {
  value: T | null;
  state: "known" | "unknown" | "conflicted" | "unresolved";
  confidence: Confidence;
  evidenceRefs: EvidenceRef[];
};

export type OriginalLanguage = {
  text: string;
  evidenceRef: EvidenceRef;
};

export type NormalizedIntent = {
  occasion: OccasionId | null;
  desiredTone: ToneId[];
  practicalPurpose: PracticalPurposeId[];
  explicitInstructions: InstructionId[];
  unresolvedLanguage: UnresolvedCustomerLanguage[];
  confidence: Confidence;
  evidenceRefs: EvidenceRef[];
};

export type GovernedPreference = { quality: QualityId; strength: "light" | "moderate" | "strong"; evidenceRefs: EvidenceRef[] };
export type GovernedRequirement = { quality: QualityId; evidenceRefs: EvidenceRef[] };
export type GovernedProhibition = { quality: QualityId; evidenceRefs: EvidenceRef[] };

export type CoveragePredicate =
  | { kind: "shoulder-coverage"; value: "required" | "preferred" | "not-required"; evidenceRefs: EvidenceRef[] }
  | { kind: "neckline"; operator: "at-most"; value: "high" | "moderate" | "open"; evidenceRefs: EvidenceRef[] }
  | { kind: "hem-length"; operator: "at-least"; value: "upper-thigh" | "knee" | "midi" | "ankle"; evidenceRefs: EvidenceRef[] }
  | { kind: "opacity"; value: "opaque" | "lined" | "sheer-with-required-layer"; evidenceRefs: EvidenceRef[] }
  | { kind: "fit-exposure"; value: "close" | "balanced" | "relaxed"; evidenceRefs: EvidenceRef[] };

export type FootwearPredicate =
  | { kind: "heel-height"; operator: "at-most"; value: "flat" | "low" | "mid" | "high"; evidenceRefs: EvidenceRef[] }
  | { kind: "walking"; value: "not-required" | "moderate" | "sustained"; evidenceRefs: EvidenceRef[] }
  | { kind: "stability"; value: "standard" | "secure"; evidenceRefs: EvidenceRef[] }
  | { kind: "genre"; operator: "allow" | "prohibit"; value: "sneaker" | "flat" | "loafer" | "sandal" | "boot" | "pump" | "heel"; evidenceRefs: EvidenceRef[] };

export type CarryingPredicate =
  | { kind: "bag"; value: "required" | "optional" | "prohibited"; evidenceRefs: EvidenceRef[] }
  | { kind: "secure-storage"; value: "not-required" | "pocket-required" | "bag-or-pocket"; evidenceRefs: EvidenceRef[] }
  | { kind: "hands-free"; value: boolean; evidenceRefs: EvidenceRef[] };

export type MovementPredicate =
  | { kind: "walking"; value: "low" | "moderate" | "high"; evidenceRefs: EvidenceRef[] }
  | { kind: "standing"; value: "low" | "moderate" | "high"; evidenceRefs: EvidenceRef[] }
  | { kind: "sitting"; value: "low" | "moderate" | "high"; evidenceRefs: EvidenceRef[] }
  | { kind: "transit"; value: "none" | "short" | "extended"; evidenceRefs: EvidenceRef[] };

export type FormalityPredicate =
  | { kind: "floor"; value: FormalityLevel; evidenceRefs: EvidenceRef[] }
  | { kind: "preferred-floor"; value: FormalityLevel; evidenceRefs: EvidenceRef[] }
  | { kind: "preferred-ceiling"; value: FormalityLevel; evidenceRefs: EvidenceRef[] }
  | { kind: "ceiling"; value: FormalityLevel; evidenceRefs: EvidenceRef[] };
export type CeremonyPredicate = { kind: "ceremony-ceiling"; value: CeremonyAllowance; evidenceRefs: EvidenceRef[] };
export type MaterialPredicate = { kind: "material"; operator: "prefer" | "avoid" | "prohibit"; value: MaterialId; evidenceRefs: EvidenceRef[] };
export type GarmentGenrePredicate = { kind: "garment-genre"; operator: "prefer" | "avoid" | "prohibit"; value: GarmentGenreId; evidenceRefs: EvidenceRef[] };
export type ContextualReservation = { occasion: OccasionId; reservation: ContextualReservationId; confidence: Confidence; evidenceRefs: EvidenceRef[] };

export type ConsequentialUnknown = {
  unknownId: string;
  subject: string;
  consequence: "changes-viability" | "changes-ranking" | "explanation-only";
  focusedQuestion: string | null;
  evidenceRefs: EvidenceRef[];
};
export type ManageableAssumption = {
  assumptionId: string;
  statement: string;
  consequence: "low" | "moderate";
  evidenceRefs: EvidenceRef[];
};

export type FormalityRange = {
  floor: FormalityLevel;
  preferredFloor: FormalityLevel;
  preferredCeiling: FormalityLevel;
  ceiling: FormalityLevel;
};

export const formalityOrdinal = (value: FormalityLevel) => FORMALITY_LEVELS.indexOf(value);
export function isValidFormalityRange(range: FormalityRange) {
  return formalityOrdinal(range.floor) <= formalityOrdinal(range.preferredFloor)
    && formalityOrdinal(range.preferredFloor) <= formalityOrdinal(range.preferredCeiling)
    && formalityOrdinal(range.preferredCeiling) <= formalityOrdinal(range.ceiling);
}

export type ReasonCode =
  | "ownership-unverified" | "unavailable" | "suppressed" | "explicitly-prohibited"
  | "venue-rule-conflict" | "activity-safety-conflict" | "coverage-conflict"
  | "footwear-conflict" | "carrying-conflict" | "formality-conflict" | "ceremony-conflict"
  | "material-conflict" | "genre-conflict" | "incomplete-outfit" | "duplicate-role"
  | "brief-conflict" | "context-conflict" | "personal-plausibility-low"
  | "effort-disproportionate" | "coherence-low" | "restraint-failed"
  | "simpler-challenger-wins" | "consequential-unknown" | "editorial-rejection"
  | "approved";

export const CHECK_DEFINITIONS = {
  "ownership-availability": { collection: "deterministic", required: "always", failureDisqualifies: true },
  "event-policy": { collection: "deterministic", required: "always", failureDisqualifies: true },
  "brief-compliance": { collection: "deterministic", required: "always", failureDisqualifies: true },
  "suppression": { collection: "deterministic", required: "always", failureDisqualifies: true },
  "outfit-completeness": { collection: "deterministic", required: "always", failureDisqualifies: true },
  "lived-day-reality": { collection: "comparative", required: "always", failureDisqualifies: true },
  "personal-plausibility": { collection: "comparative", required: "always", failureDisqualifies: true },
  "effort-proportionality": { collection: "comparative", required: "always", failureDisqualifies: true },
  "whole-look-coherence": { collection: "comparative", required: "always", failureDisqualifies: true },
  "restraint": { collection: "comparative", required: "always", failureDisqualifies: true },
  "simpler-challenger": { collection: "comparative", required: "when-challenger-exists", failureDisqualifies: true },
  "uncertainty": { collection: "comparative", required: "always", failureDisqualifies: false },
  "editorial-judgment": { collection: "comparative", required: "always", failureDisqualifies: true },
} as const;
export type AdjudicationCheckId = keyof typeof CHECK_DEFINITIONS;

export function validateEvidenceRef(ref: EvidenceRef, ownerUserId: string): string[] {
  const errors: string[] = [];
  if (!ref.evidenceId.trim()) errors.push("evidenceId is required");
  if (!ref.sourceVersion.trim()) errors.push("sourceVersion is required");
  if (!ref.observedAt.trim()) errors.push("observedAt is required");
  if (ref.ownerUserId !== null && ref.ownerUserId !== ownerUserId) errors.push("evidence owner mismatch");
  const allowed: Record<EvidenceAuthority, readonly EvidenceSourceType[]> = {
    "customer-current": ["customer-statement", "correction", "suppression"],
    "customer-durable": ["profile", "correction", "suppression"],
    "authorized-customer-service": ["customer-service-action"],
    "connected-external-service": ["calendar", "weather", "venue"],
    "canonical-fact": ["wardrobe-item", "system"],
    "verified-source": ["weather", "venue"],
    "confirmed-behavior": ["worn-history", "style-archive", "outfit-memory"],
    inference: ["profile", "wardrobe-item", "worn-history", "style-archive", "outfit-memory"],
    "product-evaluation": ["product-evaluation"],
    "founder-evaluation": ["founder-evaluation"],
    "automated-test": ["automated-test"],
    "system-fact": ["system"],
    unknown: ["customer-statement", "system"],
  };
  if (!allowed[ref.authority].includes(ref.sourceType)) errors.push("invalid evidence authority/source relationship");
  const institutional = ["product-evaluation", "founder-evaluation", "automated-test"] as EvidenceAuthority[];
  if (institutional.includes(ref.authority) && ref.ownerUserId !== null) errors.push("institutional evidence must not be customer-owned");
  if (["customer-current", "customer-durable", "authorized-customer-service", "confirmed-behavior", "inference"].includes(ref.authority)
    && ref.ownerUserId !== ownerUserId) errors.push("customer authority requires matching customer ownership");
  return errors;
}

export function validateArtifactRef(ref: ArtifactRef, ownerUserId: string, requestId: string): string[] {
  const errors: string[] = [];
  if (ref.referenceVersion !== ARTIFACT_REFERENCE_VERSION) errors.push("unsupported artifact referenceVersion");
  if (!ref.artifactId.trim() || !ref.artifactRevision.trim() || !ref.generatedAt.trim()) errors.push("artifact reference identity is incomplete");
  if (ref.ownerUserId !== ownerUserId) errors.push("artifact reference owner mismatch");
  if (ref.requestId !== requestId) errors.push("artifact reference request mismatch");
  return errors;
}
