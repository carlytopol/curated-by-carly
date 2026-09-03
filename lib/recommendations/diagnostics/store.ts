import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecommendationDiagnostic } from "./types";

const RETENTION_DAYS = 30;

export async function persistRecommendationDiagnostic(
  supabase: SupabaseClient,
  diagnostic: RecommendationDiagnostic,
) {
  const expiresAt = new Date(
    new Date(diagnostic.createdAt).getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { error } = await supabase.from("recommendation_diagnostics").insert({
    id: diagnostic.traceId,
    user_id: diagnostic.userId,
    daily_event_id: diagnostic.dailyEventId,
    recommendation_set_id: diagnostic.recommendationSetId,
    engine_version: diagnostic.engineVersion,
    diagnostic_version: diagnostic.schemaVersion,
    payload: diagnostic,
    expires_at: expiresAt,
  });
  if (error) throw error;

  // Retention is owner-scoped and opportunistic; a scheduled database cleanup
  // may also remove expired rows without retaining calendar or style history.
  await supabase
    .from("recommendation_diagnostics")
    .delete()
    .eq("user_id", diagnostic.userId)
    .lt("expires_at", new Date().toISOString());
}
