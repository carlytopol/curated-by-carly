import { randomUUID } from "node:crypto";
import { requireCurrentUserId } from "@/lib/auth/require-current-user";
import { standardizeGarmentPhoto } from "@/lib/ai/standardize-garment-photo";
import { createClient } from "@/lib/supabase/server";
import { PRIVATE_MEDIA_BUCKET, removePrivateImage, uploadPrivateImage } from "@/lib/media/private-storage";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string; photoId: string }> }) {
  try {
    const userId = await requireCurrentUserId();
    enforceRateLimit(userId, "wardrobe-photo-standardize", { limit: 20, windowMs: 10 * 60 * 1000 });
    const { id, photoId } = await context.params;
    const supabase = await createClient();
    const { data: photo, error } = await supabase.from("clothing_photos")
      .select("id,storage_path,mime_type")
      .eq("id", photoId).eq("clothing_item_id", id).eq("user_id", userId).maybeSingle();
    if (error) throw error;
    if (!photo) return Response.json({ error: "Photo not found." }, { status: 404 });
    const { data, error: downloadError } = await supabase.storage.from(PRIVATE_MEDIA_BUCKET).download(photo.storage_path);
    if (downloadError) throw downloadError;
    const standardized = await standardizeGarmentPhoto(Buffer.from(await data.arrayBuffer()));
    const newStoragePath = `${userId}/closet/${id}/standardized-v2/${randomUUID()}.${standardized.extension}`;
    await uploadPrivateImage(newStoragePath, new File([new Uint8Array(standardized.bytes)], "wardrobe-standardized.jpg", { type: standardized.mimeType }));
    const { error: updateError } = await supabase.from("clothing_photos")
      .update({ storage_path: newStoragePath, mime_type: standardized.mimeType })
      .eq("id", photo.id).eq("user_id", userId);
    if (updateError) {
      await removePrivateImage(newStoragePath);
      throw updateError;
    }
    await removePrivateImage(photo.storage_path);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Unable to re-standardize wardrobe photo.", error);
    return Response.json({ error: "We could not standardize this photo. Please try again." }, { status: 500 });
  }
}
