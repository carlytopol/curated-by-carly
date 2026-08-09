export const RECOMMENDATION_ENGINE_VERSION =
  "dress-my-day-v7-contextual-teamwear-and-cohesion";

export const RECOMMENDATION_DIAGNOSTICS_FEATURE_FLAGS = {
  recommendationDiagnostics: true,
  wardrobeMetadataAudit: true,
  metadataEnrichment: true,
  outfitKnowledgeGraph: "foundation-only",
  recommendationBehaviorChanged: false,
} as const;
