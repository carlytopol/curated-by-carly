import { requireCurrentUserId } from "@/lib/auth/require-current-user";
import { createClient } from "@/lib/supabase/server";
import { validateCreateClothingItem } from "@/lib/validation/clothing-item";
import { signPrivateImage } from "@/lib/media/private-storage";
import { PRIVATE_MEDIA_BUCKET } from "@/lib/media/private-storage";
import { normalizeWardrobeCategory, type WardrobeDepartment } from "@/types/wardrobe";
import { AVAILABILITY_STATUSES } from "@/lib/recommendations/rotation";
import { createAdminClient } from "@/lib/supabase/admin";

type PhotoRow = { id: string; sort_order: number; storage_path: string };

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireCurrentUserId();
    const { id } = await context.params;
    const supabase = await createClient();
    const { data, error } = await supabase.from("clothing_items").select("id,designer,item_name,department,category,subcategory,subcategory_2,size,color,season,season_2,season_3,favorite,styling_suggestion,image_url,last_worn_at,wear_count,availability_status,unavailable_until,recommendation_count,clothing_photos(id,sort_order,storage_path)").eq("id", id).eq("user_id", userId).maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: "Piece not found." }, { status: 404 });
    const photos = ((data.clothing_photos ?? []) as PhotoRow[]).sort((a, b) => a.sort_order - b.sort_order);
    return Response.json({
      id: data.id,
      designer: data.designer,
      itemName: data.item_name,
      department: data.department,
      category: normalizeWardrobeCategory(data.department as WardrobeDepartment, data.category),
      subcategory: data.subcategory,
      subcategory2: data.subcategory_2,
      size: data.size,
      color: data.color,
      season: data.season,
      season2: data.season_2,
      season3: data.season_3,
      favorite: data.favorite,
      stylingSuggestion: data.styling_suggestion,
      lastWornAt: data.last_worn_at,
      wearCount: data.wear_count,
      availabilityStatus: data.availability_status,
      unavailableUntil: data.unavailable_until,
      recommendationCount: data.recommendation_count,
      imageUrl: data.image_url,
      photos: await Promise.all(photos.map(async (photo) => ({ id: photo.id, sortOrder: photo.sort_order, url: await signPrivateImage(photo.storage_path) }))),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Unable to open wardrobe piece.", error);
    return Response.json({ error: "We could not open this piece." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireCurrentUserId();
    const { id } = await context.params;
    const body: unknown = await request.json();
    const supabase = await createClient();

    if (
      typeof body === "object" &&
      body !== null &&
      !Array.isArray(body) &&
      Object.keys(body).length === 1 &&
      typeof (body as Record<string, unknown>).favorite === "boolean"
    ) {
      const favorite = (body as { favorite: boolean }).favorite;
      const { data, error } = await supabase
        .from("clothing_items")
        .update({ favorite, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) return Response.json({ error: "Piece not found." }, { status: 404 });
      return Response.json({ ok: true, favorite });
    }

    if (
      typeof body === "object" &&
      body !== null &&
      !Array.isArray(body) &&
      Object.keys(body).length === 1 &&
      typeof (body as Record<string, unknown>).availabilityStatus === "string"
    ) {
      const availabilityStatus = (body as { availabilityStatus: string }).availabilityStatus;
      if (!AVAILABILITY_STATUSES.includes(availabilityStatus as (typeof AVAILABILITY_STATUSES)[number])) {
        return Response.json({ error: "Choose a valid availability status." }, { status: 400 });
      }
      const { data, error } = await supabase
        .from("clothing_items")
        .update({
          availability_status: availabilityStatus,
          unavailable_until: availabilityStatus === "available" ? null : undefined,
          available_override_at: availabilityStatus === "available" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) return Response.json({ error: "Piece not found." }, { status: 404 });
      return Response.json({ ok: true, availabilityStatus });
    }

    const result = validateCreateClothingItem(body);
    if (!result.success) return Response.json({ error: result.error }, { status: 400 });
    const { data, error } = await supabase.from("clothing_items").update({
      designer: result.data.designer,
      item_name: result.data.itemName,
      department: result.data.department,
      category: result.data.category,
      subcategory: result.data.subcategory,
      subcategory_2: result.data.subcategory2,
      size: result.data.size,
      color: result.data.color,
      season: result.data.season,
      season_2: result.data.season2,
      season_3: result.data.season3,
      favorite: result.data.favorite,
      styling_suggestion: result.data.stylingSuggestion,
      updated_at: new Date().toISOString(),
    }).eq("id", id).eq("user_id", userId).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: "Piece not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Unable to update wardrobe piece.", error);
    return Response.json({ error: "We could not save these details." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireCurrentUserId();
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: item, error: itemError } = await supabase
      .from("clothing_items")
      .select("id,clothing_photos(storage_path)")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    if (itemError) throw itemError;
    if (!item) return Response.json({ error: "Piece not found." }, { status: 404 });

    const storagePaths = ((item.clothing_photos ?? []) as Array<{ storage_path: string }>).map((photo) => photo.storage_path);
    if (storagePaths.length) {
      const { error: storageError } = await supabase.storage.from(PRIVATE_MEDIA_BUCKET).remove(storagePaths);
      if (storageError) throw storageError;
    }

    // A removed garment must not remain eligible through persisted copy or a
    // V2 cache. Resolve only owner-scoped active artifacts before the garment
    // delete; worn history remains intact and loses only the cascaded item link.
    const admin = createAdminClient();
    const { data: legacyLinks, error: legacyLinkError } = await admin
      .from("recommendation_items")
      .select("recommendation_id")
      .eq("clothing_item_id", id);
    if (legacyLinkError) throw legacyLinkError;
    const legacyRecommendationIds = [...new Set((legacyLinks ?? []).map((link) => link.recommendation_id))];
    if (legacyRecommendationIds.length) {
      const { data: affectedRecommendations, error: affectedError } = await admin
        .from("outfit_recommendations")
        .select("recommendation_set_id,status")
        .eq("user_id", userId)
        .in("id", legacyRecommendationIds);
      if (affectedError) throw affectedError;
      const activeSetIds = [...new Set((affectedRecommendations ?? [])
        .filter((recommendation) => recommendation.status === "suggested")
        .map((recommendation) => recommendation.recommendation_set_id))];
      if (activeSetIds.length) {
        const { error: invalidateLegacyError } = await admin
          .from("outfit_recommendations")
          .delete()
          .eq("user_id", userId)
          .in("recommendation_set_id", activeSetIds);
        if (invalidateLegacyError) throw invalidateLegacyError;
      }
    }

    const { data: v2Links, error: v2LinkError } = await admin
      .from("recommendation_option_items_v2")
      .select("option_id")
      .eq("user_id", userId)
      .eq("item_id", id);
    if (v2LinkError) throw v2LinkError;
    const v2OptionIds = [...new Set((v2Links ?? []).map((link) => link.option_id))];
    if (v2OptionIds.length) {
      const { data: v2Options, error: v2OptionsError } = await admin
        .from("recommendation_options_v2")
        .select("run_id")
        .eq("user_id", userId)
        .in("id", v2OptionIds);
      if (v2OptionsError) throw v2OptionsError;
      const runIds = [...new Set((v2Options ?? []).map((option) => option.run_id))];
      if (runIds.length) {
        const { error: invalidateV2Error } = await admin
          .from("recommendation_runs_v2")
          .delete()
          .eq("user_id", userId)
          .in("id", runIds);
        if (invalidateV2Error) throw invalidateV2Error;
      }
    }

    const { data: deleted, error: deleteError } = await supabase
      .from("clothing_items")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    if (deleteError) throw deleteError;
    if (!deleted) return Response.json({ error: "Piece not found." }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Unable to delete wardrobe piece.", error);
    return Response.json({ error: "We could not completely remove this piece. Please try again." }, { status: 500 });
  }
}
