export type ContextWardrobeItem = {
  category: string | null;
  subcategory?: string | null;
  itemName?: string | null;
  stylingSuggestion?: string | null;
  season?: string | null;
  season2?: string | null;
  season3?: string | null;
};

export type RecommendationContext = {
  eventTitle: string;
  eventDetails?: string;
  temperature?: number | null;
  temperatureHigh?: number | null;
};

const ACCESSORY_CATEGORIES = new Set([
  "Accessories",
  "Handbags",
  "Bags",
  "Jewelry",
  "Watches & Jewelry",
  "Perfumes / Fragrances",
  "Colognes / Grooming",
  "Outerwear",
  "Shoes",
]);

export function isContextCompatible(item: ContextWardrobeItem, context: RecommendationContext) {
  const category = item.category || "";
  const subcategory = item.subcategory?.toLowerCase() || "";
  const itemText = `${subcategory} ${item.itemName || ""} ${item.stylingSuggestion || ""}`.toLowerCase();
  const title = `${context.eventTitle} ${context.eventDetails || ""}`.toLowerCase();
  const seasons = [item.season, item.season2, item.season3].filter(Boolean);
  const effectiveTemperature = Math.max(
    typeof context.temperature === "number" ? context.temperature : -Infinity,
    typeof context.temperatureHigh === "number" ? context.temperatureHigh : -Infinity,
  );

  if (Number.isFinite(effectiveTemperature)) {
    if (effectiveTemperature <= 45 && seasons.length && seasons.every((season) => season === "Summer")) return false;
    if (effectiveTemperature >= 80 && seasons.length && seasons.every((season) => season === "Winter")) return false;
    if (effectiveTemperature >= 78 && category === "Shoes" && /boot/.test(itemText)) return false;
    if (effectiveTemperature >= 82 && category === "Outerwear") return false;
    if (effectiveTemperature >= 80 && /sweater|sweatshirt|hoodie|pullover|fleece|knitwear|cable.?knit|wool|heavy layer/.test(`${category} ${itemText}`.toLowerCase())) return false;
    if (effectiveTemperature <= 45 && category === "Shoes" && /sandal|slide|flip flop/.test(itemText)) return false;
  }

  const stadiumEvent = /\b(stadium|ballpark|baseball|truist park|arena|amphitheater|amphitheatre)\b/.test(title);
  const waterEvent = /\b(beach|pool|swim|swimming|resort|cabana|shore|yacht|boat day)\b/.test(title);
  const bagRestricted = /\b(can(?:not|'t|’t) (?:carry|bring)(?: a)? bag|no bags?|bag(?:s)? (?:not allowed|prohibited|restricted)|without a bag|stadium rules?)\b/.test(title);
  const pocketsRequired = /\b(?:need|require|must have|with)\s+pockets?\b|\bpockets?\s+(?:for|required|needed)\b/.test(title);

  if ((category === "Swimwear" || category === "Swim Wear" || /cover.?up|kaftan/.test(itemText)) && !waterEvent) {
    return false;
  }
  if (bagRestricted && new Set(["Handbags", "Bags"]).has(category)) return false;
  if (
    pocketsRequired
    && new Set(["Dresses", "Jumpsuits / Rompers", "Skirts"]).has(category)
    && !/\bpockets?|cargo|utility\b/.test(itemText)
  ) return false;

  if (stadiumEvent) {
    if (new Set(["Dresses", "Formalwear", "Formal Wear"]).has(category)) return false;
    if (
      /cocktail|evening|formal|gown|satin|sequined?|sequin|lace.?trim|tulle|organza|ballerina|ballet|studded bow/.test(itemText)
    ) return false;
    if (category === "Shoes" && /heel|platform|wedge|dress shoe|oxford|derby|ballerina|ballet|studded bow/.test(itemText)) return false;
    if (new Set(["Handbags", "Bags"]).has(category) && !/clear|stadium.?approved|small clutch/.test(itemText)) return false;
  }

  if (/workout|gym|yoga|pilates|tennis|run\b|training/.test(title)) {
    return ACCESSORY_CATEGORIES.has(category) || category === "Activewear" || category === "Athletic Wear";
  }

  if (/wedding|black tie|gala|formal/.test(title)) {
    return !new Set(["Activewear", "Athletic Wear", "Swimwear", "Lingerie / Sleepwear", "Underwear / Sleepwear"]).has(category);
  }

  return true;
}
