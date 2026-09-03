export type OutfitRecommendationResult = {
  summary: string;
  rationale: string;
  wardrobeItemIds: string[];
};

export function parseOutfitRecommendationResult(value: string): OutfitRecommendationResult | null {
  if (!value.trim()) return null;
  try {
    const parsed = JSON.parse(value) as Partial<OutfitRecommendationResult>;
    if (typeof parsed.summary !== "string" || !parsed.summary.trim()) return null;
    if (typeof parsed.rationale !== "string" || !Array.isArray(parsed.wardrobeItemIds)) return null;
    const wardrobeItemIds = parsed.wardrobeItemIds.filter((id): id is string => typeof id === "string" && id.length > 0);
    return { summary: parsed.summary.trim(), rationale: parsed.rationale.trim(), wardrobeItemIds };
  } catch {
    return null;
  }
}

export function parseOutfitRecommendationSet(value: string): OutfitRecommendationResult[] | null {
  if (!value.trim()) return null;
  try {
    const parsed = JSON.parse(value) as { options?: unknown };
    if (!Array.isArray(parsed.options) || parsed.options.length !== 3) return null;
    const options = parsed.options.map((option) =>
      parseOutfitRecommendationResult(JSON.stringify(option)),
    );
    return options.every((option): option is OutfitRecommendationResult => option !== null)
      ? options
      : null;
  } catch {
    return null;
  }
}
