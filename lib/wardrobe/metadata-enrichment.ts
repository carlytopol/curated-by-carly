export const METADATA_ENRICHMENT_VERSION = "wardrobe-metadata-enrichment.v2" as const;
/** Only reliable inference may fill an unknown. Everything below remains reviewable. */
export const METADATA_REVIEW_THRESHOLD = 0.8;

export type EnrichmentField =
  | "department"
  | "category"
  | "subcategory"
  | "item_name"
  | "designer"
  | "size"
  | "color"
  | "season"
  | "material"
  | "formality"
  | "occasion"
  | "has_pockets"
  | "shoe_type"
  | "sleeve_length"
  | "fabric_weight"
  | "silhouette"
  | "fit_behavior"
  | "warmth"
  | "breathability"
  | "rain_tolerance"
  | "walkability"
  | "standing_tolerance"
  | "pocket_function"
  | "mobility"
  | "pattern"
  | "branding_intensity";

export type MetadataInference = {
  field: EnrichmentField;
  value: string | boolean | null;
  confidence: number;
  evidence: string;
  provenance: "ai-inference";
};

export type MetadataEnrichmentPlan = {
  version: typeof METADATA_ENRICHMENT_VERSION;
  itemId: string;
  acceptedInferences: MetadataInference[];
  needsReview: MetadataInference[];
  ignoredBecauseConfirmed: MetadataInference[];
};

export type CanonicalWardrobeMetadata = Partial<Record<EnrichmentField, unknown>> & {
  id: string;
};

const present = (value: unknown) =>
  value !== null && value !== undefined && (typeof value !== "string" || value.trim().length > 0);

/**
 * Produces a provenance-bearing inference overlay. Canonical wardrobe fields
 * are never mutated here, so confirmed customer data cannot be overwritten.
 */
export function planMetadataEnrichment(
  current: CanonicalWardrobeMetadata,
  inferences: MetadataInference[],
): MetadataEnrichmentPlan {
  const acceptedInferences: MetadataInference[] = [];
  const needsReview: MetadataInference[] = [];
  const ignoredBecauseConfirmed: MetadataInference[] = [];
  const seen = new Set<EnrichmentField>();

  for (const inference of inferences) {
    if (seen.has(inference.field) || !present(inference.value)) continue;
    seen.add(inference.field);
    const normalized = {
      ...inference,
      confidence: Math.max(0, Math.min(1, inference.confidence)),
      provenance: "ai-inference" as const,
    };
    if (present(current[inference.field])) {
      ignoredBecauseConfirmed.push(normalized);
    } else if (normalized.confidence < METADATA_REVIEW_THRESHOLD) {
      needsReview.push(normalized);
    } else {
      acceptedInferences.push(normalized);
    }
  }

  return {
    version: METADATA_ENRICHMENT_VERSION,
    itemId: current.id,
    acceptedInferences,
    needsReview,
    ignoredBecauseConfirmed,
  };
}
