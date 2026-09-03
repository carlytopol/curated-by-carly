import {
  DRESSING_POSTURE_VERSION,
  validateDressingPosture,
  type CustomerDressingBrief,
  type DressingPosture,
} from "./contracts";
import {
  ARTIFACT_REFERENCE_VERSION,
  RECOMMENDATION_V2_TAXONOMY_VERSION,
  type ArtifactRef,
  type CeremonyAllowance,
  type DayCharacter,
  type EvidenceRef,
  type FormalityLevel,
  type SocialStakes,
} from "./taxonomy";

export const DRESSING_POSTURE_RESOLVER_VERSION = "dressing-posture-resolver.v2.1.0" as const;

export type GovernedWeatherEvidence = {
  temperatureF: number | null;
  feelsLikeF: number | null;
  humidityPercent: number | null;
  precipitationProbability: number | null;
  windMph: number | null;
  daylight: boolean | null;
  evidenceRefs: EvidenceRef[];
};

export type NarrowEventPolicyResult = {
  schemaVersion: "event-policy-result.v2.3.0";
  artifactId: string;
  artifactRevision: string;
  requestId: string;
  ownerUserId: string;
  generatedAt: string;
  requiredRoles: Array<"shoes">;
  prohibitedRoles: Array<"bag">;
  confirmedVenueProhibitions: string[];
  confirmedActivityRequirements: string[];
  evidenceRefs: EvidenceRef[];
};

export type ResolveDressingPostureInput = {
  artifactId: string;
  artifactRevision: string;
  generatedAt: string;
  brief: CustomerDressingBrief;
  eventPolicy: NarrowEventPolicyResult;
  weather: GovernedWeatherEvidence;
};

const formalityByOccasion: Record<string, {
  day: DayCharacter; stakes: SocialStakes; floor: FormalityLevel;
  preferredFloor: FormalityLevel; preferredCeiling: FormalityLevel;
  ceiling: FormalityLevel; ceremony: CeremonyAllowance;
}> = {
  routine: { day: "routine", stakes: "ordinary-public", floor: "very-casual", preferredFloor: "casual", preferredCeiling: "polished-casual", ceiling: "professional", ceremony: "none" },
  errands: { day: "routine", stakes: "ordinary-public", floor: "very-casual", preferredFloor: "casual", preferredCeiling: "polished-casual", ceiling: "professional", ceremony: "none" },
  shopping: { day: "social", stakes: "ordinary-public", floor: "casual", preferredFloor: "casual", preferredCeiling: "polished-casual", ceiling: "professional", ceremony: "restrained" },
  lunch: { day: "social", stakes: "socially-visible", floor: "casual", preferredFloor: "polished-casual", preferredCeiling: "professional", ceiling: "dressy", ceremony: "restrained" },
  dinner: { day: "social", stakes: "socially-visible", floor: "polished-casual", preferredFloor: "professional", preferredCeiling: "dressy", ceiling: "formal", ceremony: "expressive" },
  date: { day: "intimate", stakes: "socially-visible", floor: "polished-casual", preferredFloor: "professional", preferredCeiling: "dressy", ceiling: "formal", ceremony: "expressive" },
  work: { day: "professional", stakes: "professionally-visible", floor: "polished-casual", preferredFloor: "professional", preferredCeiling: "professional", ceiling: "dressy", ceremony: "restrained" },
  "business-meeting": { day: "professional", stakes: "professionally-visible", floor: "professional", preferredFloor: "professional", preferredCeiling: "dressy", ceiling: "formal", ceremony: "restrained" },
  "school-community": { day: "professional", stakes: "professionally-visible", floor: "casual", preferredFloor: "polished-casual", preferredCeiling: "professional", ceiling: "professional", ceremony: "none" },
  travel: { day: "travel", stakes: "ordinary-public", floor: "very-casual", preferredFloor: "casual", preferredCeiling: "polished-casual", ceiling: "professional", ceremony: "none" },
  workout: { day: "active", stakes: "private", floor: "very-casual", preferredFloor: "very-casual", preferredCeiling: "casual", ceiling: "casual", ceremony: "none" },
  "outdoor-social": { day: "social", stakes: "socially-visible", floor: "casual", preferredFloor: "polished-casual", preferredCeiling: "professional", ceiling: "dressy", ceremony: "restrained" },
  ceremony: { day: "ceremonial", stakes: "ceremonial", floor: "dressy", preferredFloor: "formal", preferredCeiling: "ceremonial", ceiling: "ceremonial", ceremony: "formal" },
};

const ref = <S extends string>(value: {
  schemaVersion: S; artifactId: string; artifactRevision: string; requestId: string;
  ownerUserId: string; generatedAt: string;
}): ArtifactRef<S> => ({
  referenceVersion: ARTIFACT_REFERENCE_VERSION,
  artifactId: value.artifactId,
  artifactRevision: value.artifactRevision,
  requestId: value.requestId,
  ownerUserId: value.ownerUserId,
  schemaVersion: value.schemaVersion,
  generatedAt: value.generatedAt,
});

export function resolveDressingPosture(input: ResolveDressingPostureInput): DressingPosture {
  const { brief, eventPolicy, weather } = input;
  if (brief.ownerUserId !== eventPolicy.ownerUserId || brief.requestId !== eventPolicy.requestId) {
    throw new Error("Posture inputs must share one owner and request");
  }
  const base = formalityByOccasion[brief.normalizedIntent.occasion ?? "routine"] ?? formalityByOccasion.routine;
  const currentEvidence = [...brief.evidenceRefs, ...eventPolicy.evidenceRefs, ...weather.evidenceRefs];
  const maxHeat = Math.max(weather.temperatureF ?? -Infinity, weather.feelsLikeF ?? -Infinity);
  const thermal = maxHeat >= 100 ? "extreme-heat" : maxHeat >= 88 ? "hot" : maxHeat >= 75 ? "warm"
    : maxHeat >= 58 ? "temperate" : maxHeat >= 42 ? "cool" : "cold";
  const bag = eventPolicy.prohibitedRoles.includes("bag")
    || brief.carryingNeeds.some((need) => need.kind === "bag" && need.value === "prohibited")
    ? "prohibited" : brief.carryingNeeds.some((need) => need.kind === "bag" && need.value === "required")
      ? "required" : "optional";
  const secureStorage = brief.carryingNeeds.some((need) => need.kind === "secure-storage" && need.value === "pocket-required")
    ? "pocket-required" : bag === "prohibited" ? "bag-or-pocket" : "not-required";
  const walking = brief.movementRequirements.find((item) => item.kind === "walking");
  const standing = brief.movementRequirements.find((item) => item.kind === "standing");
  const highMovement = walking?.value === "high" || standing?.value === "high";
  const evidenceRefs = [...new Map(currentEvidence.map((entry) => [entry.evidenceId, entry])).values()];
  const posture: DressingPosture = {
    schemaVersion: DRESSING_POSTURE_VERSION,
    taxonomyVersion: RECOMMENDATION_V2_TAXONOMY_VERSION,
    artifactId: input.artifactId,
    artifactRevision: input.artifactRevision,
    requestId: brief.requestId,
    ownerUserId: brief.ownerUserId,
    generatedAt: input.generatedAt,
    evidenceRefs,
    briefRef: ref(brief),
    eventPolicyRef: ref(eventPolicy),
    dayCharacter: base.day,
    socialStakes: base.stakes,
    formalityRange: { floor: base.floor, preferredFloor: base.preferredFloor, preferredCeiling: base.preferredCeiling, ceiling: base.ceiling },
    ceremonyAllowance: base.ceremony,
    effortBudget: highMovement || thermal === "extreme-heat" ? "low" : "moderate",
    movementPosture: brief.movementRequirements,
    thermalPosture: {
      severity: thermal,
      humidity: weather.humidityPercent === null ? "unknown" : weather.humidityPercent >= 70 ? "high" : weather.humidityPercent >= 40 ? "moderate" : "low",
      evidenceRefs: weather.evidenceRefs,
    },
    weatherProtection: {
      rain: weather.precipitationProbability === null ? "none" : weather.precipitationProbability >= 60 ? "likely" : weather.precipitationProbability >= 25 ? "possible" : "none",
      wind: weather.windMph === null || weather.windMph < 12 ? "low" : weather.windMph < 22 ? "moderate" : "high",
      sun: weather.daylight === false ? "low" : thermal === "hot" || thermal === "extreme-heat" ? "high" : "moderate",
      evidenceRefs: weather.evidenceRefs,
    },
    carryingPosture: { bag, secureStorage, evidenceRefs: [...eventPolicy.evidenceRefs, ...brief.carryingNeeds.flatMap((item) => item.evidenceRefs)] },
    accessibilityRequirements: brief.accessibilityRequirements,
    coverageRequirements: brief.coverageRequirements,
    footwearRequirements: brief.footwearRequirements,
    preferredFoundationDirections: base.day === "active" ? ["coordinated-set"] : ["top-bottom", "dress", "jumpsuit", "coordinated-set"],
    overdoneGenres: base.ceremony === "none"
      ? [{ kind: "garment-genre", operator: "avoid", value: "cocktail", evidenceRefs }, { kind: "garment-genre", operator: "avoid", value: "evening", evidenceRefs }]
      : [],
    materialDirection: thermal === "hot" || thermal === "extreme-heat"
      ? [{ kind: "material", operator: "prefer", value: "linen", evidenceRefs: weather.evidenceRefs }, { kind: "material", operator: "prefer", value: "cotton", evidenceRefs: weather.evidenceRefs }, { kind: "material", operator: "avoid", value: "denim-heavy", evidenceRefs: weather.evidenceRefs }, { kind: "material", operator: "avoid", value: "wool-heavy", evidenceRefs: weather.evidenceRefs }]
      : [],
    requiredSupportRoles: eventPolicy.requiredRoles,
    optionalSupportRoles: bag === "prohibited" ? ["outer-layer", "accessory", "jewelry", "fragrance"] : ["outer-layer", "bag", "accessory", "jewelry", "fragrance"],
    adjustmentTolerance: highMovement ? "low" : "moderate",
    simplicity: highMovement || base.day === "routine" ? "strong" : "moderate",
    criticalUnknowns: brief.consequentialUnknowns,
    manageableAssumptions: brief.manageableAssumptions,
    confidence: brief.consequentialUnknowns.some((item) => item.consequence === "changes-viability") ? "low" : weather.evidenceRefs.length ? "high" : "medium",
    reasonCodes: ["approved"],
  };
  const validation = validateDressingPosture(posture);
  if (!validation.success) throw new Error(`Invalid Dressing Posture: ${validation.errors.join("; ")}`);
  return posture;
}
