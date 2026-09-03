import { wardrobeItemLabel } from "@/lib/wardrobe/item-label";
import { classifyWardrobeTraits } from "./item-taxonomy";
import type {
  CompleteOutfit, ContextEvidence, EngineWardrobeItem,
  HardRuleResult, ItemEligibilityAudit,
} from "./types";

export type EventArchetype =
  | "outdoor-stadium-concert"
  | "outdoor-concert"
  | "formal-dinner"
  | "business-meeting"
  | "wedding"
  | "walking-heavy-travel"
  | "school-community-day"
  | "general";

export type EventPolicy = {
  archetype: EventArchetype;
  policyVersion: "event-policy-v1-preview";
  hardConstraints: string[];
  strongPreferences: string[];
  preferences: string[];
  requireDistinctFootwear: boolean;
};

function effectiveHeat(context: ContextEvidence) {
  return Math.max(
    context.weather.temperature.value ?? -Infinity,
    context.weather.feelsLike.value ?? -Infinity,
    context.weather.high.value ?? -Infinity,
  );
}

export function buildEventPolicy(context: ContextEvidence): EventPolicy {
  const value = [
    context.agendaItem.title, context.venue.value, context.userNotes.value,
    context.statedDressCode.value, context.intention.value,
  ].filter(Boolean).join(" ").toLowerCase();
  const stadium = /\b(stadium|ballpark|baseball|truist park)\b/.test(value);
  const outdoorConcert = /\b(outdoor|outside|festival|amphitheat(?:er|re))\b/.test(value) && /\b(concert|music|festival)\b/.test(value);
  const formalDinner = /\b(formal dinner|fine dining|black.?tie dinner)\b/.test(value);
  const businessMeeting = /\b(client|business|board|office|work)\b/.test(value) && /\b(meeting|presentation|conference)\b/.test(value);
  const wedding = /\b(wedding|ceremony|reception)\b/.test(value);
  const walkingTravel = /\b(travel|airport|sightseeing|walking tour)\b/.test(value) && context.walking.value === "high";
  const schoolCommunity = /\b(volunteer(?:ing)?|school|classroom|campus|open house|community service|touring (?:prospective|potential) parents?)\b/.test(value);
  const archetype: EventArchetype = stadium && /\b(concert|show|music)\b/.test(value)
    ? "outdoor-stadium-concert"
    : outdoorConcert ? "outdoor-concert"
      : formalDinner ? "formal-dinner"
        : businessMeeting ? "business-meeting"
          : wedding ? "wedding"
            : walkingTravel ? "walking-heavy-travel"
              : schoolCommunity ? "school-community-day" : "general";
  const hardConstraints = context.constraintMatrix.hard.map((entry) => entry.code);
  const strongPreferences = context.constraintMatrix.strongSoft.map((entry) => entry.code);
  const preferences = context.constraintMatrix.preferences.map((entry) => entry.code);
  if (archetype === "outdoor-stadium-concert") {
    hardConstraints.push(
      "reject-stilettos-pumps-boots-suede",
      "require-stadium-walkable-footwear",
      "reject-formal-eveningwear",
      "reject-unknown-required-pockets",
    );
    if (effectiveHeat(context) >= 90 || context.constraintMatrix.heatSeverity === "extreme") {
      hardConstraints.push("reject-heavy-denim-jeans", "reject-heat-unsafe-long-sleeves");
    }
    strongPreferences.push(
      "breathable-short-sleeve-or-sleeveless",
      "lightweight-pocketed-bottom",
      "polished-casual-cohesion",
    );
  }
  if (archetype === "school-community-day") {
    hardConstraints.push(
      "reject-school-occasionwear",
      "reject-school-formal-footwear",
      "require-school-day-walkable-footwear",
    );
    strongPreferences.push(
      "approachable-polished-casual",
      "practical-school-day-mobility",
      "comfortable-walking-shoes",
    );
  }
  if (
    ["school-community-day", "business-meeting", "formal-dinner"].includes(archetype) &&
    context.evening.value === true &&
    context.setting.value === "indoor"
  ) {
    hardConstraints.push("reject-evening-indoor-leisurewear");
  }
  return {
    archetype,
    policyVersion: "event-policy-v1-preview",
    hardConstraints: [...new Set(hardConstraints)],
    strongPreferences: [...new Set(strongPreferences)],
    preferences: [...new Set(preferences)],
    requireDistinctFootwear: archetype === "outdoor-stadium-concert" || archetype === "outdoor-concert",
  };
}

function result(rule: string, passed: boolean, detail: string): HardRuleResult {
  return { rule, passed, detail };
}

export function auditItemEligibility(
  item: EngineWardrobeItem,
  context: ContextEvidence,
  policy = buildEventPolicy(context),
): ItemEligibilityAudit {
  const traits = classifyWardrobeTraits(item);
  const rules: HardRuleResult[] = [];
  const reasons: string[] = [];
  const reject = (rule: string, condition: boolean, detail: string) => {
    rules.push(result(rule, !condition, detail));
    if (condition) reasons.push(rule);
  };
  const stadium = policy.archetype === "outdoor-stadium-concert";
  const schoolCommunity = policy.archetype === "school-community-day";
  // All three conditions must be established. An unknown evening or setting
  // leaves this disarmed rather than assuming the stricter reading.
  const conservativeEveningIndoor =
    ["school-community-day", "business-meeting", "formal-dinner"].includes(policy.archetype) &&
    context.evening.value === true &&
    context.setting.value === "indoor";
  const extremeHeat = effectiveHeat(context) >= 90 || context.constraintMatrix.heatSeverity === "extreme";
  const foundationRole = ["top", "bottom", "one-piece"].includes(traits.role);
  const eventText = [
    context.agendaItem.title,
    context.venue.value,
    context.userNotes.value,
    context.intention.value,
  ].filter(Boolean).join(" ").toLowerCase();
  const itemText = [
    item.designer,
    item.item_name,
    item.category,
    item.subcategory,
    item.styling_suggestion,
  ].filter(Boolean).join(" ").toLowerCase();
  const teamApparel = /\b(game.?day|team apparel|fan gear|florida gators?|raglan graphic)\b/.test(itemText);
  const teamOccasion = /\b(?:watch(?:ing)?(?:\s+the)?\s+(?:game|team)|football game|basketball game|baseball game|soccer match|tailgate|game.?day|gators? game)\b/.test(eventText);
  const everydayOnePieceEvidence = traits.role === "one-piece" && (
    (traits.formality != null && traits.formality <= 3) ||
    /\b(cotton|linen|jersey|denim|chambray|poplin|shirt.?dress|sundress|day dress|casual|utility|knit dress|sweater dress|romper)\b/.test(traits.text)
  );
  reject(
    "team-apparel-without-team-occasion",
    foundationRole && teamApparel && !teamOccasion,
    "Team-branded apparel is reserved for an explicit team, game-watching, or tailgate occasion.",
  );
  reject(
    "user-rejected-formal-occasionwear",
    policy.hardConstraints.includes("user-no-formal-occasionwear") &&
      foundationRole &&
      (traits.formalEveningwear || traits.formality === 5 || (
        traits.role === "one-piece" &&
        /\b(?:lace|cocktail|evening|gala|black[- ]tie|beaded|sequined?|tulle|organza)\b/.test(
          `${item.category ?? ""} ${item.subcategory ?? ""} ${item.item_name ?? ""} ${item.styling_suggestion ?? ""}`.toLowerCase(),
        )
      )),
    "The customer identified formal or occasion-only garments as inappropriate for this event.",
  );
  reject(
    "above-formality-ceiling",
    foundationRole &&
      traits.formality != null &&
      traits.formality > context.dressingPosture.formalityCeiling,
    `This day permits formality through level ${context.dressingPosture.formalityCeiling}; this piece is level ${traits.formality ?? "unknown"}.`,
  );
  reject(
    "below-formality-floor",
    foundationRole &&
      traits.formality != null &&
      traits.formality < context.dressingPosture.formalityFloor,
    `This request requires formality level ${context.dressingPosture.formalityFloor} or higher; this piece is level ${traits.formality ?? "unknown"}.`,
  );
  reject(
    "unverified-formality-floor",
    foundationRole &&
      context.dressingPosture.formalityFloor >= 3 &&
      traits.formality == null,
    "An explicitly elevated request requires verified foundation formality; unknown formality cannot be presented as satisfying it.",
  );
  reject(
    "everyday-occasionwear",
    context.dressingPosture.archetype === "everyday-casual-social" &&
      foundationRole &&
      (traits.formalEveningwear || (traits.formality ?? 0) >= 4),
    "Occasion and formal foundation pieces are not eligible for an everyday casual-social plan.",
  );
  reject(
    "everyday-one-piece-unverified",
    context.dressingPosture.archetype === "everyday-casual-social" &&
      traits.role === "one-piece" &&
      !everydayOnePieceEvidence,
    "A dress or jumpsuit needs confirmed everyday formality or concrete daytime material evidence before it can be recommended for an ordinary casual-social plan.",
  );
  reject(
    "everyday-formal-footwear",
    context.dressingPosture.archetype === "everyday-casual-social" &&
      traits.role === "shoes" &&
      traits.formalFootwear,
    "Formal pumps and occasion heels are not eligible for an everyday casual-social posture.",
  );
  if (stadium) {
    reject("stadium-ineligible-footwear",
      traits.role === "shoes" && (
        traits.stiletto || traits.pump || traits.pointedToePump ||
        traits.formalFootwear || traits.boots || traits.suedeFootwear
      ),
      "Stilettos, pumps, formal heels, boots, and suede footwear are excluded before outfit generation.",
    );
    reject("stadium-walking-standing",
      traits.role === "shoes" && (traits.walkability == null || traits.walkability < 4),
      "Stadium footwear must be verified as suitable for prolonged walking and standing.",
    );
    reject("stadium-formal-eveningwear",
      ["top", "bottom", "one-piece"].includes(traits.role) &&
      (traits.formalEveningwear || traits.formalBlouse),
      "Formal/evening garments and formal blouses are excluded from a casual stadium concert.",
    );
  }
  if (stadium && extremeHeat) {
    reject("extreme-heat-heavy-denim-jeans",
      traits.role === "bottom" && traits.heavyDenim,
      "Full-length denim jeans without verified lightweight construction are excluded at 90°F+.",
    );
    reject("extreme-heat-long-sleeve",
      ["top", "one-piece", "layer"].includes(traits.role) &&
      traits.longSleeve && !traits.heatSafeLongSleeve,
      "Long sleeves require explicit lightweight, breathable evidence in extreme heat.",
    );
  }
  if (schoolCommunity) {
    reject(
      "school-formal-footwear",
      traits.role === "shoes" && (
        traits.stiletto || traits.pump || traits.pointedToePump || traits.formalFootwear
      ),
      "School and community commitments require comfortable, approachable footwear rather than occasion pumps or formal heels.",
    );
    reject(
      "school-walking-footwear",
      traits.role === "shoes" && (traits.walkability == null || traits.walkability < 3),
      "Footwear must be verified as practical for classroom movement and walking tours.",
    );
    reject(
      "school-occasionwear",
      foundationRole && (
        traits.formalEveningwear ||
        traits.formalBlouse ||
        /\b(cocktail|evening|gala|black[- ]tie|lace\b[\s\S]{0,24}\bmini|mini\b[\s\S]{0,24}\blace)\b/.test(traits.text)
      ),
      "Cocktail, evening, and overt occasionwear are not eligible for a school or community daytime commitment.",
    );
  }
  reject(
    "evening-indoor-leisurewear",
    conservativeEveningIndoor && traits.leisureCasual && traits.formality != null && traits.formality <= 2,
    "Shorts, swimwear, activewear, and pool footwear are not eligible for an evening indoor commitment with a conservative audience.",
  );
  if (context.bagAllowed.value === false) {
    reject("no-bag", traits.role === "bag", "The user or verified venue policy does not permit a bag.");
  }
  const clearBagPolicy = context.venueRules.some((rule) => rule.kind === "bag-policy" && rule.effect === "clear-bag-only");
  reject(
    "stadium-bag-policy",
    clearBagPolicy && traits.role === "bag" && !/\b(clear|transparent|stadium.?approved)\b/.test(traits.text),
    "This venue permits only a verified clear or otherwise dimension-compliant stadium bag; an ordinary handbag cannot be assumed compliant.",
  );
  const hardCodes = new Set(policy.hardConstraints);
  reject("user-no-jeans", hardCodes.has("user-no-jeans") && traits.jeans, "The user excluded jeans.");
  reject("user-no-long-sleeves", hardCodes.has("user-no-long-sleeves") && traits.longSleeve, "The user excluded long sleeves.");
  reject("user-no-slides", hardCodes.has("user-no-slides") && /\bslides?\b/.test(traits.text), "The user excluded slides.");
  reject("user-no-boots", hardCodes.has("user-no-boots") && traits.boots, "The user excluded boots.");
  reject(
    "user-required-heels",
    hardCodes.has("user-requires-heels") && traits.role === "shoes" && !traits.heel,
    "The customer explicitly requested heels; flat footwear is not eligible.",
  );
  const weatherSuitability = reasons.some((reason) => reason.startsWith("extreme-heat"))
    ? "ineligible" : traits.warmth == null ? "unknown" : "eligible";
  const venueSuitability = reasons.some((reason) => reason.startsWith("stadium") || reason.startsWith("school-") || reason === "no-bag")
    ? "ineligible" : stadium ? "eligible" : "unknown";
  const walkingStandingSuitability = traits.role !== "shoes"
    ? "unknown"
    : reasons.includes("stadium-walking-standing") || reasons.includes("school-walking-footwear") ? "ineligible"
      : traits.walkability == null ? "unknown" : "eligible";
  return {
    itemId: item.id,
    label: wardrobeItemLabel(item),
    authoritativeCategory: item.category,
    authoritativeSubcategory: item.subcategory ?? item.subcategory_2 ?? null,
    normalizedRole: traits.role,
    materials: traits.materials,
    formality: traits.formality,
    weatherSuitability,
    venueSuitability,
    walkingStandingSuitability,
    polishScore: traits.polish == null ? null : traits.polish * 20,
    hardRules: rules,
    eligible: reasons.length === 0,
    rejectionReasons: reasons,
  };
}

function foundationItems(outfit: CompleteOutfit) {
  return outfit.foundation.kind === "dress-or-jumpsuit"
    ? [outfit.foundation.onePiece]
    : [outfit.foundation.top, outfit.foundation.bottom];
}

export function validateOutfitAgainstEventPolicy(
  outfit: CompleteOutfit,
  context: ContextEvidence,
  policy = buildEventPolicy(context),
) {
  const items = [
    ...foundationItems(outfit), outfit.shoes,
    ...(outfit.bag ? [outfit.bag] : []),
    ...(outfit.outerLayer ? [outfit.outerLayer] : []),
    ...outfit.jewelry,
    ...(outfit.fragrance ? [outfit.fragrance] : []),
  ];
  const audits = items.map((item) => auditItemEligibility(item, context, policy));
  const reasons = audits.flatMap((audit) => audit.rejectionReasons);
  const foundation = foundationItems(outfit).map(classifyWardrobeTraits);
  const shoe = classifyWardrobeTraits(outfit.shoes);
  if (context.pocketsRequired.value === true && !foundation.some((trait) => trait.pockets === true)) {
    reasons.push("verified-pockets-required");
  }
  if (policy.archetype === "outdoor-stadium-concert") {
    const requestedPolish = context.constraintMatrix.requestedPolish;
    if ((requestedPolish === "polished" || requestedPolish === "polished-casual") && (shoe.polish == null || shoe.polish < 3)) {
      reasons.push("whole-outfit-insufficient-polish");
    }
    if (foundation.filter((trait) => trait.pattern === "statement").length > 1) {
      reasons.push("whole-outfit-competing-statements");
    }
    const formalities = foundation.map((trait) => trait.formality).filter((value): value is number => value != null);
    if (formalities.length > 1 && Math.max(...formalities) - Math.min(...formalities) >= 2) {
      reasons.push("whole-outfit-formality-conflict");
    }
  }
  return { valid: reasons.length === 0, rejectionReasons: [...new Set(reasons)], audits };
}
