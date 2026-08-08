import { containsIncompatiblePair, type IncompatibleWardrobePair } from "./pair-preferences";

export type RecommendationDraft = {
  summary: string;
  rationale: string;
  wardrobeItemIds: string[];
};

export type RecommendationWardrobeItem = {
  id: string;
  category: string | null;
  subcategory?: string | null;
  item_name?: string | null;
  color?: string | null;
  styling_suggestion?: string | null;
};

const SUPPORTING_CATEGORIES = new Set([
  "Accessories", "Handbags", "Bags", "Jewelry", "Watches & Jewelry",
  "Perfumes / Fragrances", "Colognes / Grooming", "Shoes", "Outerwear",
]);
const TOP_CATEGORIES = new Set([
  "Shirts / Tees", "Sweaters / Knits", "Tops", "Blazers & Sports Coats",
  "Sweatshirts / Hoodies", "Jackets", "Activewear", "Athletic Wear",
  "Shirt / Top", "Shirt/Tee", "Shirts/Tops", "Shirts", "Sweaters / Knitwear",
]);
const BOTTOM_CATEGORIES = new Set([
  "Pants", "Jeans", "Shorts", "Skirts", "Activewear", "Athletic Wear",
]);
const ONE_PIECE_CATEGORIES = new Set([
  "Dresses", "Jumpsuits / Rompers", "Formal Wear", "Swimwear", "Swim Wear",
]);
const SHOE_CATEGORIES = new Set(["Shoes"]);
const BAG_CATEGORIES = new Set(["Handbags", "Bags"]);
const FRAGRANCE_CATEGORIES = new Set(["Perfumes / Fragrances", "Colognes / Grooming"]);

function isFragranceCategory(category: string | null | undefined) {
  return Boolean(category && (
    FRAGRANCE_CATEGORIES.has(category)
    || /perfume|fragrance|cologne|scent/i.test(category)
  ));
}

type GarmentRole = "one-piece" | "top" | "bottom" | "main" | "support";

function garmentRole(item: RecommendationWardrobeItem): GarmentRole {
  const category = item.category || "";
  const subcategory = item.subcategory?.toLowerCase() || "";
  const itemText = `${subcategory} ${item.item_name || ""}`.toLowerCase();
  if (SUPPORTING_CATEGORIES.has(category) || isFragranceCategory(category)) return "support";
  if (ONE_PIECE_CATEGORIES.has(category) || /dress|gown|jumpsuit|romper|tracksuit|two-piece|three-piece/.test(itemText)) return "one-piece";
  if (/pant|trouser|jean|short|skirt|legging|culotte|bottom/.test(itemText)) return "bottom";
  if (/top|shirt|blouse|tee\b|t-shirt|tank|camisole|bodysuit|sweater|pullover|hoodie|sweatshirt|blazer|jacket|vest/.test(itemText)) return "top";
  if (BOTTOM_CATEGORIES.has(category) && !TOP_CATEGORIES.has(category)) return "bottom";
  if (TOP_CATEGORIES.has(category) && !BOTTOM_CATEGORIES.has(category)) return "top";
  return "main";
}

function isBlueDenim(item: RecommendationWardrobeItem) {
  const text = `${item.color || ""} ${item.category || ""} ${item.subcategory || ""} ${item.item_name || ""}`.toLowerCase();
  return /\b(blue|navy|indigo|chambray|light wash|medium wash|dark wash)\b/.test(text)
    && /\b(denim|chambray|jean)\b/.test(text);
}

function hasDoubleBlueDenim(items: RecommendationWardrobeItem[]) {
  return items.filter(isBlueDenim).length > 1;
}

function itemText(item: RecommendationWardrobeItem) {
  return `${item.category || ""} ${item.subcategory || ""} ${item.item_name || ""} ${item.styling_suggestion || ""}`.toLowerCase();
}

function isFormalStatement(item: RecommendationWardrobeItem) {
  return /\b(formal|gala|cocktail|evening|black.?tie|satin|silk|sequined?|sequin|tulle|organza|lace.?trim|embellished|beaded|metallic)\b/.test(itemText(item));
}

function isCasualBasic(item: RecommendationWardrobeItem) {
  return /\b(tank|ribbed|tee\b|t-shirt|graphic|sweatshirt|hoodie|jersey|utility|cargo|distressed|cutoff|cut-off)\b/.test(itemText(item));
}

function isStatementPiece(item: RecommendationWardrobeItem) {
  return /\b(sequined?|sequin|lace|beaded|embellished|metallic|brocade|jacquard|graphic|animal print|floral print|bold print|patterned)\b/.test(itemText(item));
}

function isLongTop(item: RecommendationWardrobeItem) {
  return garmentRole(item) === "top"
    && /\b(tunic|longline|long top|dress top|3\/4 length|three-quarter length)\b/.test(itemText(item));
}

function isSkirt(item: RecommendationWardrobeItem) {
  return garmentRole(item) === "bottom" && /\bskirt\b/.test(itemText(item));
}

export function isCoherentOutfit(
  ids: string[],
  wardrobe: RecommendationWardrobeItem[],
  eventContext = "",
) {
  const wardrobeById = new Map(wardrobe.map((item) => [item.id, item]));
  const selected = ids.map((id) => wardrobeById.get(id)).filter((item): item is RecommendationWardrobeItem => Boolean(item));
  const mains = selected.filter(isMainClothingItem);
  const tops = mains.filter((item) => garmentRole(item) === "top");
  const bottoms = mains.filter((item) => garmentRole(item) === "bottom");
  const context = eventContext.toLowerCase();

  if (hasDoubleBlueDenim(mains)) return false;
  if (tops.some(isLongTop) && bottoms.some(isSkirt)) return false;
  if (tops.some(isCasualBasic) && bottoms.some(isFormalStatement)) return false;
  if (tops.some(isFormalStatement) && bottoms.some(isCasualBasic)) return false;
  if (tops.some(isStatementPiece) && bottoms.some(isStatementPiece)) return false;

  const stadiumEvent = /\b(stadium|ballpark|baseball|truist park|arena|amphitheater|amphitheatre)\b/.test(context);
  const pocketsRequired = /\b(?:need|require|must have|with)\s+pockets?\b|\bpockets?\s+(?:for|required|needed)\b/.test(context);
  if (stadiumEvent && mains.some(isFormalStatement)) return false;
  if (
    pocketsRequired
    && mains.some((item) =>
      (garmentRole(item) === "one-piece" || isSkirt(item))
      && !/\bpockets?|cargo|utility\b/.test(itemText(item)),
    )
  ) return false;

  return true;
}

export function isMainClothingItem(item: RecommendationWardrobeItem) {
  return garmentRole(item) !== "support";
}

export function isCompleteOutfit(ids: string[], wardrobe: RecommendationWardrobeItem[]) {
  const wardrobeById = new Map(wardrobe.map((item) => [item.id, item]));
  const selected = ids.map((id) => wardrobeById.get(id)).filter((item): item is RecommendationWardrobeItem => Boolean(item));
  const roles = selected.map(garmentRole);
  const hasFoundation = roles.includes("one-piece") || (roles.includes("top") && roles.includes("bottom"));
  const shoesExist = wardrobe.some((item) => item.category && SHOE_CATEGORIES.has(item.category));
  const hasShoes = selected.some((item) => item.category && SHOE_CATEGORIES.has(item.category));
  const bagsExist = wardrobe.some((item) => item.category && BAG_CATEGORIES.has(item.category));
  const hasBag = selected.some((item) => item.category && BAG_CATEGORIES.has(item.category));
  const fragrancesExist = wardrobe.some((item) => isFragranceCategory(item.category));
  const hasFragrance = selected.some((item) => isFragranceCategory(item.category));
  return hasFoundation
    && (!shoesExist || hasShoes)
    && (!bagsExist || hasBag)
    && (!fragrancesExist || hasFragrance);
}

export function completeRecommendationDrafts(
  drafts: RecommendationDraft[],
  wardrobe: RecommendationWardrobeItem[],
  incompatiblePairs: IncompatibleWardrobePair[] = [],
  eventContext = "",
) {
  const shoes = wardrobe.filter((item) => item.category === "Shoes");
  const bags = wardrobe.filter((item) => item.category && BAG_CATEGORIES.has(item.category));
  const fragrances = wardrobe.filter((item) => isFragranceCategory(item.category));
  return drafts.map((draft) => {
    const ids = [...new Set(draft.wardrobeItemIds)];
    const addCompatible = (candidates: RecommendationWardrobeItem[]) => {
      const candidate = candidates.find((item) =>
        !ids.includes(item.id)
        && !containsIncompatiblePair([...ids, item.id], incompatiblePairs)
        && isCoherentOutfit([...ids, item.id], wardrobe, eventContext),
      );
      if (candidate) ids.push(candidate.id);
    };
    if (!ids.some((id) => shoes.some((shoe) => shoe.id === id))) addCompatible(shoes);
    if (!ids.some((id) => bags.some((bag) => bag.id === id))) addCompatible(bags);
    if (!ids.some((id) => fragrances.some((fragrance) => fragrance.id === id))) addCompatible(fragrances);
    return { ...draft, wardrobeItemIds: ids };
  });
}

function signature(ids: string[]) {
  return [...new Set(ids)].sort().join("|");
}

function naturalList(values: string[]) {
  if (values.length < 2) return values[0] || "the selected wardrobe pieces";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

export function validateRecommendationSet(
  drafts: RecommendationDraft[],
  wardrobe: RecommendationWardrobeItem[],
  incompatiblePairs: IncompatibleWardrobePair[] = [],
  eventContext = "",
) {
  if (drafts.length !== 3) return { valid: false as const, reason: "three-complete-options" as const };
  const wardrobeById = new Map(wardrobe.map((item) => [item.id, item]));
  const outfitSignatures = new Set<string>();
  const primarySignatures = new Set<string>();
  const usedMainItemIds = new Set<string>();

  for (const draft of drafts) {
    const ids = [...new Set(draft.wardrobeItemIds)];
    if (!draft.summary.trim() || !draft.rationale.trim() || !ids.length) return { valid: false as const, reason: "incomplete-option" as const };
    if (ids.some((id) => !wardrobeById.has(id))) return { valid: false as const, reason: "unknown-item" as const };
    if (containsIncompatiblePair(ids, incompatiblePairs)) return { valid: false as const, reason: "incompatible-pair" as const };
    if (!isCompleteOutfit(ids, wardrobe)) return { valid: false as const, reason: "missing-required-outfit-role" as const };
    if (!isCoherentOutfit(ids, wardrobe, eventContext)) return { valid: false as const, reason: "incoherent-outfit" as const };

    const outfitSignature = signature(ids);
    if (outfitSignatures.has(outfitSignature)) return { valid: false as const, reason: "duplicate-outfit" as const };
    outfitSignatures.add(outfitSignature);

    const mainIds = ids.filter((id) => isMainClothingItem(wardrobeById.get(id)!));
    if (mainIds.some((id) => usedMainItemIds.has(id))) return { valid: false as const, reason: "reused-main-item" as const };
    const primarySignature = signature(mainIds);
    if (primarySignatures.has(primarySignature)) return { valid: false as const, reason: "duplicate-main-items" as const };
    primarySignatures.add(primarySignature);
    mainIds.forEach((id) => usedMainItemIds.add(id));
  }
  return { valid: true as const };
}

export function buildDeterministicRecommendationSet(
  wardrobe: Array<RecommendationWardrobeItem & { designer?: string | null; item_name?: string | null }>,
  eventTitle: string,
  incompatiblePairs: IncompatibleWardrobePair[] = [],
): RecommendationDraft[] {
  const onePieces = wardrobe.filter((item) => garmentRole(item) === "one-piece");
  const tops = wardrobe.filter((item) => garmentRole(item) === "top");
  const bottoms = wardrobe.filter((item) => garmentRole(item) === "bottom");
  const foundations: typeof wardrobe[] = [
    ...onePieces.map((item) => [item]),
    ...tops.flatMap((top) => bottoms.map((bottom) => [top, bottom])),
  ].filter((items) =>
    !containsIncompatiblePair(items.map((item) => item.id), incompatiblePairs)
    && isCoherentOutfit(items.map((item) => item.id), wardrobe, eventTitle),
  );
  const supportGroups = [
    new Set(["Shoes"]),
    new Set(["Handbags", "Bags"]),
    new Set(["Jewelry", "Watches & Jewelry", "Accessories"]),
    new Set(["Outerwear"]),
    FRAGRANCE_CATEGORIES,
  ];
  const options: RecommendationDraft[] = [];
  const usedFoundationItemCounts = new Map<string, number>();
  const remainingFoundations = [...foundations];

  while (remainingFoundations.length && options.length < 3) {
    remainingFoundations.sort((a, b) => {
      const aNovel = a.filter((item) => !usedFoundationItemCounts.has(item.id)).length;
      const bNovel = b.filter((item) => !usedFoundationItemCounts.has(item.id)).length;
      if (aNovel !== bNovel) return bNovel - aNovel;
      const aDoubleDenim = hasDoubleBlueDenim(a) ? 1 : 0;
      const bDoubleDenim = hasDoubleBlueDenim(b) ? 1 : 0;
      if (aDoubleDenim !== bDoubleDenim) return aDoubleDenim - bDoubleDenim;
      const aUse = a.reduce((sum, item) => sum + (usedFoundationItemCounts.get(item.id) ?? 0), 0);
      const bUse = b.reduce((sum, item) => sum + (usedFoundationItemCounts.get(item.id) ?? 0), 0);
      return aUse - bUse;
    });
    const foundation = remainingFoundations.shift()!;
    if (foundation.some((item) => usedFoundationItemCounts.has(item.id))) continue;
    const selectedIds = foundation.map((item) => item.id);
    for (const categories of supportGroups) {
      const candidates = wardrobe.filter((item) =>
        item.category
        && categories.has(item.category)
        && !containsIncompatiblePair([...selectedIds, item.id], incompatiblePairs)
        && isCoherentOutfit([...selectedIds, item.id], wardrobe, eventTitle)
      );
      const support = candidates.length ? candidates[options.length % candidates.length] : null;
      if (support) selectedIds.push(support.id);
    }
    if (!isCompleteOutfit(selectedIds, wardrobe)) continue;
    foundation.forEach((item) => {
      usedFoundationItemCounts.set(item.id, (usedFoundationItemCounts.get(item.id) ?? 0) + 1);
    });
    const selected = selectedIds.map((id) => wardrobe.find((item) => item.id === id)!).filter(Boolean);
    const labels = selected.map((item) => item.item_name || item.designer || item.category || "wardrobe piece");
    const isStadium = /\b(stadium|ballpark|baseball|truist park|arena|amphitheater|amphitheatre)\b/i.test(eventTitle);
    const isHot = /\b(?:8[0-9]|9[0-9]|1[0-9]{2})\s*°?f\b/i.test(eventTitle);
    options.push({
      summary: isStadium ? "Relaxed stadium polish" : "A considered complete look",
      rationale: `Wear ${naturalList(labels)}. ${isStadium
        ? `For this ${isHot ? "hot " : ""}stadium event, the combination stays casual and movement-friendly${isHot ? ", avoids heat-trapping layers" : ""}, and respects venue limitations.`
        : "The combination is polished, practical for the occasion, and drawn from pieces that are currently available and ready to return to rotation."}`,
      wardrobeItemIds: [...new Set(selectedIds)],
    });
  }
  return options;
}
