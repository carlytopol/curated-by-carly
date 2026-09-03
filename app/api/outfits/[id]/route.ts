import { randomUUID } from "node:crypto";
import { requireCurrentUserId } from "@/lib/auth/require-current-user";
import { createClient } from "@/lib/supabase/server";
import { removePrivateImage, uploadPrivateImage } from "@/lib/media/private-storage";
import { checkPhotoQuality } from "@/lib/ai/check-photo-quality";
import { readValidatedImage, UploadValidationError } from "@/lib/security/file-upload";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const userId = await requireCurrentUserId();
    const { id } = await context.params;
    const contentType = request.headers.get("content-type") || "";
    const supabase = await createClient();

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File) || !file.size) return Response.json({ error: "Choose an outfit photograph." }, { status: 400 });
      const image = await readValidatedImage(file, { allowHeic: false });
      try {
        const [photoCheck] = await checkPhotoQuality([{ bytes: image.bytes, mimeType: image.mimeType }]);
        if (!photoCheck.ready) return Response.json({ error: `AI Photo Check recommends a retake: ${photoCheck.guidance}` }, { status: 422 });
      } catch (error) {
        console.error("AI Photo Check was unavailable while attaching a history photograph.", error);
      }

      const { data: outfit, error: findError } = await supabase.from("outfits").select("id,cover_path").eq("id", id).eq("user_id", userId).maybeSingle();
      if (findError) throw findError;
      if (!outfit) return Response.json({ error: "Outfit entry not found." }, { status: 404 });

      const coverPath = `${userId}/outfits/${randomUUID()}.${image.extension}`;
      await uploadPrivateImage(coverPath, new File([image.bytes], `outfit.${image.extension}`, { type: image.mimeType }));
      const { data: updated, error: updateError } = await supabase.from("outfits").update({ cover_path: coverPath, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId).select("id").maybeSingle();
      if (updateError || !updated) {
        await removePrivateImage(coverPath);
        if (updateError) throw updateError;
        return Response.json({ error: "Wardrobe History entry not found." }, { status: 404 });
      }
      if (outfit.cover_path) await removePrivateImage(outfit.cover_path);
      return Response.json({ ok: true });
    }

    const input = await request.json();
    if ((typeof input.title === "string" && input.title.length > 200)
      || (typeof input.occasion === "string" && input.occasion.length > 300)
      || (typeof input.notes === "string" && input.notes.length > 3000)) {
      return Response.json({ error: "Shorten the outfit title, occasion, or notes." }, { status: 400 });
    }
    if (input.itemIds !== undefined && (!Array.isArray(input.itemIds) || input.itemIds.length > 100 || input.itemIds.some((itemId: unknown) => typeof itemId !== "string" || !/^[0-9a-f-]{36}$/i.test(itemId)))) {
      return Response.json({ error: "Choose valid wardrobe pieces." }, { status: 400 });
    }
    const { data, error } = await supabase.from("outfits").update({
      ...(typeof input.title === "string" ? { title: input.title.trim() || null } : {}),
      ...(typeof input.occasion === "string" ? { occasion: input.occasion.trim() || null } : {}),
      ...(typeof input.notes === "string" ? { notes: input.notes.trim() || null } : {}),
      ...(typeof input.useAsStyleSignal === "boolean" ? { use_as_style_signal: input.useAsStyleSignal } : {}),
      updated_at: new Date().toISOString(),
    }).eq("id", id).eq("user_id", userId).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: "Outfit not found." }, { status: 404 });
    if (Array.isArray(input.itemIds)) {
      const requestedItemIds = [...new Set(input.itemIds as string[])];
      const { data: ownedItems, error: ownedItemsError } = requestedItemIds.length
        ? await supabase.from("clothing_items").select("id").eq("user_id", userId).in("id", requestedItemIds)
        : { data: [], error: null };
      if (ownedItemsError) throw ownedItemsError;
      const ownedItemIds = (ownedItems ?? []).map((item) => item.id);
      const { data: currentLinks, error: currentLinksError } = await supabase.from("outfit_items").select("clothing_item_id").eq("outfit_id", id);
      if (currentLinksError) throw currentLinksError;
      const removedIds = (currentLinks ?? []).map((link) => link.clothing_item_id).filter((itemId) => !ownedItemIds.includes(itemId));
      if (removedIds.length) {
        const { error: removeLinksError } = await supabase.from("outfit_items").delete().eq("outfit_id", id).in("clothing_item_id", removedIds);
        if (removeLinksError) throw removeLinksError;
      }
      if (ownedItemIds.length) {
        const { error: upsertLinksError } = await supabase.from("outfit_items").upsert(ownedItemIds.map((clothingItemId, position) => ({ outfit_id: id, clothing_item_id: clothingItemId, position })), { onConflict: "outfit_id,clothing_item_id" });
        if (upsertLinksError) throw upsertLinksError;
      }
    }
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof UploadValidationError) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ error: "We could not update this outfit." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const userId = await requireCurrentUserId(); const { id } = await context.params;
    const supabase = await createClient();
    const { data: outfit, error } = await supabase.from("outfits").select("id,cover_path").eq("id", id).eq("user_id", userId).maybeSingle();
    if (error) throw error;
    if (!outfit) return Response.json({ error: "Outfit not found." }, { status: 404 });
    if (outfit.cover_path) await removePrivateImage(outfit.cover_path);
    const { error: deleteError } = await supabase.from("outfits").delete().eq("id", id).eq("user_id", userId);
    if (deleteError) throw deleteError;
    return new Response(null, { status: 204 });
  } catch { return Response.json({ error: "We could not delete this outfit." }, { status: 500 }); }
}
