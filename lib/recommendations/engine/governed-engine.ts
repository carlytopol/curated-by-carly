import { wardrobeItemLabel } from "@/lib/wardrobe/item-label";
import { containsIncompatiblePair, type IncompatibleWardrobePair } from "../pair-preferences";
import {
  auditItemEligibility,
  buildEventPolicy,
  validateOutfitAgainstEventPolicy,
} from "./event-policy";
import {
  classifyWardrobeRole,
  classifyWardrobeTraits as traits,
  type NormalizedWardrobeRole as Role,
} from "./item-taxonomy";
import {
  assessPersonalStyle,
  buildWardrobeEvidenceSummary,
  interpretPersonalStyle,
  itemStyleEligibility,
  resolveStyleProfile,
  type PersonalStylingBrief,
  type StyleProfileSnapshot,
  type WardrobeEvidenceInput,
} from "./style-profile";
import type {
  ContextEvidence,
  CompleteOutfit,
  CandidateDecisionTrace,
  EngineWardrobeItem,
  GovernedOutfit,
  GovernedRecommendationResult,
  OutfitAssessment,
  OutfitFactor,
} from "./types";
import { postureItemPriority } from "./dressing-posture";

const WEIGHTS: Record<OutfitFactor, number> = {
  occasion: 18, weather: 15, comfort: 14, cohesion: 13, completeness: 13,
  intent: 12, fit: 10, color: 7, polish: 12, rotation: 5, utility: 3,
};

function hasAuthoritativeUserExclusion(item: EngineWardrobeItem) {
  if (!item.analysis_metadata || typeof item.analysis_metadata !== "object") return false;
  const metadata = item.analysis_metadata as Record<string, unknown>;
  const correction = metadata.userCorrection ?? metadata.user_correction;
  if (!correction || typeof correction !== "object") return false;
  const value = correction as Record<string, unknown>;
  return value.excludeFromRecommendations === true ||
    value.exclude_from_recommendations === true ||
    value.eligible === false;
}

export { classifyWardrobeRole } from "./item-taxonomy";

function targetFormality(context: ContextEvidence) {
  return context.dressingPosture.formalityTarget;
}

function effectiveHeat(context: ContextEvidence) {
  return Math.max(
    context.weather.temperature.value ?? -Infinity,
    context.weather.feelsLike.value ?? -Infinity,
    context.weather.high.value ?? -Infinity,
  );
}

function usesPantsFoundation(outfit: CompleteOutfit) {
  if (outfit.foundation.kind === "dress-or-jumpsuit") return false;
  const bottom = traits(outfit.foundation.bottom);
  return /\b(pants?|trousers?|jeans?|leggings?|capris?|culottes?)\b/.test(bottom.text);
}

function hardReject(items: EngineWardrobeItem[], context: ContextEvidence, pairs: IncompatibleWardrobePair[]) {
  const reasons: string[] = [];
  const itemTraits = items.map(traits);
  const roles = itemTraits.map((value) => value.role);
  const topCount = roles.filter((value) => value === "top").length;
  const bottomCount = roles.filter((value) => value === "bottom").length;
  const onePieceCount = roles.filter((value) => value === "one-piece").length;
  const validFoundation =
    (onePieceCount === 1 && topCount === 0 && bottomCount === 0) ||
    (onePieceCount === 0 && topCount === 1 && bottomCount === 1);
  if (!validFoundation) reasons.push("invalid-foundation-structure");
  if (!roles.includes("shoes")) reasons.push("missing-shoes");
  if (containsIncompatiblePair(items.map((item) => item.id), pairs)) reasons.push("user-incompatible-pair");
  if (new Set(items.map((item) => item.id)).size !== items.length) reasons.push("duplicate-item");
  if (context.bagAllowed.value === false && roles.includes("bag")) reasons.push("bag-not-allowed");
  if (context.pocketsRequired.value === true) {
    const foundation = itemTraits.filter((value) => ["top", "bottom", "one-piece"].includes(value.role));
    if (!foundation.some((value) => value.pockets === true)) {
      reasons.push("pockets-required");
    }
  }
  const heat = effectiveHeat(context);
  const matrix = context.constraintMatrix;
  if (Number.isFinite(heat) && heat >= 82 && itemTraits.some((value) => (value.warmth ?? 0) >= 4)) reasons.push("too-warm");
  if (matrix.heatSeverity === "extreme" && itemTraits.some((value) => value.longSleeve)) reasons.push("extreme-heat-long-sleeve");
  if (matrix.heatSeverity === "extreme" && itemTraits.some((value) => value.suedeFootwear || value.boots)) reasons.push("extreme-heat-footwear");
  if (Number.isFinite(heat) && heat <= 45 && itemTraits.some((value) => value.role !== "fragrance" && value.warmth === 1)) reasons.push("too-cold");
  if ((context.weather.precipitationChance.value ?? 0) >= 55 && itemTraits.some((value) => /\b(suede|satin|silk|open toe)\b/.test(value.text))) reasons.push("rain-sensitive");
  if (context.walking.value === "high" && itemTraits.some((value) => value.role === "shoes" && (value.walkability ?? 3) <= 1)) reasons.push("not-walkable");
  const scenario = `${context.agendaItem.title} ${context.venue.value ?? ""} ${context.userNotes.value ?? ""}`.toLowerCase();
  const stadium = /\b(stadium|ballpark|truist park|arena concert)\b/.test(scenario);
  if (stadium && itemTraits.some((value) =>
    value.role === "shoes" &&
    /\b(stilettos?|pumps?|court shoes?|high heels?|kitten heels?|metallic strappy|t-strap|delicate|formal shoes?)\b/.test(value.text)
  )) reasons.push("stadium-footwear");
  if (stadium && itemTraits.some((value) =>
    ["top", "bottom", "one-piece"].includes(value.role) &&
    /\b(formal satin|evening satin|ball gown|cocktail dress)\b/.test(value.text)
  )) reasons.push("stadium-formality");
  if (stadium && matrix.heatSeverity === "extreme" && itemTraits.some((value) =>
    value.role === "shoes" && (value.boots || value.suedeFootwear)
  )) reasons.push("hot-stadium-footwear");
  const foundation = itemTraits.filter((value) => ["top", "bottom", "one-piece"].includes(value.role));
  if (foundation.filter((value) => value.blueDenim).length > 1) reasons.push("double-blue-denim");
  if (foundation.filter((value) => value.pattern === "statement").length > 1) reasons.push("competing-statements");
  const formalities = foundation.map((value) => value.formality).filter((value): value is number => value != null);
  if (formalities.length > 1 && Math.max(...formalities) - Math.min(...formalities) >= 2) reasons.push("formality-conflict");
  const target = targetFormality(context);
  if (target != null && formalities.some((value) => Math.abs(value - target) >= 3)) reasons.push("occasion-mismatch");
  if (formalities.some((value) => value > context.dressingPosture.formalityCeiling)) {
    reasons.push("above-formality-ceiling");
  }
  const allText = foundation.map((value) => value.text).join(" ");
  const waterOccasion = /\b(beach|pool|swim|cabana)\b/i.test(`${context.agendaItem.title} ${context.userNotes.value || ""}`);
  if (!waterOccasion && /\b(cover.?up|swim cover|bathing|kaftan)\b/.test(allText)) reasons.push("swim-only-item");
  const hardCodes = new Set(matrix.hard.map((entry) => entry.code));
  if (hardCodes.has("user-no-jeans") && itemTraits.some((value) => value.jeans)) reasons.push("user-no-jeans");
  if (hardCodes.has("user-no-long-sleeves") && itemTraits.some((value) => value.longSleeve)) reasons.push("user-no-long-sleeves");
  if (hardCodes.has("user-no-slides") && itemTraits.some((value) => /\bslide\b/.test(value.text))) reasons.push("user-no-slides");
  if (hardCodes.has("user-no-boots") && itemTraits.some((value) => value.boots)) reasons.push("user-no-boots");
  const requestedPolish = matrix.requestedPolish;
  const shoe = itemTraits.find((value) => value.role === "shoes");
  if ((requestedPolish === "polished" || requestedPolish === "polished-casual") && shoe?.casualSlides) {
    reasons.push("insufficient-whole-outfit-polish");
  }
  const strongSoftViolations = [
    matrix.heatSeverity === "extreme" && itemTraits.some((value) => value.jeans),
    (requestedPolish === "polished" || requestedPolish === "polished-casual") && (shoe?.polish ?? 3) < 3,
  ].filter(Boolean).length;
  if (strongSoftViolations >= 2) reasons.push("contextual-stylist-veto");
  return reasons;
}

/**
 * Final Editorial Validation is deliberately a veto, not a scoring adjustment.
 * No attractive supporting piece can compensate for an invalid foundation.
 */
function assembleAndValidateStructure(
  outfit: CompleteOutfit,
  context: ContextEvidence,
  pairs: IncompatibleWardrobePair[],
) {
  const foundationItems = outfit.foundation.kind === "dress-or-jumpsuit"
    ? [outfit.foundation.onePiece]
    : [outfit.foundation.top, outfit.foundation.bottom];
  const items = [
    ...foundationItems,
    outfit.shoes,
    ...(outfit.bag ? [outfit.bag] : []),
    ...(outfit.outerLayer ? [outfit.outerLayer] : []),
    ...outfit.jewelry,
    ...(outfit.fragrance ? [outfit.fragrance] : []),
  ];
  return { items, rejectionReasons: hardReject(items, context, pairs) };
}

function editorialStyleValidate(
  personalStyle: ReturnType<typeof assessPersonalStyle>,
  stylingBrief: PersonalStylingBrief,
) {
  const rejectionReasons = [...personalStyle.rejectionReasons];
  if (!stylingBrief.neutral && personalStyle.cohesionScore != null && personalStyle.cohesionScore < 40) {
    rejectionReasons.push("editorial-style-cohesion");
  }
  if (
    !stylingBrief.neutral &&
    stylingBrief.desiredPolish !== "neutral" &&
    personalStyle.personalPolishScore != null &&
    personalStyle.personalPolishScore < 35
  ) {
    rejectionReasons.push("editorial-personal-polish");
  }
  return { briefVersion: stylingBrief.schemaVersion, rejectionReasons };
}

function templateForRoles(roles: Role[]) {
  const tops = roles.filter((value) => value === "top").length;
  const bottoms = roles.filter((value) => value === "bottom").length;
  const onePieces = roles.filter((value) => value === "one-piece").length;
  if (onePieces === 1 && tops === 0 && bottoms === 0) return "dress-or-jumpsuit" as const;
  if (onePieces === 0 && tops === 1 && bottoms === 1) return "separates" as const;
  return "invalid" as const;
}

export function traceOutfitValidation(
  items: EngineWardrobeItem[],
  context: ContextEvidence,
  pairs: IncompatibleWardrobePair[] = [],
): CandidateDecisionTrace {
  const normalizedRoles = items.map((item) => ({
    itemId: item.id,
    label: wardrobeItemLabel(item),
    role: classifyWardrobeRole(item),
  }));
  const roles = normalizedRoles.map((entry) => entry.role as Role);
  const rejectionReasons = hardReject(items, context, pairs);
  const structural = templateForRoles(roles);
  const hardRules = [
    {
      rule: "valid-foundation-template",
      passed: structural !== "invalid",
      detail: structural === "invalid" ? "Foundation is not exactly DRESS/JUMPSUIT or TOP + BOTTOM." : structural,
    },
    {
      rule: "context-constraint-matrix",
      passed: !rejectionReasons.some((reason) => [
        "extreme-heat-long-sleeve", "extreme-heat-footwear", "hot-stadium-footwear",
        "user-no-jeans", "user-no-long-sleeves", "user-no-slides", "user-no-boots",
      ].includes(reason)),
      detail: `Heat ${context.constraintMatrix.heatSeverity}; ${context.constraintMatrix.hard.length} hard and ${context.constraintMatrix.strongSoft.length} strong-soft constraint(s).`,
    },
    {
      rule: "contextual-stylist-review",
      passed: !rejectionReasons.includes("contextual-stylist-veto") && !rejectionReasons.includes("insufficient-whole-outfit-polish"),
      detail: rejectionReasons.includes("contextual-stylist-veto") || rejectionReasons.includes("insufficient-whole-outfit-polish")
        ? "An experienced personal stylist would not confidently send this complete look to the exact event."
        : "The complete look meets the requested context and polish.",
    },
    {
      rule: "single-role-assignments",
      passed: !rejectionReasons.includes("invalid-foundation-structure"),
      detail: rejectionReasons.includes("invalid-foundation-structure") ? "Duplicate or conflicting primary roles." : "Primary roles are exact.",
    },
    {
      rule: "footwear-required",
      passed: roles.filter((role) => role === "shoes").length === 1,
      detail: `Found ${roles.filter((role) => role === "shoes").length} footwear item(s).`,
    },
    {
      rule: "verified-pockets",
      passed: !rejectionReasons.includes("pockets-required"),
      detail: rejectionReasons.includes("pockets-required") ? "Pocket status is absent or explicitly false." : "Pocket requirement satisfied or not required.",
    },
    {
      rule: "stadium-footwear",
      passed: !rejectionReasons.includes("stadium-footwear") && !rejectionReasons.includes("not-walkable"),
      detail: rejectionReasons.includes("stadium-footwear") || rejectionReasons.includes("not-walkable") ? "Footwear is not stadium/walking eligible." : "Footwear is context eligible.",
    },
  ];
  return {
    candidateItemIds: items.map((item) => item.id),
    normalizedRoles,
    selectedTemplate: structural,
    hardRules,
    finalScore: null,
    approved: rejectionReasons.length === 0,
    rejectionReasons,
  };
}

function average(values: Array<number | null | undefined>) {
  const known = values.filter((value): value is number => value != null && Number.isFinite(value));
  return known.length ? known.reduce((sum, value) => sum + value, 0) / known.length : null;
}

function assess(items: EngineWardrobeItem[], context: ContextEvidence, pairs: IncompatibleWardrobePair[]): OutfitAssessment {
  const rejectionReasons = hardReject(items, context, pairs);
  const values = items.map(traits);
  const target = targetFormality(context);
  const foundation = values.filter((value) => ["top", "bottom", "one-piece"].includes(value.role));
  const formalityAverage = average(foundation.map((value) => value.formality));
  const heat = effectiveHeat(context);
  const warmthAverage = average(values.filter((value) => value.role !== "fragrance").map((value) => value.warmth));
  const shoe = values.find((value) => value.role === "shoes");
  const factorScores: OutfitAssessment["factorScores"] = {
    occasion: target != null && formalityAverage != null ? Math.max(0, 100 - Math.abs(target - formalityAverage) * 28) : null,
    weather: Number.isFinite(heat) && warmthAverage != null
      ? heat >= 82 ? Math.max(0, 110 - warmthAverage * 24) : heat <= 45 ? Math.min(100, warmthAverage * 22) : 85
      : null,
    comfort: context.walking.value ? (shoe?.walkability != null ? shoe.walkability * 20 : 55) : null,
    cohesion: rejectionReasons.some((reason) => ["formality-conflict", "competing-statements", "double-blue-denim"].includes(reason)) ? 0 : 88,
    completeness: rejectionReasons.some((reason) => reason.startsWith("missing") || reason === "invalid-foundation-structure") ? 0 : 100,
    intent: context.intention.value ? 82 : null,
    fit: null,
    color: foundation.filter((value) => value.pattern === "statement").length <= 1 ? 82 : 20,
    polish: shoe?.polish != null
      ? Math.min(100, shoe.polish * 20 + (rejectionReasons.includes("formality-conflict") ? 0 : 10))
      : null,
    rotation: average(items.filter((item) => ["top", "bottom", "one-piece"].includes(classifyWardrobeRole(item))).map((item) => Math.min(100, Math.max(0, (item.rotationScore ?? 50))))),
    utility: context.pocketsRequired.value ? (values.some((value) => value.pockets) ? 100 : 0) : 80,
  };
  const known = Object.entries(factorScores).filter((entry): entry is [OutfitFactor, number] => entry[1] != null);
  const knownWeight = known.reduce((sum, [factor]) => sum + WEIGHTS[factor], 0);
  const score = knownWeight
    ? Math.round(known.reduce((sum, [factor, value]) => sum + value * WEIGHTS[factor], 0) / knownWeight)
    : 0;
  const sparseFoundation = foundation.some((value) => value.formality == null || value.warmth == null);
  const confidence = sparseFoundation
    ? "low"
    : knownWeight >= 80 && context.unknowns.length <= 1
      ? "high"
      : knownWeight >= 55 ? "medium" : "low";
  return {
    valid: rejectionReasons.length === 0,
    score,
    confidence,
    factorScores,
    rejectionReasons,
    reasonCodes: known.sort((a, b) => WEIGHTS[b[0]] - WEIGHTS[a[0]]).slice(0, 4).map(([factor]) => factor),
  };
}

function bestSupport(
  candidates: EngineWardrobeItem[],
  foundation: EngineWardrobeItem[],
  context: ContextEvidence,
  pairs: IncompatibleWardrobePair[],
) {
  return candidates
    .map((item) => ({ item, assessment: assess([...foundation, item], context, pairs) }))
    .filter(({ assessment }) => !assessment.rejectionReasons.some((reason) => !["missing-shoes"].includes(reason)))
    .sort((left, right) => right.assessment.score - left.assessment.score)[0]?.item ?? null;
}

function explanation(
  items: EngineWardrobeItem[],
  context: ContextEvidence,
  stylingBrief: PersonalStylingBrief,
) {
  const labels = items.map((item) => wardrobeItemLabel({ designer: item.designer, item_name: item.item_name, category: item.category }));
  const list = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
  const reasons: string[] = [];
  const heat = effectiveHeat(context);
  if (Number.isFinite(heat)) reasons.push(heat >= 82 ? "keeps the silhouette light for the heat" : heat <= 45 ? "provides considered warmth" : "suits the forecast");
  if (context.walking.value === "high") reasons.push("supports a walking-heavy day");
  if (context.bagAllowed.value === false) {
    reasons.push("leaves out a bag because the venue or your instructions do not permit one");
  }
  if (context.pocketsRequired.value === true) {
    const foundation = items.map(traits).filter((value) => ["top", "bottom", "one-piece"].includes(value.role));
    reasons.push(foundation.some((value) => value.pockets === true)
      ? "keeps essentials practical with confirmed pockets"
      : "uses the strongest available foundation, though you should confirm its pockets");
  }
  if (context.statedDressCode.value) reasons.push(`answers the ${context.statedDressCode.value} expectation`);
  if (stylingBrief.desiredPolish !== "neutral") {
    reasons.push(`keeps the complete look ${stylingBrief.desiredPolish.replace("-", " ")}`);
  }
  const because = reasons.length ? reasons.slice(0, 4).join(", ") : "balances the occasion, comfort, and wardrobe rotation";
  return `Wear ${list}. The complete look ${because}.`;
}

export function generateGovernedRecommendations(input: {
  wardrobe: EngineWardrobeItem[];
  context: ContextEvidence;
  userId?: string;
  styleProfile?: StyleProfileSnapshot;
  styleEvidence?: Omit<WardrobeEvidenceInput, "userId" | "wardrobe">;
  incompatiblePairs?: IncompatibleWardrobePair[];
  optionCount?: number;
  eventPolicyEnabled?: boolean;
}): GovernedRecommendationResult {
  // Resolve and interpret once per request. The resulting immutable brief is
  // carried through eligibility, whole-outfit cohesion, editorial review, and
  // explanation; Event Policy remains the higher-authority boundary.
  const styleProfile = resolveStyleProfile(input.styleProfile, input.userId);
  const wardrobeEvidence = buildWardrobeEvidenceSummary(
    input.userId && styleProfile.ownerUserId ? {
      userId: input.userId,
      wardrobe: input.wardrobe,
      ...input.styleEvidence,
    } : undefined,
    styleProfile,
  );
  const stylingBrief = interpretPersonalStyle(styleProfile, input.context, wardrobeEvidence);
  const pairs = input.incompatiblePairs ?? [];
  const eventPolicyEnabled = input.eventPolicyEnabled ?? true;
  const eventPolicy = buildEventPolicy(input.context);
  const eligibilityAudit = input.wardrobe.map((item) => {
    if ((item.availability_status ?? "available") !== "available") {
      return {
        ...auditItemEligibility(item, input.context, eventPolicy),
        eligible: false,
        rejectionReasons: ["unavailable"],
      };
    }
    if (hasAuthoritativeUserExclusion(item)) {
      return {
        ...auditItemEligibility(item, input.context, eventPolicy),
        eligible: false,
        rejectionReasons: ["authoritative-user-exclusion"],
      };
    }
    return auditItemEligibility(item, input.context, eventPolicy);
  });
  const auditById = new Map(eligibilityAudit.map((audit) => [audit.itemId, audit]));
  const eligible = input.wardrobe.filter((item) =>
    (item.availability_status ?? "available") === "available" &&
    !hasAuthoritativeUserExclusion(item) &&
    (!eventPolicyEnabled || auditById.get(item.id)?.eligible) &&
    itemStyleEligibility(item, stylingBrief).eligible
  );
  const byRole = (wanted: Role) => eligible
    .filter((item) => classifyWardrobeRole(item) === wanted)
    .sort((left, right) =>
      postureItemPriority(left, input.context.dressingPosture) -
      postureItemPriority(right, input.context.dressingPosture)
    );
  // Keep this interactive request bounded while preserving the wardrobe's
  // existing rotation and personal-style ordering.
  const MAX_ONE_PIECES = 16;
  const MAX_TOPS = 12;
  const MAX_BOTTOMS = 12;
  const MAX_SHOES = 12;
  const onePieceFoundations: CompleteOutfit["foundation"][] = byRole("one-piece")
    .slice(0, MAX_ONE_PIECES)
    .map((onePiece): CompleteOutfit["foundation"] => ({
      kind: "dress-or-jumpsuit", onePiece, top: null, bottom: null,
    }));
  const separateFoundations: CompleteOutfit["foundation"][] = byRole("top")
    .slice(0, MAX_TOPS)
    .flatMap((top) => byRole("bottom")
      .slice(0, MAX_BOTTOMS)
      .map((bottom): CompleteOutfit["foundation"] => ({
        kind: "separates", onePiece: null, top, bottom,
      })));
  // Preserve both outfit templates inside the bounded interactive search. A
  // large single category must not crowd all separates (or vice versa) out of
  // the request budget.
  const foundations = [...onePieceFoundations, ...separateFoundations];
  const candidates: GovernedOutfit[] = [];
  const diagnostics: CandidateDecisionTrace[] = [];
  let rejectedCandidateCount = 0;
  for (const foundation of foundations) {
    const foundationItems = foundation.kind === "dress-or-jumpsuit"
      ? [foundation.onePiece]
      : [foundation.top, foundation.bottom];
    const shoes = byRole("shoes").slice(0, MAX_SHOES);
    if (!shoes.length) {
      // Preserve observable evidence for candidates rejected before a complete
      // outfit can be assembled. Previously this early exit made production
      // failures look like an empty, unexplained result.
      diagnostics.push(traceOutfitValidation(foundationItems, input.context, pairs));
      rejectedCandidateCount += 1;
      continue;
    }
    // A complete foundation is evaluated against every eligible shoe. The
    // previous greedy single-shoe choice caused repeated footwear and hid
    // otherwise viable alternatives.
    for (const shoe of shoes) {
      const selected = [...foundationItems, shoe];
      let bag: EngineWardrobeItem | null = null;
      if (input.context.bagAllowed.value !== false) {
        bag = bestSupport(byRole("bag"), selected, input.context, pairs);
        if (!bag && byRole("bag").length) {
          rejectedCandidateCount += 1;
          continue;
        }
        if (bag) selected.push(bag);
      }
      // Fragrance is a finishing support piece, not a structural garment role,
      // but the Curated service standard includes it whenever one is eligible.
      const fragrance = bestSupport(byRole("fragrance"), selected, input.context, pairs);
      if (!fragrance && byRole("fragrance").length) {
        rejectedCandidateCount += 1;
        continue;
      }
      if (fragrance) selected.push(fragrance);
      const composition: CompleteOutfit = {
        foundation,
        shoes: shoe,
        bag,
        outerLayer: null,
        jewelry: [],
        fragrance,
      };
      const editorial = assembleAndValidateStructure(composition, input.context, pairs);
      const policyReview = eventPolicyEnabled
        ? validateOutfitAgainstEventPolicy(composition, input.context, eventPolicy)
        : { valid: true, rejectionReasons: [] };
      const trace = traceOutfitValidation(editorial.items, input.context, pairs);
      const assessment = assess(editorial.items, input.context, pairs);
      const personalStyle = assessPersonalStyle(editorial.items, stylingBrief);
      const editorialStyle = editorialStyleValidate(personalStyle, stylingBrief);
      const rejectionReasons = [...new Set([
        ...assessment.rejectionReasons,
        ...policyReview.rejectionReasons,
        ...editorialStyle.rejectionReasons,
      ])];
      const valid = assessment.valid && policyReview.valid && editorialStyle.rejectionReasons.length === 0;
      const governedScore = assessment.score + personalStyle.score;
      trace.finalScore = governedScore;
      trace.approved = valid;
      trace.rejectionReasons = rejectionReasons;
      // Keep diagnostics observable without serializing an unbounded Cartesian
      // product in every request log.
      if (!valid && diagnostics.length < 120) diagnostics.push(trace);
      if (!valid) { rejectedCandidateCount += 1; continue; }
      diagnostics.push(trace);
      candidates.push({
        itemIds: editorial.items.map((item) => item.id),
        composition,
        assessment: { ...assessment, score: governedScore, valid, rejectionReasons },
        summary: targetFormality(input.context) && targetFormality(input.context)! >= 4 ? "Considered occasion polish" : "A complete, context-led edit",
        rationale: explanation(selected, input.context, stylingBrief),
        personalStyle,
        stylingBriefVersion: stylingBrief.schemaVersion,
      });
    }
  }
  candidates.sort((left, right) => right.assessment.score - left.assessment.score);
  const options: GovernedOutfit[] = [];
  const usedMain = new Set<string>();
  const usedShoes = new Set<string>();
  const hotOutdoorSet = ["hot", "extreme"].includes(input.context.constraintMatrix.heatSeverity) &&
    input.context.setting.value !== "indoor";
  let pantsOptionUsed = false;
  for (const candidate of candidates) {
    const mainIds = candidate.itemIds.filter((id) => {
      const item = eligible.find((entry) => entry.id === id);
      return item && ["top", "bottom", "one-piece"].includes(classifyWardrobeRole(item));
    });
    if (mainIds.some((id) => usedMain.has(id))) continue;
    if (eventPolicyEnabled && eventPolicy.requireDistinctFootwear && usedShoes.has(candidate.composition.shoes.id)) continue;
    const candidateUsesPants = usesPantsFoundation(candidate.composition);
    if (hotOutdoorSet && candidateUsesPants && pantsOptionUsed) continue;
    options.push(candidate);
    if (candidateUsesPants) pantsOptionUsed = true;
    mainIds.forEach((id) => usedMain.add(id));
    usedShoes.add(candidate.composition.shoes.id);
    if (options.length >= (input.optionCount ?? 3)) break;
  }
  const confidence = options.length
    ? options.some((option) => option.assessment.confidence === "low")
      ? "low"
      : options.every((option) => option.assessment.confidence === "high") ? "high" : "medium"
    : "low";
  return {
    options,
    confidence,
    context: input.context,
    rejectedCandidateCount,
    noRecommendationReason: options.length ? null : "No complete outfit passed the hard constraints and final whole-look validation.",
    diagnostics,
    eligibilityAudit,
    styleProfile,
    stylingBrief,
  };
}
