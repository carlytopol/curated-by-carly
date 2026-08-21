import type { EngineWardrobeItem } from "./types";

export type NormalizedWardrobeRole =
  | "top" | "bottom" | "one-piece" | "shoes" | "bag"
  | "fragrance" | "accessory" | "layer" | "other";

export type WardrobeTraits = {
  role: NormalizedWardrobeRole;
  text: string;
  materials: string[];
  formality: number | null;
  warmth: number | null;
  pattern: "solid" | "statement" | "unknown";
  blueDenim: boolean;
  pockets: boolean | null;
  walkability: number | null;
  polish: number | null;
  longSleeve: boolean;
  heatSafeLongSleeve: boolean;
  jeans: boolean;
  heavyDenim: boolean;
  boots: boolean;
  suedeFootwear: boolean;
  pump: boolean;
  pointedToePump: boolean;
  stiletto: boolean;
  formalFootwear: boolean;
  casualSlides: boolean;
  formalEveningwear: boolean;
  formalBlouse: boolean;
};

function record(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function metadataText(item: EngineWardrobeItem) {
  const metadata = record(item.analysis_metadata);
  if (!metadata) return "";
  // Only structured facts are admitted. Free-form analysis/styling prose can
  // mention unrelated garments and is never authoritative taxonomy evidence.
  const values = [
    metadata.material, metadata.fabric, metadata.materials,
    metadata.formality, metadata.occasion, metadata.shoeType,
    metadata.shoe_type, metadata.heelType, metadata.heel_type,
    metadata.sleeveLength, metadata.sleeve_length,
    metadata.fabricWeight, metadata.fabric_weight,
  ];
  return values.flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value): value is string => typeof value === "string")
    .join(" ").toLowerCase();
}

export function authoritativeItemText(item: EngineWardrobeItem) {
  const evidenceValues = item.garmentEvidence
    ? Object.values(item.garmentEvidence.fields)
      .filter((entry) => entry?.state === "known" && entry.numericConfidence >= 0.7)
      .flatMap((entry) => Array.isArray(entry!.value) ? entry!.value : [entry!.value])
      .filter((value): value is string => typeof value === "string")
    : [];
  return [
    item.category, item.subcategory, item.subcategory_2,
    item.item_name, item.color, metadataText(item), ...evidenceValues,
  ].filter(Boolean).join(" ").toLowerCase();
}

export function classifyWardrobeRole(item: EngineWardrobeItem): NormalizedWardrobeRole {
  const evidenceRole = item.garmentEvidence?.fields.role;
  if (
    evidenceRole?.state === "known" &&
    evidenceRole.numericConfidence >= 0.7 &&
    typeof evidenceRole.value === "string" &&
    ["top", "bottom", "one-piece", "shoes", "bag", "fragrance", "accessory", "layer", "other"].includes(evidenceRole.value)
  ) {
    return evidenceRole.value as NormalizedWardrobeRole;
  }
  const category = (item.category || "").toLowerCase();
  const value = [item.category, item.subcategory, item.subcategory_2, item.item_name]
    .filter(Boolean).join(" ").toLowerCase();
  if (/perfumes?|fragrances?|colognes?|scent/.test(`${category} ${value}`)) return "fragrance";
  if (/\b(shoes?|sneakers?|sandals?|flats?|loafers?|boots?|heels?|pumps?|slides?|court shoes?)\b/.test(`${category} ${value}`)) return "shoes";
  if (/\b(handbags?|bags?|totes?|clutches?|purses?)\b/.test(`${category} ${value}`)) return "bag";
  if (/\b(jewelry|jewellery|watches?|necklaces?|earrings?|bracelets?|rings?|accessories?|hats?|caps?|headwear)\b/.test(`${category} ${value}`)) return "accessory";
  if (/\b(outerwear|coats?|jackets?|blazers?)\b/.test(`${category} ${value}`)) return "layer";
  if (/\b(dresses?|gowns?|jumpsuits?|rompers?|one-piece)\b/.test(value) || /\b(dresses|jumpsuits)\b/.test(category)) return "one-piece";
  // Tops resolve before bottoms so “short-sleeve” is never read as “shorts.”
  if (/\b(tops?|shirts?|blouses?|tees?|t-shirts?|tanks?|camisoles?|bodysuits?|sweaters?|pullovers?|hoodies?|sweatshirts?|tunics?)\b/.test(value)) return "top";
  if (/\b(pants?|trousers?|jeans?|shorts|skirts?|leggings?|culottes?)\b/.test(value) || /\b(pants|jeans|shorts|skirts)\b/.test(category)) return "bottom";
  return "other";
}

function structuredPockets(item: EngineWardrobeItem, value: string) {
  const evidencePockets = item.garmentEvidence?.fields.has_pockets;
  if (
    evidencePockets?.state === "known" &&
    evidencePockets.numericConfidence >= 0.7 &&
    typeof evidencePockets.value === "boolean"
  ) return evidencePockets.value;
  const metadata = record(item.analysis_metadata);
  const explicit = metadata?.hasPockets ?? metadata?.has_pockets;
  if (typeof explicit === "boolean") return explicit;
  if (/\b(no pockets?|pocketless|without pockets?)\b/.test(value)) return false;
  return /\b(pockets?|patch-pocket|cargo|utility)\b/.test(value) ? true : null;
}

export function classifyWardrobeTraits(item: EngineWardrobeItem): WardrobeTraits {
  const value = authoritativeItemText(item);
  const role = classifyWardrobeRole(item);
  const occasionLaceFoundation = ["bottom", "one-piece"].includes(role) &&
    /\b(lace.?trim|lace[- ]panel|asymmetrical[^.]{0,32}lace|lace[^.]{0,32}asymmetrical)\b/.test(value);
  const materials = [
    "cotton", "linen", "silk", "satin", "charmeuse", "suede", "leather",
    "denim", "wool", "cashmere", "fleece", "organza", "tulle", "lace",
    "crepe", "jersey", "rayon", "viscose",
  ].filter((material) => new RegExp(`\\b${material}\\b`).test(value));
  let formality: number | null = null;
  const evidenceFormality = item.garmentEvidence?.fields.formality;
  if (
    evidenceFormality?.state === "known" &&
    evidenceFormality.numericConfidence >= 0.7 &&
    typeof evidenceFormality.value === "number"
  ) formality = evidenceFormality.value;
  else if (/\b(black.?tie|gala|formal|gowns?|tuxedo)\b/.test(value)) formality = 5;
  else if (occasionLaceFoundation || /\b(cocktail|evening|satin|silk|charmeuse|sequined?|beaded|organza|tulle)\b/.test(value)) formality = 4;
  else if (/\b(blazers?|tailored|dress shirts?|loafers?|pumps?)\b/.test(value)) formality = 3;
  else if (/\b(casual|denim|chambray|tees?|tanks?|sneakers?|shorts|utility)\b/.test(value)) formality = 2;
  else if (/\b(active|athletic|sweatshirts?|hoodies?|gym|swim|cover.?ups?|kaftans?)\b/.test(value)) formality = 1;

  let warmth: number | null = null;
  if (/\b(wool|cashmere|fleece|cable.?knit|puffer|heavy|thermal)\b/.test(value)) warmth = 5;
  else if (/\b(sweaters?|sweatshirts?|hoodies?|pullovers?|knit|coats?|boots?)\b/.test(value)) warmth = 4;
  else if (/\b(jackets?|blazers?|long.?sleeves?|denim)\b/.test(value)) warmth = 3;
  else if (/\b(short.?sleeves?|cotton|linen|chambray)\b/.test(value)) warmth = 2;
  else if (/\b(tanks?|sleeveless|shorts|sandals?|slides?|swim)\b/.test(value)) warmth = 1;

  const statement = /\b(sequins?|beaded|embellished|embroidered|embroidery|multicolou?r|multi-color|metallic|glitter|brocade|jacquard|baroque|graphic|animal|floral|bold print|printed|patterned|lace|two-tone|color-?block(?:ed)?|colour-?block(?:ed)?|contrast(?:ing)?)\b|\bblack(?:\s+and\s+|-and-)?white\b/.test(value);
  const solid = /\bsolid\b/.test(value) || (!statement && Boolean(item.color));
  const blueDenim = /\b(blue|navy|indigo|chambray|wash)\b/.test(value) && /\b(denim|chambray|jeans?)\b/.test(value);
  const pump = /\b(pumps?|court shoes?|high heels?)\b/.test(value);
  const pointedToePump = /\b(pointed(?:-|\s)?toe(?:d)?(?:\s+\w+){0,3}\s+pumps?|pointed(?:-|\s)?toe(?:d)?|court shoes?)\b/.test(value);
  const stiletto = /\b(stilettos?|stiletto heels?)\b/.test(value);
  const boots = /\bboots?|booties?\b/.test(value);
  const suedeFootwear = /\bsuede\b/.test(value) && classifyWardrobeRole(item) === "shoes";
  const formalFootwear = pump || stiletto || /\b(delicate pumps?|formal heels?|evening shoes?|dress shoes?|metallic strappy|t-strap pumps?)\b/.test(value);
  let walkability: number | null = null;
  if (/\b(sneakers?|trainers?|walking|flats?|loafers?|supportive)\b/.test(value)) walkability = 5;
  else if (/\b(sandals?|slides?|low heels?)\b/.test(value)) walkability = 3;
  else if (stiletto || pump || /\b(platforms?|wedges?|delicate|dress shoes?)\b/.test(value)) walkability = 1;
  let polish: number | null = null;
  if (formalFootwear) polish = 5;
  else if (/\b(leather sneakers?|loafers?|ballet flats?|leather sandals?|polished|tailored)\b/.test(value)) polish = 4;
  else if (/\b(sneakers?|flat sandals?|supportive sandals?)\b/.test(value)) polish = 3;
  else if (/\b(logo slides?|rubber slides?|athletic slides?|pool slides?|flip.?flops?)\b/.test(value)) polish = 1;
  else if (/\bslides?\b/.test(value)) polish = 2;

  const longSleeve = /\b(long(?:-|\s)?sleeves?|rugby polos?|rugby shirts?)\b/.test(value);
  const heatSafeLongSleeve = longSleeve &&
    /\b(linen|gauze|mesh|sheer cotton|lightweight cotton|breathable)\b/.test(value);
  const jeans = /\bjeans?\b/.test(value);
  const heavyDenim = jeans && !/\b(lightweight|featherweight|summer weight|thin|lyocell|tencel)\b/.test(value);
  const formalEveningwear = occasionLaceFoundation || /\b(satin|silk|charmeuse|evening|cocktail|gala|organza|tulle|sequins?)\b/.test(value);
  const formalBlouse = role === "top" && (
    formalEveningwear || /\b(tie.?neck|puff.?sleeves?|pleated formal|evening blouse)\b/.test(value)
  );
  return {
    role, text: value, materials, formality, warmth,
    pattern: statement ? "statement" : solid ? "solid" : "unknown",
    blueDenim, pockets: structuredPockets(item, value), walkability, polish,
    longSleeve, heatSafeLongSleeve, jeans, heavyDenim, boots, suedeFootwear,
    pump, pointedToePump, stiletto, formalFootwear,
    casualSlides: /\b(logo slides?|rubber slides?|athletic slides?|pool slides?|flip.?flops?)\b/.test(value),
    formalEveningwear, formalBlouse,
  };
}
