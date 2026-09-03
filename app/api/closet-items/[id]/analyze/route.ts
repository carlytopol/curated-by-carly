import { requireCurrentUserId } from "@/lib/auth/require-current-user";
import { analyzeGarmentImage } from "@/lib/ai/analyze-garment";
import { createClient } from "@/lib/supabase/server";
import { PRIVATE_MEDIA_BUCKET } from "@/lib/media/private-storage";
import { enforceRateLimit, RateLimitError, rateLimitResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

type PhotoRow = { id: string; storage_path: string; mime_type: string; sort_order: number };

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireCurrentUserId();
    enforceRateLimit(userId, "garment-analysis", { limit: 30, windowMs: 10 * 60 * 1000 });
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: item, error } = await supabase.from("clothing_items").select("id,designer,item_name,department,category,subcategory,size,color,season,season_2,season_3,styling_suggestion,clothing_photos(id,storage_path,mime_type,sort_order)").eq("id", id).eq("user_id", userId).maybeSingle();
    if (error) throw error;
    const photos = ((item?.clothing_photos ?? []) as PhotoRow[]).sort((a, b) => a.sort_order - b.sort_order);
    const photo = photos[0];
    if (!item || !photo) return Response.json({ error: "Add a photo before analysis." }, { status: 400 });

    const { data, error: downloadError } = await supabase.storage.from(PRIVATE_MEDIA_BUCKET).download(photo.storage_path);
    if (downloadError) throw downloadError;
    const suggestion = await analyzeGarmentImage(Buffer.from(await data.arrayBuffer()), photo.mime_type);
    const { error: updateError } = await supabase.from("clothing_items").update({
      department: item.department || suggestion.department || "Women",
      category: item.category || suggestion.category,
      subcategory: item.subcategory || suggestion.subcategory,
      item_name: item.item_name || suggestion.itemName,
      designer: item.designer || suggestion.designer,
      size: item.size || suggestion.size,
      color: item.color || suggestion.color,
      season: item.season || suggestion.seasons[0] || null,
      season_2: item.season_2 || suggestion.seasons[1] || null,
      season_3: item.season_3 || suggestion.seasons[2] || null,
      styling_suggestion: item.styling_suggestion || suggestion.stylingSuggestion,
      analysis_status: "complete",
      analysis_metadata: suggestion,
      updated_at: new Date().toISOString(),
    }).eq("id", id).eq("user_id", userId);
    if (updateError) throw updateError;
    const { error: photoError } = await supabase.from("clothing_photos").update({ alt_text: suggestion.altText }).eq("id", photo.id).eq("user_id", userId);
    if (photoError) throw photoError;
    return Response.json(suggestion);
  } catch (error) {
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    console.error("Unable to analyze garment.", error);
    return Response.json({ error: !process.env.OPENAI_API_KEY ? "Automatic details need an OpenAI API key. You can enter them manually." : "Automatic details are unavailable. You can enter them manually." }, { status: 503 });
  }
}
