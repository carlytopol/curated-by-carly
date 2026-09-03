import {
  classifyWardrobeRole,
  classifyWardrobeTraits,
} from "@/lib/recommendations/engine/item-taxonomy";
import type { EngineWardrobeItem } from "@/lib/recommendations/engine/types";
import type { MetadataInference } from "@/lib/wardrobe/metadata-enrichment";
import {
  ALL_EVIDENCE_CONSUMERS,
  GARMENT_EVIDENCE_VERSION,
  type CorrectionAuthority,
  type EvidenceSource,
  type GarmentEvidence,
  type GarmentEvidenceField,
  type GarmentEvidenceProvenance,
  type GarmentEvidenceValue,
} from "./contracts";

export type StoredMetadataSuggestion = MetadataInference & {
  id: string;
  status: "inferred" | "confirmed" | "needs_review" | "dismissed";
  modelVersion: string;
  updatedAt: string | null;
};

const confidenceLevel = (value: number) =>
  value >= 0.85 ? "high" as const : value >= 0.7 ? "medium" as const : "low" as const;

function evidence<T>(input: {
  ownerUserId: string;
  itemId: string;
  field: GarmentEvidenceField;
  value: T | null;
  provenance: GarmentEvidenceProvenance;
  numericConfidence: number;
  source: EvidenceSource;
  authority: CorrectionAuthority;
  state?: GarmentEvidenceValue<T>["state"];
  effectiveAt?: string | null;
  expiresAt?: string | null;
}): GarmentEvidenceValue<T> {
  return {
    schemaVersion: GARMENT_EVIDENCE_VERSION,
    ownerUserId: input.ownerUserId,
    clothingItemId: input.itemId,
    field: input.field,
    state: input.state ?? (input.value === null ? "unknown" : "known"),
    value: input.value,
    provenance: input.provenance,
    confidence: confidenceLevel(input.numericConfidence),
    numericConfidence: input.numericConfidence,
    authoritativeSource: input.source,
    correctionAuthority: input.authority,
    correctionHistory: [],
    effectiveAt: input.effectiveAt ?? null,
    expiresAt: input.expiresAt ?? null,
    permittedConsumers: [...ALL_EVIDENCE_CONSUMERS],
  };
}

const supplied = (value: unknown) =>
  value !== null && value !== undefined && (typeof value !== "string" || value.trim().length > 0);

/**
 * Creates the sole garment-fact projection used across recommendation features.
 * Accepted AI output fills unknowns only; it can never replace supplied metadata.
 */
export function buildGarmentEvidence(input: {
  ownerUserId: string;
  item: EngineWardrobeItem;
  suggestions?: StoredMetadataSuggestion[];
  generatedAt?: string;
}): GarmentEvidence {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const item = input.item;
  const traits = classifyWardrobeTraits({ ...item, garmentEvidence: undefined });
  const role = classifyWardrobeRole({ ...item, garmentEvidence: undefined });
  const fields: GarmentEvidence["fields"] = {};
  const putConfirmed = (field: GarmentEvidenceField, value: unknown, sourceField: string) => {
    if (!supplied(value)) return;
    fields[field] = evidence({
      ownerUserId: input.ownerUserId,
      itemId: item.id,
      field,
      value,
      provenance: "user-confirmed",
      numericConfidence: 1,
      source: { sourceType: "user-confirmed", sourceId: sourceField, observedAt: generatedAt },
      authority: "user",
    });
  };
  putConfirmed("category", item.category, "clothing_items.category");
  putConfirmed("subcategory", item.subcategory, "clothing_items.subcategory");
  putConfirmed("availability", item.availability_status ?? "available", "clothing_items.availability_status");

  if (role !== "other") {
    fields.role = evidence({
      ownerUserId: input.ownerUserId, itemId: item.id, field: "role", value: role,
      provenance: "derived-rule", numericConfidence: 0.9,
      source: { sourceType: "derived-rule", sourceId: "item-taxonomy.v1", observedAt: generatedAt },
      authority: "system-derived",
    });
  }
  const derived: Array<[GarmentEvidenceField, unknown, number]> = [
    ["formality", traits.formality, 0.72],
    ["material", traits.materials.length ? traits.materials : null, 0.72],
    ["warmth", traits.warmth, 0.72],
    ["walkability", traits.walkability, 0.72],
    ["has_pockets", traits.pockets, 0.78],
    ["pattern", traits.pattern === "unknown" ? null : traits.pattern, 0.72],
  ];
  for (const [field, value, numericConfidence] of derived) {
    if (!supplied(value)) continue;
    fields[field] = evidence({
      ownerUserId: input.ownerUserId, itemId: item.id, field, value,
      provenance: "derived-rule", numericConfidence,
      source: { sourceType: "derived-rule", sourceId: "item-taxonomy.v1", observedAt: generatedAt },
      authority: "system-derived",
    });
  }

  const suggestionFieldMap: Partial<Record<MetadataInference["field"], GarmentEvidenceField>> = {
    category: "category", subcategory: "subcategory", formality: "formality",
    material: "material", occasion: "occasion", has_pockets: "has_pockets",
    sleeve_length: "fit_behavior", fabric_weight: "fabric_weight",
    silhouette: "silhouette", fit_behavior: "fit_behavior", warmth: "warmth",
    breathability: "breathability", rain_tolerance: "rain_tolerance",
    walkability: "walkability", standing_tolerance: "standing_tolerance",
    pocket_function: "pocket_function", mobility: "mobility", pattern: "pattern",
    branding_intensity: "branding_intensity",
  };
  for (const suggestion of input.suggestions ?? []) {
    if (!["confirmed", "inferred"].includes(suggestion.status) || suggestion.confidence < 0.8) continue;
    const field = suggestionFieldMap[suggestion.field];
    if (!field || fields[field] || !supplied(suggestion.value)) continue;
    const confirmed = suggestion.status === "confirmed";
    const numericFields = new Set<GarmentEvidenceField>([
      "formality", "warmth", "walkability", "standing_tolerance",
    ]);
    const numericValue = numericFields.has(field) && typeof suggestion.value === "string"
      ? Number(suggestion.value)
      : suggestion.value;
    if (numericFields.has(field) && !Number.isFinite(numericValue)) continue;
    fields[field] = evidence({
      ownerUserId: input.ownerUserId, itemId: item.id, field,
      value: numericValue,
      provenance: confirmed ? "user-confirmed" : "bounded-ai-inference",
      numericConfidence: suggestion.confidence,
      source: {
        sourceType: confirmed ? "user-confirmed" : "bounded-ai-inference",
        sourceId: suggestion.id,
        observedAt: suggestion.updatedAt,
        modelVersion: suggestion.modelVersion,
      },
      authority: confirmed ? "user" : "inference",
    });
  }

  for (const field of [
    "formality", "silhouette", "fit_behavior", "material", "fabric_weight",
    "warmth", "breathability", "rain_tolerance", "walkability",
    "standing_tolerance", "has_pockets", "pocket_function", "mobility",
    "occasion", "pattern", "branding_intensity",
  ] as GarmentEvidenceField[]) {
    if (fields[field]) continue;
    fields[field] = evidence({
      ownerUserId: input.ownerUserId, itemId: item.id, field, value: null,
      provenance: "unknown", numericConfidence: 0,
      source: { sourceType: "unknown", sourceId: "not-observed", observedAt: null },
      authority: "none",
    });
  }
  return {
    schemaVersion: GARMENT_EVIDENCE_VERSION,
    ownerUserId: input.ownerUserId,
    clothingItemId: item.id,
    generatedAt,
    fields,
  };
}
