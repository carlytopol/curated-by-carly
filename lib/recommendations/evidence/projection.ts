import type { EngineWardrobeItem } from "@/lib/recommendations/engine/types";
import type { MetadataInference } from "@/lib/wardrobe/metadata-enrichment";
import {
  buildGarmentEvidence,
  type StoredMetadataSuggestion,
} from "./garment-evidence";
import type { EvidenceConsumer, GarmentEvidence } from "./contracts";

export type MetadataSuggestionRow = {
  id: string;
  clothing_item_id: string;
  field_name: MetadataInference["field"];
  suggested_value: string | boolean | null;
  confidence: number;
  evidence?: string | null;
  provenance: string;
  model_version: string;
  status: string;
  updated_at?: string | null;
};

/**
 * Shared evidence projection boundary for Dress My Day, Travel, Personal
 * Shopper, diagnostics, and future consumers.
 */
export function attachCanonicalGarmentEvidence<T extends EngineWardrobeItem>(input: {
  ownerUserId: string;
  wardrobe: T[];
  suggestions?: MetadataSuggestionRow[];
  generatedAt?: string;
}): Array<T & { garmentEvidence: ReturnType<typeof buildGarmentEvidence> }> {
  const suggestionsByItem = new Map<string, StoredMetadataSuggestion[]>();
  for (const row of input.suggestions ?? []) {
    if (row.provenance !== "ai-inference" || !["inferred", "confirmed", "needs_review", "dismissed"].includes(row.status)) continue;
    const suggestion: StoredMetadataSuggestion = {
      id: row.id,
      field: row.field_name,
      value: row.suggested_value,
      confidence: row.confidence,
      evidence: row.evidence ?? "Retained metadata evidence.",
      provenance: "ai-inference",
      status: row.status as StoredMetadataSuggestion["status"],
      modelVersion: row.model_version,
      updatedAt: row.updated_at ?? null,
    };
    suggestionsByItem.set(row.clothing_item_id, [
      ...(suggestionsByItem.get(row.clothing_item_id) ?? []),
      suggestion,
    ]);
  }
  return input.wardrobe.map((item) => ({
    ...item,
    garmentEvidence: buildGarmentEvidence({
      ownerUserId: input.ownerUserId,
      item,
      suggestions: suggestionsByItem.get(item.id),
      generatedAt: input.generatedAt,
    }),
  }));
}

export function projectGarmentEvidenceForConsumer(
  evidence: GarmentEvidence | undefined,
  consumer: EvidenceConsumer,
) {
  if (!evidence) return null;
  return Object.values(evidence.fields)
    .filter((field) => field.permittedConsumers.includes(consumer))
    .map(({ field, state, value, confidence, provenance, correctionAuthority }) => ({
      field,
      state,
      value,
      confidence,
      provenance,
      correctionAuthority,
    }));
}
