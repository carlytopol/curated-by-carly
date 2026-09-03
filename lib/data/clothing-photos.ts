import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export async function assertClothingItemOwner(userId: string, clothingItemId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clothing_items").select("id").eq("id", clothingItemId).eq("user_id", userId).maybeSingle();
  if (error || !data) throw new Error(error?.message || "Clothing item not found.");
  return data;
}

export async function createClothingPhoto(input: { userId: string; clothingItemId: string; storagePath: string; mimeType: string; sortOrder: number; altText?: string | null }) {
  const supabase = await createClient();
  const row = {
    id: randomUUID(),
    user_id: input.userId,
    clothing_item_id: input.clothingItemId,
    storage_path: input.storagePath,
    mime_type: input.mimeType,
    sort_order: input.sortOrder,
    alt_text: input.altText ?? null,
  };
  const { data, error } = await supabase.from("clothing_photos").insert(row).select("id").single();
  if (error) throw new Error(`Photo record save failed: ${error.message}`);
  return data;
}
