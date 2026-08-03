import type { GarmentRole } from "./taxonomy";

export type CanonicalWardrobeRoleInput = {
  category: string | null;
  subcategory: string | null;
  subcategory2: string | null;
  itemName: string | null;
};

const normalized = (value: string | null | undefined) =>
  (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Structural role comes only from canonical wardrobe identity fields. */
export function classifyCanonicalWardrobeRole(
  input: CanonicalWardrobeRoleInput,
): GarmentRole | null {
  const category = normalized(input.category);
  const subcategories = normalized([input.subcategory, input.subcategory2].filter(Boolean).join(" "));
  const name = normalized(input.itemName);

  if (/\bshoes?\b/.test(category)) return "shoes";
  if (/\b(handbags?|bags?)\b/.test(category)) return "bag";
  if (/\b(jewelry|watches)\b/.test(category)) return "jewelry";
  if (/\baccessor(?:y|ies)\b/.test(category)) return "accessory";
  if (/\b(perfumes?|fragrances?)\b/.test(category)
    || (/\b(colognes?|grooming)\b/.test(category) && /\b(cologne|aftershave)\b/.test(subcategories))) return "fragrance";
  if (/\bdresses?\b/.test(category)) return "dress";
  if (/\b(pants?|jeans?|shorts?|skirts?)\b/.test(category)) return "bottom";
  if (/\b(shirts?|tees?|sweaters?|knitwear|sweatshirts?|hoodies?)\b/.test(category)) return "top";
  if (/\b(outerwear|blazers?|sport coats?)\b/.test(category)) return "outer-layer";

  if (/\b(activewear|athletic wear)\b/.test(category)) {
    if (/\b(pants?|shorts?|leggings?|skirts?|sweatpants?)\b/.test(subcategories)) return "bottom";
    if (/\b(tops?|bras?|shirts?|base layers?)\b/.test(subcategories)) return "top";
    if (/\btracksuits?\b/.test(subcategories)) return "coordinated-set";
    return null;
  }
  if (/\b(suits?|suit separates?|tailoring)\b/.test(category)) {
    if (/\b(pants?|skirts?)\b/.test(subcategories)) return "bottom";
    if (/\b(jackets?|blazers?|vests?|waistcoats?)\b/.test(subcategories)) return "top";
    if (/\b(two piece|three piece|suits?)\b/.test(subcategories) || /\bsuit\b/.test(name)) return "coordinated-set";
    return null;
  }
  if (/\bformalwear\b/.test(category)) {
    if (/\b(dress|gown|cocktail)\b/.test(subcategories)) return "dress";
    if (/\b(tuxedo|black tie)\b/.test(subcategories)) return "coordinated-set";
    if (/\bshirt\b/.test(subcategories)) return "top";
    return null;
  }
  if (/\b(jumpsuit|romper)\b/.test(name)) return "jumpsuit";
  if (/\b(co ord|coordinated set|matching set)\b/.test(name)) return "coordinated-set";
  return null;
}
