export type WearAvailabilityChoice = "available" | "laundry";

const LAUNDRY_DEFAULT_CATEGORIES = new Set([
  "Activewear",
  "Athletic Wear",
  "Hosiery",
  "Underwear",
  "Sleepwear",
]);

const AVAILABLE_DEFAULT_CATEGORIES = new Set([
  "Accessories",
  "Handbags",
  "Bags",
  "Shoes",
  "Jewelry",
  "Watches & Jewelry",
  "Perfumes / Fragrances",
  "Colognes / Grooming",
  "Outerwear",
]);

export function suggestedAvailabilityAfterWear(category: string | null): WearAvailabilityChoice {
  if (category && LAUNDRY_DEFAULT_CATEGORIES.has(category)) return "laundry";
  if (category && AVAILABLE_DEFAULT_CATEGORIES.has(category)) return "available";
  // Context-dependent garments remain available by default, but the review
  // sheet requires the customer to see and affirm or change every choice.
  return "available";
}

export function isWearAvailabilityChoice(value: unknown): value is WearAvailabilityChoice {
  return value === "available" || value === "laundry";
}
