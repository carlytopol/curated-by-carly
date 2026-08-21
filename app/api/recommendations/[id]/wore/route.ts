import { randomUUID } from "node:crypto";
import { requireCurrentUserId } from "@/lib/auth/require-current-user";
import { buildWardrobeHistoryNotes } from "@/lib/history/wardrobe-history";
import { historyCoverPath } from "@/lib/history/fit-check-photo";
import { createClient } from "@/lib/supabase/server";
import { isWearAvailabilityChoice } from "@/lib/recommendations/wear-review";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireCurrentUserId();
    const { id } = await context.params;
    const payload = await request.json().catch(() => null) as { items?: Array<{ id?: unknown; status?: unknown }> } | null;
    if (!payload?.items?.length || payload.items.some((item) => typeof item.id !== "string" || !isWearAvailabilityChoice(item.status))) {
      return Response.json({ error: "Review each worn piece and choose whether it is available again or ready for laundry." }, { status: 400 });
    }
    const supabase = await createClient();

    const { data: recommendation, error: recommendationError } = await supabase
      .from("outfit_recommendations")
      .select("id,summary,rationale,status,outfit_id,worn_at,daily_event_id,fit_check_path,recommendation_items(position,clothing_item_id,clothing_items(id,wear_count,category))")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    if (recommendationError) throw recommendationError;
    if (!recommendation) return Response.json({ error: "Recommendation not found." }, { status: 404 });

    if (recommendation.status === "worn" && recommendation.outfit_id) {
      const { data: existingOutfit, error: existingOutfitError } = await supabase
        .from("outfits")
        .select("id")
        .eq("id", recommendation.outfit_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (existingOutfitError) throw existingOutfitError;
      if (existingOutfit) {
        return Response.json({
          outfitId: existingOutfit.id,
          status: "already-recorded",
        });
      }
    }

    const { data: event, error: eventError } = await supabase
      .from("daily_events")
      .select("event_date,starts_at,title,location,dress_code")
      .eq("id", recommendation.daily_event_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (eventError) throw eventError;
    if (!event) return Response.json({ error: "Event not found." }, { status: 404 });

    const allRecommendationItems = ((recommendation.recommendation_items ?? []) as Array<{
      position: number;
      clothing_item_id: string;
      clothing_items: { id: string; wear_count: number; category: string | null } | Array<{ id: string; wear_count: number; category: string | null }> | null;
    }>).flatMap((link) => {
      const wardrobeItem = Array.isArray(link.clothing_items) ? link.clothing_items[0] : link.clothing_items;
      return wardrobeItem?.id === link.clothing_item_id ? [{ ...link, clothing_items: [wardrobeItem] }] : [];
    });
    const selectedById = new Map(payload.items.map((item) => [item.id as string, item.status as "available" | "laundry"]));
    const recommendationIds = new Set(allRecommendationItems.map((item) => item.clothing_item_id));
    if ([...selectedById.keys()].some((itemId) => !recommendationIds.has(itemId))) {
      return Response.json({ error: "This look changed while the review was open. Close the review and choose ‘I wore this’ again." }, { status: 409 });
    }
    const recommendationItems = allRecommendationItems.filter((item) => selectedById.has(item.clothing_item_id));
    if (!recommendationItems.length) {
      return Response.json({ error: "This recommendation does not contain linked wardrobe pieces. Please create a fresh recommendation." }, { status: 409 });
    }
    const wornAt = event.starts_at || `${event.event_date}T12:00:00.000Z`;
    const outfitId = randomUUID();
    const notes = buildWardrobeHistoryNotes({
      rationale: recommendation.rationale,
      location: event.location,
      dressCode: event.dress_code,
    });
    const now = new Date().toISOString();
    const { error: outfitError } = await supabase.from("outfits").insert({
      id: outfitId,
      user_id: userId,
      title: recommendation.summary,
      occasion: event.title,
      notes: notes || null,
      cover_path: historyCoverPath(recommendation.fit_check_path),
      worn_at: wornAt,
      use_as_style_signal: false,
      updated_at: now,
    });
    if (outfitError) throw outfitError;
    const { error: linkError } = await supabase.from("outfit_items").insert(
      recommendationItems.map((link) => ({
        outfit_id: outfitId,
        clothing_item_id: link.clothing_item_id,
        position: link.position,
      })),
    );
    if (linkError) {
      await supabase.from("outfits").delete().eq("id", outfitId).eq("user_id", userId);
      throw linkError;
    }

    const { data: updatedRecommendation, error: updateError } = await supabase
      .from("outfit_recommendations")
      .update({ outfit_id: outfitId, worn_at: wornAt, selected_at: now, status: "worn", fit_check_path: null })
      .eq("id", id)
      .eq("user_id", userId)
      .neq("status", "worn")
      .select("id")
      .maybeSingle();
    if (updateError) {
      await supabase.from("outfits").delete().eq("id", outfitId).eq("user_id", userId);
      throw updateError;
    }

    if (!updatedRecommendation) {
      await supabase.from("outfits").delete().eq("id", outfitId).eq("user_id", userId);
      const { data: current } = await supabase
        .from("outfit_recommendations")
        .select("outfit_id")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (current?.outfit_id) {
        return Response.json({ outfitId: current.outfit_id, status: "already-recorded" });
      }
      throw new Error("Recommendation history transition was not applied.");
    }

    const itemUpdates = await Promise.all(recommendationItems.map((link) => {
      const wardrobeItem = link.clothing_items[0];
      const nextStatus = selectedById.get(link.clothing_item_id)!;
      return supabase
        .from("clothing_items")
        .update({
          last_worn_at: wornAt,
          wear_count: (wardrobeItem?.wear_count ?? 0) + 1,
          availability_status: nextStatus,
          unavailable_until: null,
          available_override_at: nextStatus === "available" ? now : null,
          updated_at: now,
        })
        .eq("id", link.clothing_item_id)
        .eq("user_id", userId);
    }));
    const itemUpdateError = itemUpdates.find((result) => result.error)?.error;
    if (itemUpdateError) throw itemUpdateError;

    return Response.json({
      outfitId,
      status: "recorded",
      eventDate: event.event_date,
      eventTitle: event.title,
      outfitSummary: recommendation.summary,
      availabilityReviewed: true,
    });
  } catch (error) {
    console.error("Unable to add recommendation to Wardrobe History.", error);
    return Response.json({ error: "We could not add this look to Wardrobe History." }, { status: 500 });
  }
}
