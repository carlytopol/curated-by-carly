import { requireCurrentUserId } from "@/lib/auth/require-current-user";
import { createClient } from "@/lib/supabase/server";
import { removePrivateImage } from "@/lib/media/private-storage";

type Context = { params: Promise<{ id: string; photoId: string }> };

export async function DELETE(_request: Request, context: Context) {
  try {
    const userId = await requireCurrentUserId();
    const { id, photoId } = await context.params;
    const supabase = await createClient();
    const { data: photo, error } = await supabase.from("clothing_photos").select("id,storage_path").eq("id", photoId).eq("clothing_item_id", id).eq("user_id", userId).maybeSingle();
    if (error) throw error;
    if (!photo) return Response.json({ error: "Photo not found." }, { status: 404 });
    await removePrivateImage(photo.storage_path);
    const { error: deleteError } = await supabase.from("clothing_photos").delete().eq("id", photo.id).eq("user_id", userId);
    if (deleteError) throw deleteError;
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Unable to remove wardrobe photo.", error);
    return Response.json({ error: "We could not remove this photo." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const userId = await requireCurrentUserId();
    const { id, photoId } = await context.params;
    const { sortOrder } = await request.json() as { sortOrder: number };
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 20) return Response.json({ error: "Invalid photo order." }, { status: 400 });
    const supabase = await createClient();
    const { data, error } = await supabase.from("clothing_photos").update({ sort_order: sortOrder }).eq("id", photoId).eq("clothing_item_id", id).eq("user_id", userId).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: "Photo not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Unable to reorder wardrobe photo.", error);
    return Response.json({ error: "We could not reorder this photo." }, { status: 500 });
  }
}
