import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveFeatureStyleProfile } from "@/lib/data/style-profile";
import { toEngineStyleProfile } from "@/lib/recommendations/engine/style-profile";
import { auditWardrobeMetadata } from "@/lib/wardrobe/metadata-audit";
import {
  RECOMMENDATION_DIAGNOSTICS_FEATURE_FLAGS,
  RECOMMENDATION_ENGINE_VERSION,
} from "@/lib/recommendations/engine-version";
import type { RecommendationDiagnostic } from "./types";
import { attachCanonicalGarmentEvidence, type MetadataSuggestionRow } from "@/lib/recommendations/evidence/projection";

export async function getFounderDashboardData(userId: string) {
  // This function is called only after the page has authenticated and authorized
  // the founder. Use the server-only admin client for these owner-scoped reads so
  // a newly issued browser token is not unnecessarily revalidated by PostgREST.
  const supabase = createAdminClient();
  const [wardrobe, diagnostics, suggestions, graph, styleProfile] = await Promise.all([
    supabase.from("clothing_items")
      .select("id,designer,item_name,department,category,subcategory,subcategory_2,size,color,season,season_2,season_3,styling_suggestion,analysis_status,analysis_metadata")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("recommendation_diagnostics")
      .select("id,created_at,engine_version,payload")
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("wardrobe_metadata_suggestions")
      .select("id,clothing_item_id,field_name,suggested_value,confidence,evidence,provenance,model_version,status,updated_at")
      .eq("user_id", userId),
    supabase.from("outfit_knowledge_edges")
      .select("relationship,confidence")
      .eq("user_id", userId),
    resolveFeatureStyleProfile(userId, "dress-my-day", supabase),
  ]);
  if (wardrobe.error) throw new Error(`Wardrobe audit unavailable: ${wardrobe.error.message}`);
  const infrastructureWarnings = [
    diagnostics.error ? "Diagnostic storage migration has not been applied or is unavailable." : null,
    suggestions.error ? "Metadata enrichment storage migration has not been applied or is unavailable." : null,
    graph.error ? "Knowledge graph storage migration has not been applied or is unavailable." : null,
  ].filter((warning): warning is string => Boolean(warning));
  const resolvedStyleProfile = toEngineStyleProfile(styleProfile);
  const latest = (diagnostics.data?.[0]?.payload ?? null) as RecommendationDiagnostic | null;
  const canonicalWardrobe = attachCanonicalGarmentEvidence({
    ownerUserId: userId,
    wardrobe: wardrobe.data ?? [],
    suggestions: (suggestions.data ?? []) as MetadataSuggestionRow[],
  });
  const graphCounts = (graph.data ?? []).reduce<Record<string, number>>((counts, edge) => {
    counts[edge.relationship] = (counts[edge.relationship] ?? 0) + 1;
    return counts;
  }, {});
  return {
    engineVersion: RECOMMENDATION_ENGINE_VERSION,
    featureFlags: RECOMMENDATION_DIAGNOSTICS_FEATURE_FLAGS,
    metadataAudit: auditWardrobeMetadata(canonicalWardrobe),
    suggestionSummary: {
      inferred: (suggestions.data ?? []).filter((item) => item.status === "inferred").length,
      needsReview: (suggestions.data ?? []).filter((item) => item.status === "needs_review").length,
    },
    styleProfile: {
      status: resolvedStyleProfile.status,
      version: resolvedStyleProfile.version,
      explicitOrResolvedPreferenceCount: resolvedStyleProfile.preferences.length,
      learningEnabled: styleProfile.learningEnabled,
    },
    wardrobeEvidence: latest?.wardrobeEvidenceInputs ?? null,
    recommendationConfidence: latest?.overallConfidence ?? null,
    latestDiagnostic: latest,
    recentDiagnostics: (diagnostics.data ?? []).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      engineVersion: row.engine_version,
    })),
    graphCounts,
    infrastructureWarnings,
  };
}
