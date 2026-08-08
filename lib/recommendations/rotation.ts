export const RECENT_MAIN_RECOMMENDATION_HOLD_DAYS = 5;

export const AVAILABILITY_STATUSES = [
  "available",
  "dirty",
  "laundry",
  "repair",
  "packed",
  "storage",
  "loaned",
  "reserved",
  "unavailable",
  "unknown",
] as const;

export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export type RotationWardrobeItem = {
  id: string;
  category?: string | null;
  favorite?: boolean | null;
  wearCount?: number | null;
  lastWornAt?: string | null;
  availabilityStatus?: string | null;
  unavailableUntil?: string | null;
  availableOverrideAt?: string | null;
  lastRecommendedAt?: string | null;
  recommendationCount?: number | null;
};

const REPEATABLE_CATEGORY_NAMES = new Set([
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

export function isRepeatableCategory(category: string | null | undefined) {
  return Boolean(category && REPEATABLE_CATEGORY_NAMES.has(category));
}

export type EligibilityResult =
  | { eligible: true }
  | { eligible: false; reason: "unavailable" };

const DAY_MS = 86_400_000;

function validTime(value: string | null | undefined) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

export function evaluateItemEligibility(
  item: RotationWardrobeItem,
  recommendationDate = new Date(),
): EligibilityResult {
  const at = recommendationDate.getTime();
  const status = item.availabilityStatus || "available";
  const unavailableUntil = validTime(item.unavailableUntil);

  if ((status !== "available" && status !== "unknown") || (unavailableUntil !== null && unavailableUntil > at)) {
    return { eligible: false, reason: "unavailable" };
  }

  return { eligible: true };
}

export function rotationScore(item: RotationWardrobeItem, recommendationDate = new Date()) {
  const at = recommendationDate.getTime();
  const wearCount = Math.max(0, item.wearCount ?? 0);
  const recommendationCount = Math.max(0, item.recommendationCount ?? 0);
  const lastWorn = validTime(item.lastWornAt);
  const lastRecommended = validTime(item.lastRecommendedAt);

  let score = 50;

  // Favorites are useful evidence, but deliberately smaller than rotation signals.
  if (item.favorite) score += 3;

  score += Math.max(0, 18 - Math.min(18, wearCount * 2));
  score += Math.max(0, 8 - Math.min(8, recommendationCount));

  if (lastWorn === null) score += 12;
  else {
    const daysSinceWear = Math.max(0, (at - lastWorn) / DAY_MS);
    // Confirmed recent wear is a capped diversity signal, never an eligibility rule.
    if (daysSinceWear < 3) score -= 10;
    else if (daysSinceWear < 7) score -= 6;
    else if (daysSinceWear < 10) score -= 3;
    else score += Math.min(12, daysSinceWear / 3);
  }

  if ((item.availabilityStatus || "available") === "unknown") score -= 6;

  if (lastRecommended === null) score += 8;
  else {
    const daysSinceRecommendation = Math.max(0, (at - lastRecommended) / DAY_MS);
    if (daysSinceRecommendation < 3) score -= 22;
    else if (daysSinceRecommendation < 7) score -= 14;
    else if (daysSinceRecommendation < 14) score -= 7;
    else score += Math.min(8, daysSinceRecommendation / 7);
  }

  return Math.round(score * 100) / 100;
}

export function rankEligibleItems<T extends RotationWardrobeItem>(
  items: T[],
  recommendationDate = new Date(),
) {
  return items
    .filter((item) => evaluateItemEligibility(item, recommendationDate).eligible)
    .map((item) => ({ ...item, rotationScore: rotationScore(item, recommendationDate) }))
    .sort((a, b) => b.rotationScore - a.rotationScore || a.id.localeCompare(b.id));
}

export function preferFreshMainItems<T extends RotationWardrobeItem>(
  items: T[],
  recommendationDate = new Date(),
  minimumFreshMainItems = 2,
) {
  const cutoff = recommendationDate.getTime() - RECENT_MAIN_RECOMMENDATION_HOLD_DAYS * DAY_MS;
  const freshMain = items.filter((item) =>
    !isRepeatableCategory(item.category) &&
    (validTime(item.lastRecommendedAt) ?? -Infinity) < cutoff,
  );
  if (freshMain.length < minimumFreshMainItems) return items;

  // Preserve eligibility and the governed score order, but let sufficiently
  // broad wardrobes consider fresh foundations before recent repeats.
  const freshIds = new Set(freshMain.map((item) => item.id));
  return [
    ...items.filter((item) => freshIds.has(item.id)),
    ...items.filter((item) => !freshIds.has(item.id)),
  ];
}
