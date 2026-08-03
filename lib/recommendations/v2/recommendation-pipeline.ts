import {
  CANDIDATE_LOOK_VERSION,
  PERSONAL_OUTFIT_DIRECTION_VERSION,
  STYLIST_ADJUDICATION_VERSION,
  type CustomerDressingBrief,
  type DressingPosture,
  type PersonalOutfitDirection,
} from "./contracts";
import type { NarrowEventPolicyResult } from "./dressing-posture";
import type { PersonalOutfitMemorySnapshot } from "./personal-outfit-memory";
import { materiallyDistinctFoundations } from "./persistable-looks";
import {
  ARTIFACT_REFERENCE_VERSION,
  CHECK_DEFINITIONS,
  RECOMMENDATION_V2_TAXONOMY_VERSION,
  formalityOrdinal,
  type ArtifactRef,
  type Confidence,
  type EvidenceRef,
  type FormalityLevel,
  type GarmentRole,
  type MaterialId,
  type OutfitFoundationKind,
  type PaletteId,
  type ReasonCode,
  type SilhouetteId,
} from "./taxonomy";

export const PERSONAL_OUTFIT_DIRECTION_BUILDER_VERSION = "personal-outfit-direction-builder.v2.1.0" as const;
export const DIRECTION_RETRIEVAL_VERSION = "direction-led-retrieval.v2.1.0" as const;
export const RESTRAINED_COMPOSITION_VERSION = "restrained-composition.v2.1.0" as const;
export const HARD_VALIDATION_VERSION = "hard-validation.v2.1.0" as const;
export const STYLIST_ADJUDICATOR_VERSION = "stylist-adjudicator.v2.1.0" as const;

export type StyleProfileProjection = {
  ownerUserId: string;
  revision: string;
  preferredFoundations: OutfitFoundationKind[];
  silhouettes: SilhouetteId[];
  palettes: PaletteId[];
  materials: MaterialId[];
  avoidedItemIds: string[];
  preferredItemIds: string[];
  evidenceRefs: EvidenceRef[];
};

export type WardrobeGarment = {
  ownerUserId: string;
  itemId: string;
  name: string;
  role: GarmentRole;
  foundationKind: OutfitFoundationKind | null;
  available: boolean;
  suppressed: boolean;
  formality: FormalityLevel | null;
  materials: MaterialId[];
  silhouettes: SilhouetteId[];
  palettes: PaletteId[];
  genres: Array<"everyday" | "workwear" | "activewear" | "travel" | "cocktail" | "evening" | "ceremonial" | "resort" | "streetwear">;
  securePockets: boolean | null;
  walkability: "low" | "moderate" | "high" | null;
  descriptors: string[];
  evidenceRefs: EvidenceRef[];
};

export type DirectionRetrieval = {
  direction: PersonalOutfitDirection;
  foundationCandidates: WardrobeGarment[][];
  supportCandidates: Partial<Record<GarmentRole, WardrobeGarment[]>>;
  rejectionReasons: Array<{ itemId: string; reasonCodes: ReasonCode[] }>;
};

export type CandidateLook = {
  schemaVersion: typeof CANDIDATE_LOOK_VERSION;
  taxonomyVersion: typeof RECOMMENDATION_V2_TAXONOMY_VERSION;
  artifactId: string; artifactRevision: string; requestId: string; ownerUserId: string; generatedAt: string;
  directionRef: ArtifactRef<typeof PERSONAL_OUTFIT_DIRECTION_VERSION>;
  items: WardrobeGarment[];
  omittedOptionalRoles: GarmentRole[];
  evidenceRefs: EvidenceRef[];
  diagnostics: { cohesion: number; personalPolish: number; burden: number; confidence: Confidence };
};

export type HardValidationResult = {
  look: CandidateLook;
  passed: boolean;
  checks: Array<{ check: "ownership-availability" | "event-policy" | "brief-compliance" | "suppression" | "outfit-completeness"; passed: boolean; reasonCodes: ReasonCode[]; evidenceRefs: EvidenceRef[] }>;
};

const artifactRef = <S extends string>(value: {
  schemaVersion: S; artifactId: string; artifactRevision: string; requestId: string; ownerUserId: string; generatedAt: string;
}): ArtifactRef<S> => ({
  referenceVersion: ARTIFACT_REFERENCE_VERSION, artifactId: value.artifactId,
  artifactRevision: value.artifactRevision, requestId: value.requestId, ownerUserId: value.ownerUserId,
  schemaVersion: value.schemaVersion, generatedAt: value.generatedAt,
});
const uniq = <T>(items: T[]) => [...new Set(items)];

export function buildPersonalOutfitDirections(input: {
  posture: DressingPosture; brief: CustomerDressingBrief; eventPolicy: NarrowEventPolicyResult;
  memory: PersonalOutfitMemorySnapshot; style: StyleProfileProjection;
  correctionStateRef: ArtifactRef<"correction-state.v2.3.0">;
  suppressionStateRef: ArtifactRef<"suppression-state.v2.3.0">;
  maximumDirections?: number;
}): PersonalOutfitDirection[] {
  const { posture, brief, memory, style } = input;
  if ([brief.ownerUserId, memory.ownerUserId, style.ownerUserId, input.eventPolicy.ownerUserId].some((owner) => owner !== posture.ownerUserId)) {
    throw new Error("Direction inputs must share one owner");
  }
  const memoryFoundations = memory.confirmedFoundations
    .sort((a, b) => b.count - a.count).map((item) => item.foundation);
  const foundations = uniq([
    ...style.preferredFoundations,
    ...memoryFoundations,
    ...posture.preferredFoundationDirections,
  ]).slice(0, input.maximumDirections ?? 3);
  const evidenceRefs = uniq([...posture.evidenceRefs, ...style.evidenceRefs, ...memory.evidenceRefs]);
  return foundations.map((foundation, index) => {
    const requiredRoles: GarmentRole[] = foundation === "dress" ? ["dress", "shoes"]
      : foundation === "jumpsuit" ? ["jumpsuit", "shoes"]
        : foundation === "coordinated-set" ? ["coordinated-set", "shoes"]
          : ["top", "bottom", "shoes"];
    return {
      schemaVersion: PERSONAL_OUTFIT_DIRECTION_VERSION,
      taxonomyVersion: RECOMMENDATION_V2_TAXONOMY_VERSION,
      artifactId: `${posture.artifactId}:direction:${index + 1}`, artifactRevision: "1",
      requestId: posture.requestId, ownerUserId: posture.ownerUserId, generatedAt: posture.generatedAt,
      evidenceRefs, briefRef: artifactRef(brief), postureRef: artifactRef(posture),
      eventPolicyRef: artifactRef(input.eventPolicy), correctionStateRef: input.correctionStateRef,
      suppressionStateRef: input.suppressionStateRef, memorySnapshotRef: artifactRef(memory),
      styleProfileRevision: style.revision,
      intent: index === 0 ? "characteristic" : index === 1 ? "practical" : "expressive",
      foundationConcept: foundation,
      compliancePlan: {
        coverage: posture.coverageRequirements, footwear: posture.footwearRequirements,
        carrying: [{ kind: "bag", value: posture.carryingPosture.bag, evidenceRefs: posture.carryingPosture.evidenceRefs }],
        movement: posture.movementPosture, materials: posture.materialDirection, genres: posture.overdoneGenres,
      },
      requiredRoles, prohibitedRoles: posture.carryingPosture.bag === "prohibited" ? ["bag"] : [],
      maxSupportPieces: posture.simplicity === "strong" ? 2 : 4,
      silhouetteIntent: style.silhouettes.length ? style.silhouettes : ["balanced"],
      proportionIntent: ["balanced"], paletteIntent: style.palettes.length ? style.palettes : ["neutral"],
      materialIntent: style.materials,
      formalityBand: { minimum: posture.formalityRange.preferredFloor, maximum: posture.formalityRange.preferredCeiling },
      ceremonyCeiling: posture.ceremonyAllowance, effortBurden: posture.effortBudget,
      contextualReservations: [], personalPlausibilityReasons: memoryFoundations.includes(foundation)
        ? ["confirmed-worn-pattern"] : style.preferredFoundations.includes(foundation)
          ? ["explicit-profile-alignment"] : ["wardrobe-composition-alignment"],
      activeCorrections: brief.activeCorrections, activeSuppressions: brief.activeSuppressions,
      uncertainty: posture.criticalUnknowns, confidence: memoryFoundations.includes(foundation) || style.preferredFoundations.includes(foundation) ? "high" : "medium",
    };
  });
}

function foundationMatches(direction: PersonalOutfitDirection, garment: WardrobeGarment) {
  if (direction.foundationConcept === "dress") return garment.role === "dress";
  if (direction.foundationConcept === "jumpsuit") return garment.role === "jumpsuit";
  if (direction.foundationConcept === "coordinated-set") return garment.role === "coordinated-set";
  return garment.role === "top" || garment.role === "bottom";
}

function garmentHardReasons(
  garment: WardrobeGarment,
  direction: PersonalOutfitDirection,
  posture: DressingPosture,
  style: StyleProfileProjection,
  brief: CustomerDressingBrief,
): ReasonCode[] {
  const reasons: ReasonCode[] = [];
  if (!garment.available) reasons.push("unavailable");
  if (garment.suppressed || direction.activeSuppressions.some((item) => item.active && item.itemId === garment.itemId)) reasons.push("suppressed");
  if (direction.prohibitedRoles.includes(garment.role)) reasons.push("explicitly-prohibited");
  if (brief.explicitItemInstructions.some((instruction) =>
    instruction.itemId === garment.itemId && instruction.normalizedAction === "prohibit-item")) {
    reasons.push("explicitly-prohibited");
  }
  // Profile avoidances guide direction ranking. Only a current/durable customer
  // prohibition or active suppression may become a hard item veto.
  if (garment.formality && (formalityOrdinal(garment.formality) < formalityOrdinal(direction.formalityBand.minimum)
    || formalityOrdinal(garment.formality) > formalityOrdinal(direction.formalityBand.maximum))) reasons.push("formality-conflict");
  if (posture.carryingPosture.secureStorage === "pocket-required" && ["dress", "jumpsuit", "bottom", "coordinated-set"].includes(garment.role) && garment.securePockets !== true) reasons.push("carrying-conflict");
  if (garment.role === "shoes" && posture.footwearRequirements.some((item) => item.kind === "walking" && item.value === "sustained")
    && garment.walkability !== "high") reasons.push("footwear-conflict");
  const prohibitedGenres = posture.overdoneGenres
    .filter((predicate) => predicate.operator === "avoid")
    .map((predicate) => predicate.value);
  if (garment.genres.some((genre) => prohibitedGenres.includes(genre))) reasons.push("ceremony-conflict");
  const avoidedMaterials = posture.materialDirection
    .filter((predicate) => predicate.operator === "avoid")
    .map((predicate) => predicate.value);
  if (garment.materials.some((material) => avoidedMaterials.includes(material))) reasons.push("material-conflict");
  const descriptorText = `${garment.name} ${garment.descriptors.join(" ")}`.toLowerCase();
  if (garment.role === "shoes" && posture.footwearRequirements.some((item) =>
    item.kind === "heel-height" && item.operator === "at-most" && item.value === "flat")
    && /\b(pump|stiletto|high[- ]?heel|court shoe)\b/.test(descriptorText)) reasons.push("footwear-conflict");
  return uniq(reasons);
}

export function retrieveGarmentsForDirections(input: {
  directions: PersonalOutfitDirection[]; posture: DressingPosture; brief: CustomerDressingBrief;
  style: StyleProfileProjection;
  memory: PersonalOutfitMemorySnapshot; wardrobe: WardrobeGarment[];
}): DirectionRetrieval[] {
  if (input.wardrobe.some((item) => item.ownerUserId !== input.posture.ownerUserId)
    || input.memory.ownerUserId !== input.posture.ownerUserId
    || input.brief.ownerUserId !== input.posture.ownerUserId) throw new Error("Wardrobe owner mismatch");
  const confirmedItemIds = new Set(input.memory.confirmedCombinations.flatMap((item) => item.itemIds));
  const rejectedItemSets = input.memory.rejectedCombinations.map((item) => new Set(item.itemIds));
  const rank = (item: WardrobeGarment) =>
    (input.style.preferredItemIds.includes(item.itemId) ? 4 : 0)
    + (confirmedItemIds.has(item.itemId) ? 2 : 0)
    - (input.style.avoidedItemIds.includes(item.itemId) ? 10 : 0);
  return input.directions.map((direction) => {
    const accepted = input.wardrobe
      .filter((item) => garmentHardReasons(item, direction, input.posture, input.style, input.brief).length === 0)
      .sort((a, b) => rank(b) - rank(a));
    const foundations = accepted.filter((item) => foundationMatches(direction, item));
    let foundationCandidates: WardrobeGarment[][] = [];
    if (direction.foundationConcept === "top-bottom") {
      const tops = foundations.filter((item) => item.role === "top");
      const bottoms = foundations.filter((item) => item.role === "bottom");
      const acceptedById = new Map(foundations.map((item) => [item.itemId, item]));
      const rememberedPairs = input.memory.confirmedCombinations.flatMap((combination) => {
        const items = combination.itemIds
          .map((itemId) => acceptedById.get(itemId))
          .filter((item): item is WardrobeGarment => Boolean(item));
        const top = items.find((item) => item.role === "top");
        const bottom = items.find((item) => item.role === "bottom");
        return top && bottom ? [[top, bottom]] : [];
      });
      const directedPairs = Array.from(
        { length: Math.min(Math.max(tops.length, bottoms.length), 6) },
        (_, index) => {
          const top = tops[index % Math.max(tops.length, 1)];
          const bottom = bottoms[index % Math.max(bottoms.length, 1)];
          return top && bottom ? [top, bottom] : null;
        },
      ).filter((items): items is WardrobeGarment[] => Boolean(items));
      const seen = new Set<string>();
      foundationCandidates = [...rememberedPairs, ...directedPairs]
        .filter((items) => !rejectedItemSets.some((rejected) => items.every((item) => rejected.has(item.itemId))))
        .filter((items) => {
          const signature = items.map((item) => item.itemId).sort().join(":");
          if (seen.has(signature)) return false;
          seen.add(signature);
          return true;
        });
    } else foundationCandidates = foundations.map((item) => [item]);
    const supports: DirectionRetrieval["supportCandidates"] = {};
    for (const role of ["shoes", "outer-layer", "bag", "accessory", "jewelry", "fragrance"] as GarmentRole[]) {
      supports[role] = accepted.filter((item) => item.role === role);
    }
    return {
      direction, foundationCandidates, supportCandidates: supports,
      rejectionReasons: input.wardrobe.flatMap((item) => {
        const reasonCodes = garmentHardReasons(item, direction, input.posture, input.style, input.brief);
        return reasonCodes.length ? [{ itemId: item.itemId, reasonCodes }] : [];
      }),
    };
  });
}

export function composeRestrainedLooks(input: {
  retrievals: DirectionRetrieval[]; generatedAt: string; maximumPerDirection?: number;
}): CandidateLook[] {
  const looks: CandidateLook[] = [];
  const usedFoundationSignatures = new Set<string>();
  const usedShoes = new Set<string>();
  for (const retrieval of input.retrievals) {
    const shoes = retrieval.supportCandidates.shoes ?? [];
    for (const [index, foundation] of retrieval.foundationCandidates.slice(0, input.maximumPerDirection ?? 3).entries()) {
      if (!shoes.length) continue;
      const foundationSignature = foundation.map((item) => item.itemId).sort().join(":");
      if (usedFoundationSignatures.has(foundationSignature)) continue;
      const shoe = shoes.find((item) => !usedShoes.has(item.itemId)) ?? shoes[index % shoes.length];
      const requiredBag = retrieval.direction.requiredRoles.includes("bag");
      const bag = requiredBag ? retrieval.supportCandidates.bag?.[0] : undefined;
      if (requiredBag && !bag) continue;
      const items = [...foundation, shoe, ...(bag ? [bag] : [])];
      const evidenceRefs = uniq(items.flatMap((item) => item.evidenceRefs));
      looks.push({
        schemaVersion: CANDIDATE_LOOK_VERSION, taxonomyVersion: RECOMMENDATION_V2_TAXONOMY_VERSION,
        artifactId: `${retrieval.direction.artifactId}:look:${index + 1}`, artifactRevision: "1",
        requestId: retrieval.direction.requestId, ownerUserId: retrieval.direction.ownerUserId,
        generatedAt: input.generatedAt, directionRef: artifactRef(retrieval.direction), items,
        omittedOptionalRoles: ["outer-layer", "bag", "accessory", "jewelry", "fragrance"].filter((role) => !items.some((item) => item.role === role)) as GarmentRole[],
        evidenceRefs,
        diagnostics: { cohesion: 0, personalPolish: 0, burden: items.length, confidence: evidenceRefs.length ? "medium" : "low" },
      });
      usedFoundationSignatures.add(foundationSignature);
      usedShoes.add(shoe.itemId);
    }
  }
  return looks;
}

export function hardValidateLook(input: {
  look: CandidateLook; direction: PersonalOutfitDirection; posture: DressingPosture;
  eventPolicy: NarrowEventPolicyResult; brief: CustomerDressingBrief; style: StyleProfileProjection;
}): HardValidationResult {
  const { look, direction, posture } = input;
  const roles = look.items.map((item) => item.role);
  const foundationValid = direction.foundationConcept === "top-bottom"
    ? roles.filter((role) => role === "top").length === 1 && roles.filter((role) => role === "bottom").length === 1
    : roles.filter((role) => role === direction.foundationConcept).length === 1;
  const primaryRoles: GarmentRole[] = ["dress", "jumpsuit", "coordinated-set", "top", "bottom"];
  const noContradiction = !(roles.includes("dress") && (roles.includes("top") || roles.includes("bottom") || roles.includes("jumpsuit") || roles.includes("coordinated-set")))
    && !(roles.includes("jumpsuit") && roles.some((role) => ["dress", "top", "bottom", "coordinated-set"].includes(role)))
    && !(roles.includes("coordinated-set") && roles.some((role) => ["dress", "jumpsuit", "top", "bottom"].includes(role)))
    && roles.filter((role) => role === "top").length <= 1
    && roles.filter((role) => role === "bottom").length <= 1
    && roles.filter((role) => role === "shoes").length <= 1
    && primaryRoles.every((role) => roles.filter((candidate) => candidate === role).length <= 1)
    && new Set(look.items.map((item) => item.itemId)).size === look.items.length;
  const completeness = foundationValid && noContradiction && direction.requiredRoles.every((role) => roles.includes(role));
  const ownership = look.items.every((item) => item.ownerUserId === look.ownerUserId && item.available);
  const suppression = look.items.every((item) => !item.suppressed && !direction.activeSuppressions.some((state) => state.active && state.itemId === item.itemId));
  const itemHardReasons = look.items.flatMap((item) =>
    garmentHardReasons(item, direction, posture, input.style, input.brief));
  const eventPolicy = !input.eventPolicy.prohibitedRoles.some((role) => roles.includes(role))
    && itemHardReasons.length === 0;
  const brief = !(posture.carryingPosture.secureStorage === "pocket-required"
    && !look.items.some((item) => ["dress", "jumpsuit", "bottom", "coordinated-set"].includes(item.role) && item.securePockets === true));
  const checks: HardValidationResult["checks"] = [
    { check: "ownership-availability", passed: ownership, reasonCodes: ownership ? ["approved"] : ["unavailable"], evidenceRefs: look.evidenceRefs },
    { check: "event-policy", passed: eventPolicy, reasonCodes: eventPolicy ? ["approved"] : uniq(itemHardReasons.length ? itemHardReasons : ["venue-rule-conflict"]), evidenceRefs: input.eventPolicy.evidenceRefs },
    { check: "brief-compliance", passed: brief, reasonCodes: brief ? ["approved"] : ["carrying-conflict"], evidenceRefs: posture.evidenceRefs },
    { check: "suppression", passed: suppression, reasonCodes: suppression ? ["approved"] : ["suppressed"], evidenceRefs: look.evidenceRefs },
    { check: "outfit-completeness", passed: completeness, reasonCodes: completeness ? ["approved"] : ["incomplete-outfit"], evidenceRefs: look.evidenceRefs },
  ];
  return { look, passed: checks.every((check) => check.passed), checks };
}

export type ComparativeJudgment = {
  lookId: string;
  comparativeRank: number;
  reality: "pass" | "fail";
  personalPlausibility: "pass" | "fail";
  effort: "pass" | "fail";
  coherence: "pass" | "fail";
  restraint: "pass" | "fail";
  editorial: "pass" | "fail";
  decisiveReasonCodes: ReasonCode[];
};

export type AdjudicationOutcome =
  | { outcome: "recommend"; selected: CandidateLook; challenger: CandidateLook | null; adjudicatorVersion: typeof STYLIST_ADJUDICATOR_VERSION; judgments: ComparativeJudgment[] }
  | { outcome: "revise-composition"; look: CandidateLook; reasonCodes: ReasonCode[]; adjudicatorVersion: typeof STYLIST_ADJUDICATOR_VERSION }
  | { outcome: "ask-one-question"; question: string; adjudicatorVersion: typeof STYLIST_ADJUDICATOR_VERSION }
  | { outcome: "abstain"; reasonCodes: ReasonCode[]; adjudicatorVersion: typeof STYLIST_ADJUDICATOR_VERSION };

export function adjudicateValidatedLooks(input: {
  validated: HardValidationResult[];
  judgments: ComparativeJudgment[];
  consequentialQuestion?: string | null;
}): AdjudicationOutcome {
  const valid = input.validated.filter((item) => item.passed);
  const approved = valid.filter(({ look }) => {
    const judgment = input.judgments.find((item) => item.lookId === look.artifactId);
    return judgment && ["reality", "personalPlausibility", "effort", "coherence", "restraint", "editorial"]
      .every((key) => judgment[key as keyof ComparativeJudgment] === "pass");
  }).sort((a, b) => {
    const rankA = input.judgments.find((item) => item.lookId === a.look.artifactId)?.comparativeRank ?? Number.MAX_SAFE_INTEGER;
    const rankB = input.judgments.find((item) => item.lookId === b.look.artifactId)?.comparativeRank ?? Number.MAX_SAFE_INTEGER;
    return rankA - rankB;
  });
  if (approved.length) {
    const selected = approved[0].look;
    const challenger = approved.slice(1)
      .map((entry) => entry.look)
      .find((look) => materiallyDistinctFoundations(selected, look)) ?? null;
    return {
      outcome: "recommend", selected, challenger,
      adjudicatorVersion: STYLIST_ADJUDICATOR_VERSION, judgments: input.judgments,
    };
  }
  if (input.consequentialQuestion) return { outcome: "ask-one-question", question: input.consequentialQuestion, adjudicatorVersion: STYLIST_ADJUDICATOR_VERSION };
  if (valid.length) {
    const judgment = input.judgments.find((item) => item.lookId === valid[0].look.artifactId);
    return { outcome: "revise-composition", look: valid[0].look, reasonCodes: judgment?.decisiveReasonCodes ?? ["editorial-rejection"], adjudicatorVersion: STYLIST_ADJUDICATOR_VERSION };
  }
  return { outcome: "abstain", reasonCodes: ["incomplete-outfit"], adjudicatorVersion: STYLIST_ADJUDICATOR_VERSION };
}

export const V2_RECOMMENDATION_PIPELINE_ORDER = [
  "customer-dressing-brief", "event-policy", "dressing-posture", "personal-outfit-memory",
  "personal-outfit-directions", "direction-led-retrieval", "restrained-composition",
  "hard-validation", "stylist-adjudication", "consultation",
] as const;

export function assertPipelineOrder(observed: readonly string[]) {
  let last = -1;
  for (const stage of observed) {
    const index = V2_RECOMMENDATION_PIPELINE_ORDER.indexOf(stage as typeof V2_RECOMMENDATION_PIPELINE_ORDER[number]);
    if (index < 0 || index < last) throw new Error(`Invalid V2 pipeline order at ${stage}`);
    last = index;
  }
  if (!observed.includes("dressing-posture")) throw new Error("Dressing Posture is required");
  const retrieval = observed.indexOf("direction-led-retrieval");
  if (retrieval >= 0 && observed.indexOf("dressing-posture") > retrieval) throw new Error("Garment retrieval cannot precede Dressing Posture");
}

void CHECK_DEFINITIONS;
void STYLIST_ADJUDICATION_VERSION;
