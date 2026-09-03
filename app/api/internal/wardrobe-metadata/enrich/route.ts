import { getFounderDiagnosticsIdentity } from "@/lib/auth/founder-diagnostics";
import { inferWardrobeMetadata } from "@/lib/ai/enrich-wardrobe-metadata";
import { OPENAI_MODEL } from "@/lib/ai/openai";
import { PRIVATE_MEDIA_BUCKET } from "@/lib/media/private-storage";
import { createClient } from "@/lib/supabase/server";
import { enforceRateLimit, RateLimitError, rateLimitResponse } from "@/lib/security/rate-limit";
import { METADATA_ENRICHMENT_VERSION } from "@/lib/wardrobe/metadata-enrichment";

export const runtime = "nodejs";

type Photo = { storage_path: string; mime_type: string; sort_order: number };
type EnrichmentItem = {
  id: string;
  designer: string | null;
  item_name: string | null;
  department: string;
  category: string | null;
  subcategory: string | null;
  size: string | null;
  color: string | null;
  season: string | null;
  analysis_metadata: unknown;
  clothing_photos: Photo[];
};

async function enrichItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  item: EnrichmentItem,
) {
  const photos = [...(item.clothing_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const photo = photos[0];
  let image: { bytes: Buffer; mimeType: string } | undefined;
  if (photo) {
    const download = await supabase.storage.from(PRIVATE_MEDIA_BUCKET).download(photo.storage_path);
    if (!download.error) image = {
      bytes: Buffer.from(await download.data.arrayBuffer()),
      mimeType: photo.mime_type,
    };
  }
  const plan = await inferWardrobeMetadata({
    item: {
      id: item.id, designer: item.designer, item_name: item.item_name,
      department: item.department, category: item.category,
      subcategory: item.subcategory, size: item.size, color: item.color,
      season: item.season,
    },
    image,
  });
  const rows = [
    ...plan.acceptedInferences.map((inference) => ({ inference, status: "inferred" })),
    ...plan.needsReview.map((inference) => ({ inference, status: "needs_review" })),
  ].map(({ inference, status }) => ({
    user_id: userId,
    clothing_item_id: item.id,
    field_name: inference.field,
    suggested_value: inference.value,
    confidence: inference.confidence,
    evidence: inference.evidence,
    provenance: inference.provenance,
    model_version: `${METADATA_ENRICHMENT_VERSION}:${OPENAI_MODEL}`,
    status,
    updated_at: new Date().toISOString(),
  }));
  if (rows.length) {
    const save = await supabase.from("wardrobe_metadata_suggestions")
      .upsert(rows, { onConflict: "clothing_item_id,field_name,model_version" });
    if (save.error) throw save.error;
  }
  return {
    itemId: item.id,
    acceptedInferenceCount: plan.acceptedInferences.length,
    needsReviewCount: plan.needsReview.length,
    protectedConfirmedFieldCount: plan.ignoredBecauseConfirmed.length,
  };
}

export async function POST(request: Request) {
  try {
    const identity = await getFounderDiagnosticsIdentity();
    if (!identity?.id) return Response.json({ error: "Not found." }, { status: 404 });
    enforceRateLimit(identity.id, "metadata-enrichment", {
      // One complete founder-run archive review may require 25 bounded batches.
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });
    const body = await request.json().catch(() => null);
    const itemId = typeof body?.itemId === "string" ? body.itemId : null;
    const requestedLimit = typeof body?.limit === "number" ? body.limit : 10;
    const limit = Math.max(1, Math.min(10, Math.floor(requestedLimit)));
    const supabase = await createClient();
    let query = supabase.from("clothing_items")
      .select("id,designer,item_name,department,category,subcategory,size,color,season,analysis_metadata,clothing_photos(storage_path,mime_type,sort_order)")
      .eq("user_id", identity.id)
      .order("updated_at", { ascending: true })
      .limit(itemId ? 1 : 500);
    if (itemId) query = query.eq("id", itemId);
    const { data: items, error } = await query;
    if (error) throw error;
    if (!items?.length) return Response.json({ error: "Wardrobe item not found." }, { status: 404 });
    const existing = itemId
      ? { data: [], error: null }
      : await supabase.from("wardrobe_metadata_suggestions")
        .select("clothing_item_id,field_name,status")
        .eq("user_id", identity.id)
        .in("status", ["inferred", "confirmed", "needs_review"]);
    if (existing.error) throw existing.error;
    const observedByItem = new Map<string, Set<string>>();
    for (const row of existing.data ?? []) {
      const fields = observedByItem.get(row.clothing_item_id) ?? new Set<string>();
      fields.add(row.field_name);
      observedByItem.set(row.clothing_item_id, fields);
    }
    const selectedItems = itemId
      ? items
      : [...items]
        .sort((left, right) =>
          (observedByItem.get(left.id)?.size ?? 0) - (observedByItem.get(right.id)?.size ?? 0)
        )
        .slice(0, limit);
    const results = [];
    // Deliberately serial: bounded batches avoid bursts of private images and AI calls.
    for (const item of selectedItems as EnrichmentItem[]) {
      results.push(await enrichItem(supabase, identity.id, item));
    }
    return Response.json({
      processedItemCount: results.length,
      acceptedInferenceCount: results.reduce((sum, item) => sum + item.acceptedInferenceCount, 0),
      needsReviewCount: results.reduce((sum, item) => sum + item.needsReviewCount, 0),
      protectedConfirmedFieldCount: results.reduce((sum, item) => sum + item.protectedConfirmedFieldCount, 0),
      results,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    console.error("Wardrobe metadata enrichment unavailable.", error);
    return Response.json({
      error: "The wardrobe archivist could not review this piece just now.",
    }, { status: 503 });
  }
}
