import { randomUUID } from "node:crypto";
import { requireCurrentUserId } from "@/lib/auth/require-current-user";
import { createClient } from "@/lib/supabase/server";
import { removePrivateImage, signPrivateImage, uploadPrivateImage } from "@/lib/media/private-storage";
import { checkPhotoQuality } from "@/lib/ai/check-photo-quality";
import { readValidatedImage, UploadValidationError } from "@/lib/security/file-upload";

export const runtime = "nodejs";

function utcTimestamp(value: string | null) {
  if (!value) return null;
  return /(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`;
}

export async function GET(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    const mode = new URL(request.url).searchParams.get("mode");
    const supabase = await createClient();
    const dateColumn = mode === "history" ? "worn_at" : "archived_at";
    const { data: outfits, error } = await supabase.from("outfits").select("id,title,occasion,notes,cover_path,archived_at,worn_at,use_as_style_signal").eq("user_id", userId).not(dateColumn, "is", null).order(dateColumn, { ascending: false });
    if (error) throw error;
    const outfitIds = (outfits ?? []).map((outfit) => outfit.id);
    const { data: links, error: linksError } = outfitIds.length
      ? await supabase.from("outfit_items").select("outfit_id,clothing_item_id,position").in("outfit_id", outfitIds).order("position", { ascending: true })
      : { data: [], error: null };
    if (linksError) throw linksError;
    return Response.json(await Promise.all((outfits ?? []).map(async (outfit) => ({
      id: outfit.id, title: outfit.title, occasion: outfit.occasion, notes: outfit.notes,
      wornAt: utcTimestamp(outfit.worn_at), archivedAt: utcTimestamp(outfit.archived_at),
      imageUrl: outfit.cover_path ? await signPrivateImage(outfit.cover_path) : null,
      useAsStyleSignal: outfit.use_as_style_signal,
      itemIds: (links ?? []).filter((link) => link.outfit_id === outfit.id).map((link) => link.clothing_item_id),
    }))));
  } catch {
    return Response.json({ error: "We could not open your outfits." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    const formData = await request.formData();
    const title = String(formData.get("title") || "").trim() || null;
    const occasion = String(formData.get("occasion") || "").trim() || null;
    const notes = String(formData.get("notes") || "").trim() || null;
    const mode = formData.get("mode") === "history" ? "history" : "archive";
    const date = String(formData.get("date") || "");
    const useAsStyleSignal = formData.get("useAsStyleSignal") === "on";
    if ((title?.length ?? 0) > 200 || (occasion?.length ?? 0) > 300 || (notes?.length ?? 0) > 3000) {
      return Response.json({ error: "Shorten the outfit title, occasion, or notes." }, { status: 400 });
    }
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json({ error: "Choose a valid outfit date." }, { status: 400 });
    }
    const requestedItemIds = formData.getAll("itemIds").map(String).filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 100);
    const file = formData.get("file");
    let coverPath: string | null = null;
    if (file instanceof File && file.size) {
      const image = await readValidatedImage(file, { allowHeic: false });
      const [photoCheck] = await checkPhotoQuality([{ bytes: image.bytes, mimeType: image.mimeType }]);
      if (!photoCheck.ready) {
        return Response.json({ error: `AI Photo Check recommends a retake: ${photoCheck.guidance}` }, { status: 422 });
      }
      coverPath = `${userId}/outfits/${randomUUID()}.${image.extension}`;
      await uploadPrivateImage(coverPath, new File([image.bytes], `outfit.${image.extension}`, { type: image.mimeType }));
    }
    const moment = date ? new Date(`${date}T12:00:00.000Z`) : new Date();
    const supabase = await createClient();
    const { data: ownedItems, error: ownedItemsError } = requestedItemIds.length ? await supabase.from("clothing_items").select("id").eq("user_id", userId).in("id", requestedItemIds) : { data: [], error: null };
    if (ownedItemsError) throw ownedItemsError;
    const outfitId = randomUUID();
    const updatedAt = new Date().toISOString();
    const { error: outfitError } = await supabase.from("outfits").insert({
      id: outfitId, user_id: userId, title, occasion, notes, cover_path: coverPath,
      use_as_style_signal: useAsStyleSignal,
      archived_at: mode === "archive" ? moment.toISOString() : null,
      worn_at: mode === "history" ? moment.toISOString() : null,
      updated_at: updatedAt,
    });
    if (outfitError) {
      if (coverPath) await removePrivateImage(coverPath);
      throw outfitError;
    }
    if (ownedItems?.length) {
      const { error: linkError } = await supabase.from("outfit_items").insert(ownedItems.map((item, position) => ({ outfit_id: outfitId, clothing_item_id: item.id, position })));
      if (linkError) {
        await supabase.from("outfits").delete().eq("id", outfitId).eq("user_id", userId);
        if (coverPath) await removePrivateImage(coverPath);
        throw linkError;
      }
    }
    return Response.json({ id: outfitId }, { status: 201 });
  } catch (error) {
    if (error instanceof UploadValidationError) return Response.json({ error: error.message }, { status: 400 });
    console.error("Unable to save outfit.", error);
    return Response.json({ error: "We could not save this outfit." }, { status: 500 });
  }
}
