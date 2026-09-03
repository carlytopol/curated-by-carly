import { randomUUID } from "node:crypto";
import { requireCurrentUserId } from "@/lib/auth/require-current-user";
import { assertClothingItemOwner, createClothingPhoto } from "@/lib/data/clothing-photos";
import { removePrivateImage, uploadPrivateImage } from "@/lib/media/private-storage";
import { readValidatedImage, UploadValidationError } from "@/lib/security/file-upload";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let storagePath: string | null = null;
  try {
    const userId = await requireCurrentUserId();
    const { id } = await context.params;
    await assertClothingItemOwner(userId, id);
    const supabase = await createClient();
    const { count, error: countError } = await supabase.from("clothing_photos").select("id", { count: "exact", head: true }).eq("clothing_item_id", id).eq("user_id", userId);
    if (countError) throw countError;
    if ((count ?? 0) >= 4) return Response.json({ error: "Each wardrobe piece can have up to four photos." }, { status: 409 });
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json(
        { error: "Choose a JPEG, PNG, WebP, or HEIC image up to 10 MB." },
        { status: 400 },
      );
    }
    const image = await readValidatedImage(file);
    const validatedFile = new File([new Uint8Array(image.bytes)], `wardrobe.${image.extension}`, { type: image.mimeType });
    storagePath = `${userId}/closet/${id}/original/${randomUUID()}.${image.extension}`;
    await uploadPrivateImage(storagePath, validatedFile);
    const photo = await createClothingPhoto({
      userId,
      clothingItemId: id,
      storagePath,
      mimeType: image.mimeType,
      sortOrder: count ?? 0,
    });
    return Response.json({ id: photo.id }, { status: 201 });
  } catch (error) {
    if (storagePath) await removePrivateImage(storagePath);
    if (error instanceof UploadValidationError) return Response.json({ error: error.message }, { status: 400 });
    console.error("Unable to upload clothing photo.", error);
    return Response.json({ error: "We could not save this photo. Please try again." }, { status: 500 });
  }
}
