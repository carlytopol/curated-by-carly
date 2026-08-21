import { randomUUID } from "node:crypto";
import { AuthenticationRequiredError, requireCurrentUserId } from "@/lib/auth/require-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { enforceRateLimit, RateLimitError, rateLimitResponse } from "@/lib/security/rate-limit";
import { preferFreshMainItems, rankEligibleItems } from "@/lib/recommendations/rotation";
import type { IncompatibleWardrobePair } from "@/lib/recommendations/pair-preferences";
import { classifyOccasion, inferDressCode } from "@/lib/daily-agenda/classify";
import { buildContextEvidence } from "@/lib/recommendations/engine/context-evidence";
import { generateGovernedRecommendations } from "@/lib/recommendations/engine/governed-engine";
import { researchVenue } from "@/lib/recommendations/engine/venue-research";
import { resolveExplicitlyRequestedItemIds } from "@/lib/recommendations/engine/explicit-item-request";
import { wardrobeItemLabel } from "@/lib/wardrobe/item-label";
import type { DailyAgendaItem } from "@/types/daily-agenda";
import { resolveFeatureStyleProfile } from "@/lib/data/style-profile";
import { toEngineStyleProfile, withProfileNotes } from "@/lib/recommendations/engine/style-profile";
import {
  RECOMMENDATION_DIAGNOSTICS_FEATURE_FLAGS,
  RECOMMENDATION_ENGINE_VERSION,
} from "@/lib/recommendations/engine-version";
import { buildRecommendationDiagnostic } from "@/lib/recommendations/diagnostics/build-inspector";
import { persistRecommendationDiagnostic } from "@/lib/recommendations/diagnostics/store";
import { attachCanonicalGarmentEvidence, type MetadataSuggestionRow } from "@/lib/recommendations/evidence/projection";
import { createClient } from "@/lib/supabase/server";
import { resolveServerRecommendationEngine } from "@/lib/recommendations/v2/account-routing.server";
import { generateMainAppV2Recommendation } from "@/lib/recommendations/v2/main-app.server";

const ENGINE_VERSION = RECOMMENDATION_ENGINE_VERSION;

type ClosetRow = {
  id: string;
  designer: string | null;
  item_name: string | null;
  department: string;
  category: string | null;
  subcategory: string | null;
  subcategory_2: string | null;
  size: string | null;
  color: string | null;
  season: string | null;
  season_2: string | null;
  season_3: string | null;
  favorite: boolean;
  styling_suggestion: string | null;
  last_worn_at: string | null;
  wear_count: number;
  availability_status: string;
  unavailable_until: string | null;
  available_override_at: string | null;
  last_recommended_at: string | null;
  recommendation_count: number;
  analysis_metadata?: unknown;
};

function recommendationDate(eventDate: string) {
  const value = new Date(`${eventDate}T12:00:00.000Z`);
  return Number.isNaN(value.getTime()) ? new Date() : value;
}

export async function POST(request: Request, context: RouteContext<"/api/daily-events/[id]/recommendations">) {
  try {
    const userId = await requireCurrentUserId();
    enforceRateLimit(userId, "outfit-recommendation", { limit: 20, windowMs: 10 * 60 * 1000 });
    const { id } = await context.params;
    const requestContext = await request.json().catch(() => null);
    const engineRoute = resolveServerRecommendationEngine(userId);
    if (engineRoute.engine === "v2") {
      const v2 = await generateMainAppV2Recommendation({
        client: await createClient(),
        userId,
        eventId: id,
        requestContext,
      });
      return Response.json(v2.body, { status: v2.status });
    }
    const weather = requestContext?.weather ?? requestContext;
    const intention = typeof requestContext?.intention === "string" ? requestContext.intention.slice(0, 160) : null;
    // Authentication is established above. Keep every subsequent read and
    // write explicitly owner-scoped, while using the server-only client so a
    // stale or clock-skewed browser JWT cannot detach a saved correction from
    // the recommendation regenerated immediately afterward.
    const supabase = createAdminClient();
    const [eventResult, closetResult, metadataResult, profileResult, recentOutfitResult, recentRecommendationResult, pairPreferenceResult, observedSignalResult, featureStyleProfile] = await Promise.all([
      supabase.from("daily_events").select("id,event_date,starts_at,title,location,dress_code,notes").eq("id", id).eq("user_id", userId).maybeSingle(),
      supabase.from("clothing_items").select("id,designer,item_name,department,category,subcategory,subcategory_2,size,color,season,season_2,season_3,favorite,styling_suggestion,analysis_metadata,last_worn_at,wear_count,availability_status,unavailable_until,available_override_at,last_recommended_at,recommendation_count").eq("user_id", userId).order("category").order("item_name"),
      supabase.from("wardrobe_metadata_suggestions").select("id,clothing_item_id,field_name,suggested_value,confidence,evidence,provenance,model_version,status,updated_at").eq("user_id", userId),
      supabase.from("user_profiles").select("style_notes,fit_notes,proportions,updated_at").eq("user_id", userId).maybeSingle(),
      supabase.from("outfits").select("id,title,occasion,worn_at,use_as_style_signal,outfit_items(clothing_item_id)").eq("user_id", userId).eq("use_as_style_signal", true).not("worn_at", "is", null).order("worn_at", { ascending: false }).limit(50),
      supabase.from("outfit_recommendations").select("id,status,created_at,selected_at,worn_at,daily_event_id,recommendation_items(clothing_item_id)").eq("user_id", userId).order("created_at", { ascending: false }).limit(75),
      supabase.from("wardrobe_pair_preferences").select("item_a_id,item_b_id,reason").eq("user_id", userId).eq("preference", "incompatible"),
      supabase.from("observed_style_signals").select("id,signal_type,subject,value,context,source_record_type,source_record_id,strength,occurred_at").eq("user_id", userId).order("occurred_at", { ascending: false }).limit(100),
      resolveFeatureStyleProfile(userId, "dress-my-day"),
    ]);
    const queryError = eventResult.error || closetResult.error || metadataResult.error || profileResult.error || recentOutfitResult.error || recentRecommendationResult.error || pairPreferenceResult.error || observedSignalResult.error;
    if (queryError) throw queryError;
    const event = eventResult.data;
    if (!event) return Response.json({ error: "Event not found." }, { status: 404 });

    const closet = attachCanonicalGarmentEvidence({
      ownerUserId: userId,
      wardrobe: (closetResult.data ?? []) as ClosetRow[],
      suggestions: (metadataResult.data ?? []) as MetadataSuggestionRow[],
    });
    if (!closet.length) return Response.json({ error: "Add pieces to your Wardrobe before requesting a look." }, { status: 400 });

    const eventRecommendationDate = recommendationDate(event.event_date);
    const rankedCloset = preferFreshMainItems(rankEligibleItems(
      closet.map((item) => ({
        ...item,
        wearCount: item.wear_count,
        lastWornAt: item.last_worn_at,
        availabilityStatus: item.availability_status,
        unavailableUntil: item.unavailable_until,
        availableOverrideAt: item.available_override_at,
        lastRecommendedAt: item.last_recommended_at,
        recommendationCount: item.recommendation_count,
      })),
      eventRecommendationDate,
    ), eventRecommendationDate);
    const incompatiblePairs: IncompatibleWardrobePair[] = (pairPreferenceResult.data ?? []).map((pair) => ({
      itemAId: pair.item_a_id,
      itemBId: pair.item_b_id,
      reason: pair.reason,
    }));

    const eventEvidence = { title: event.title, location: event.location, isAllDay: !event.starts_at };
    const occasionClassification = classifyOccasion(eventEvidence);
    const inferredDressCode = inferDressCode(eventEvidence, occasionClassification);
    const agendaItem: DailyAgendaItem = {
      id: event.id, source: "manual", title: event.title,
      startTime: event.starts_at, endTime: null, isAllDay: !event.starts_at,
      location: event.location, occasionClassification,
      dressCodeInference: event.dress_code ? {
        dressCode: event.dress_code, confidence: "high", source: "user",
        reasonCode: "user_stated_dress_code", correctedByUser: true,
      } : inferredDressCode,
      provider: null, calendarName: null, isReadOnly: false, userCorrection: null,
      hasTimeConflict: false, overlapsWithItemIds: [],
    };
    const venueRules = await researchVenue(event.location);
    const contextEvidence = buildContextEvidence({
      agendaItem,
      notes: event.notes,
      statedDressCode: event.dress_code,
      intention,
      weather,
      venueRules,
    });
    const governed = generateGovernedRecommendations({
      wardrobe: rankedCloset,
      context: contextEvidence,
      userId,
      styleProfile: withProfileNotes(toEngineStyleProfile(featureStyleProfile), userId, profileResult.data ? {
        styleNotes: profileResult.data.style_notes,
        fitNotes: profileResult.data.fit_notes,
        proportions: profileResult.data.proportions,
        updatedAt: profileResult.data.updated_at,
      } : null),
      styleEvidence: {
        wornOutfits: (recentOutfitResult.data ?? []).map((outfit) => ({
          id: outfit.id,
          itemIds: (outfit.outfit_items ?? []).map((item) => item.clothing_item_id),
          occasion: outfit.occasion,
          wornAt: outfit.worn_at!,
        })),
        recommendationFeedback: [
          ...(recentRecommendationResult.data ?? []).map((recommendation) => ({
            id: recommendation.id,
            itemIds: (recommendation.recommendation_items ?? []).map((item) => item.clothing_item_id),
            occasion: recommendation.daily_event_id === event.id ? event.title : null,
            status: recommendation.status,
            occurredAt: recommendation.selected_at ?? recommendation.worn_at ?? recommendation.created_at,
          })),
          ...(pairPreferenceResult.data ?? []).map((pair) => ({
            id: `${pair.item_a_id}:${pair.item_b_id}`,
            itemIds: [pair.item_a_id, pair.item_b_id],
            occasion: event.title,
            status: "corrected",
            occurredAt: event.event_date,
            reason: pair.reason,
          })),
        ],
        behavioralSignals: featureStyleProfile.learningEnabled
          ? (observedSignalResult.data ?? [])
            .filter((signal) => ["high", "medium", "low"].includes(signal.strength))
            .map((signal) => ({
              id: signal.id,
              subject: signal.subject,
              value: signal.value,
              context: signal.context && typeof signal.context === "object"
                ? Object.fromEntries(Object.entries(signal.context).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
                : {},
              strength: signal.strength as "high" | "medium" | "low",
              sourceRecordType: signal.source_record_type,
              sourceRecordId: signal.source_record_id,
            }))
          : [],
      },
      incompatiblePairs,
      optionCount: 3,
      eventPolicyEnabled: true,
      requiredItemIds: resolveExplicitlyRequestedItemIds(rankedCloset, [event.notes, intention].filter(Boolean).join(". ")),
    });
    const itemLabels = new Map(
      rankedCloset.map((item) => [item.id, wardrobeItemLabel(item)]),
    );
    console.info("Dress My Day deterministic validation summary.", {
      eventId: event.id,
      engineVersion: ENGINE_VERSION,
      evaluatedCandidateCount: governed.rejectedCandidateCount + governed.options.length,
      retainedDiagnosticCount: governed.diagnostics.length,
      approvedOutfits: governed.options.map((option) => ({
        itemIds: option.itemIds,
        template: option.composition.foundation.kind,
        score: option.assessment.score,
      })),
      eligibleItemCount: governed.eligibilityAudit.filter((audit) => audit.eligible).length,
      auditedItemCount: governed.eligibilityAudit.length,
    });
    if (!governed.options.length) {
      const diagnostic = buildRecommendationDiagnostic({
        userId,
        dailyEventId: event.id,
        engineVersion: ENGINE_VERSION,
        featureFlags: RECOMMENDATION_DIAGNOSTICS_FEATURE_FLAGS,
        result: governed,
        itemLabels,
      });
      await persistRecommendationDiagnostic(supabase, diagnostic).catch((diagnosticError) => {
        console.warn("Recommendation diagnostic could not be persisted.", {
          traceId: diagnostic.traceId,
          message: diagnosticError instanceof Error ? diagnosticError.message : "unknown",
        });
      });
      const rejectionCounts = governed.diagnostics.reduce<Record<string, number>>((counts, trace) => {
        for (const reason of trace.rejectionReasons) counts[reason] = (counts[reason] ?? 0) + 1;
        return counts;
      }, {});
      console.warn("Governed recommendation rejected every candidate.", {
        eventId: event.id,
        unknowns: governed.context.unknowns,
        rejectedCandidateCount: governed.rejectedCandidateCount,
        rejectionCounts,
      });
      const error = rejectionCounts["pockets-required"]
        ? "Your plan is saved. Because you need to go without a bag, Curated could not verify pockets on an otherwise suitable complete look. Add “has pockets” to an eligible item’s Styling Suggestion, then try again."
        : rejectionCounts["missing-shoes"] || rejectionCounts["stadium-footwear"] || rejectionCounts["not-walkable"]
          ? "Your plan is saved. Curated could not verify suitable, walkable footwear for this complete look."
          : "I could not find a complete look that honestly satisfies this day. Review availability or add a missing detail, and I will consider it again.";
      return Response.json({
        error,
        engineVersion: ENGINE_VERSION,
        confidence: "low",
        unknowns: governed.context.unknowns,
        rejectionReasons: Object.keys(rejectionCounts),
      }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }
    const options = governed.options.map((option) => ({
      summary: option.summary,
      rationale: option.rationale,
      wardrobeItemIds: option.itemIds,
    }));

    const setId = randomUUID();
    const rows = options.map((option, optionIndex) => ({
      id: randomUUID(),
      user_id: userId,
      daily_event_id: event.id,
      recommendation_set_id: setId,
      option_index: optionIndex,
      engine_version: ENGINE_VERSION,
      preference_snapshot: {
        schemaVersion: featureStyleProfile.schemaVersion,
        preferenceVersionIds: featureStyleProfile.preferenceVersionIds,
      },
      summary: option.summary,
      rationale: option.rationale,
      status: "suggested",
    }));
    const { data: savedRows, error: saveError } = await supabase
      .from("outfit_recommendations")
      .insert(rows)
      .select("id,summary,rationale,status,option_index");
    if (saveError) throw saveError;

    const recommendationItems = options.flatMap((option, optionIndex) =>
      [...new Set(option.wardrobeItemIds)].map((clothingItemId, position) => ({
        recommendation_id: rows[optionIndex].id,
        clothing_item_id: clothingItemId,
        position,
      })),
    );
    const { error: itemSaveError } = await supabase.from("recommendation_items").insert(recommendationItems);
    if (itemSaveError) {
      await supabase.from("outfit_recommendations").delete().eq("recommendation_set_id", setId).eq("user_id", userId);
      throw itemSaveError;
    }
    const diagnostic = buildRecommendationDiagnostic({
      userId,
      dailyEventId: event.id,
      recommendationSetId: setId,
      engineVersion: ENGINE_VERSION,
      featureFlags: RECOMMENDATION_DIAGNOSTICS_FEATURE_FLAGS,
      result: governed,
      itemLabels,
    });
    await persistRecommendationDiagnostic(supabase, diagnostic).catch((diagnosticError) => {
      console.warn("Recommendation diagnostic could not be persisted.", {
        traceId: diagnostic.traceId,
        message: diagnosticError instanceof Error ? diagnosticError.message : "unknown",
      });
    });

    const now = new Date().toISOString();
    const recommendedCounts = new Map<string, number>();
    recommendationItems.forEach(({ clothing_item_id }) => recommendedCounts.set(clothing_item_id, (recommendedCounts.get(clothing_item_id) ?? 0) + 1));
    await Promise.all([...recommendedCounts].map(([itemId, addedCount]) => {
      const item = rankedCloset.find((candidate) => candidate.id === itemId);
      return supabase.from("clothing_items").update({
        last_recommended_at: now,
        recommendation_count: (item?.recommendation_count ?? 0) + addedCount,
        updated_at: now,
      }).eq("id", itemId).eq("user_id", userId);
    }));

    const closetById = new Map(rankedCloset.map((item) => [item.id, item]));
    const savedByIndex = new Map((savedRows ?? []).map((row) => [row.option_index, row]));
    return Response.json({
      engineVersion: ENGINE_VERSION,
      recommendationSetId: setId,
      confidence: governed.confidence,
      unknowns: governed.context.unknowns,
      options: options.map((option, optionIndex) => {
        const saved = savedByIndex.get(optionIndex)!;
        return {
          id: saved.id,
          summary: saved.summary,
          rationale: saved.rationale,
          status: saved.status,
          optionIndex,
          wardrobeItems: [...new Set(option.wardrobeItemIds)].map((itemId) => {
            const item = closetById.get(itemId)!;
            return {
              id: itemId,
              label: wardrobeItemLabel(item),
              category: item.category,
            };
          }),
        };
      }),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({
        error: "Your session has expired. Sign in again, then ask Curated to reconsider this event.",
        code: "authentication_required",
      }, { status: 401 });
    }
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    console.error("Recommendation unavailable.", error);
    return Response.json({ error: "Your wardrobe recommendation is unavailable right now." }, { status: 503 });
  }
}
