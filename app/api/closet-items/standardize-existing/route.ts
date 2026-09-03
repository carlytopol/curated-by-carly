import { randomUUID } from "node:crypto";
import { requireCurrentUserId } from "@/lib/auth/require-current-user";
import { standardizeGarmentPhoto } from "@/lib/ai/standardize-garment-photo";
import { PRIVATE_MEDIA_BUCKET, removePrivateImage, signPrivateImage, uploadPrivateImage } from "@/lib/media/private-storage";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const STANDARDIZED_PATH_MARKER = "/standardized-v2/";

async function pendingCount(userId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("clothing_photos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("storage_path", "like", `%${STANDARDIZED_PATH_MARKER}%`);
  if (error) throw error;
  return count ?? 0;
}

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    return Response.json({ pending: await pendingCount(userId) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "We could not audit the wardrobe photos." }, { status: 500 });
  }
}

export async function POST() {
  let userId: string | null = null;
  let failedPhoto: { id: string; clothing_item_id: string; storage_path: string } | null = null;
  try {
    userId = await requireCurrentUserId();
    const supabase = await createClient();
    const { data: photo, error } = await supabase
      .from("clothing_photos")
      .select("id,clothing_item_id,storage_path,mime_type")
      .eq("user_id", userId)
      .not("storage_path", "like", `%${STANDARDIZED_PATH_MARKER}%`)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!photo) return Response.json({ processed: false, pending: 0 });
    failedPhoto = photo;

    const { data, error: downloadError } = await supabase.storage.from(PRIVATE_MEDIA_BUCKET).download(photo.storage_path);
    if (downloadError) throw downloadError;
    const standardized = await standardizeGarmentPhoto(Buffer.from(await data.arrayBuffer()));
    const newStoragePath = `${userId}/closet/${photo.clothing_item_id}/standardized-v2/${randomUUID()}.${standardized.extension}`;
    await uploadPrivateImage(newStoragePath, new File([new Uint8Array(standardized.bytes)], "wardrobe-standardized.jpg", { type: standardized.mimeType }));
    const { error: updateError } = await supabase
      .from("clothing_photos")
      .update({ storage_path: newStoragePath, mime_type: standardized.mimeType })
      .eq("id", photo.id)
      .eq("user_id", userId);
    if (updateError) {
      await removePrivateImage(newStoragePath);
      throw updateError;
    }
    await removePrivateImage(photo.storage_path);
    return Response.json({ processed: true, pending: await pendingCount(userId) });
  } catch (error) {
    console.error("Unable to standardize an existing wardrobe photo.", error);
    if (userId && failedPhoto) {
      const supabase = await createClient();
      const { data: item } = await supabase.from("clothing_items").select("designer,item_name").eq("id", failedPhoto.clothing_item_id).eq("user_id", userId).maybeSingle();
      return Response.json({
        error: "This photo uses an older image format that Curated could not prepare.",
        failedPhoto: {
          photoId: failedPhoto.id,
          itemId: failedPhoto.clothing_item_id,
          label: [item?.designer, item?.item_name].filter(Boolean).join(" — ") || "Untitled wardrobe piece",
          imageUrl: await signPrivateImage(failedPhoto.storage_path),
        },
      }, { status: 500 });
    }
    return Response.json({ error: "We could not standardize this wardrobe photo." }, { status: 500 });
  }
}
