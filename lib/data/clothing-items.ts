import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import type { ClothingItem, CreateClothingItemInput } from "@/types/wardrobe";
import { normalizeWardrobeCategory } from "@/types/wardrobe";
import { signPrivateImage } from "@/lib/media/private-storage";
import { attachCanonicalGarmentEvidence } from "@/lib/recommendations/evidence/projection";
import type { EngineWardrobeItem } from "@/lib/recommendations/engine/types";

type ClothingPhotoRow = { storage_path: string; sort_order: number };
type ClothingItemRow = {
  id: string;
  designer: string | null;
  item_name: string | null;
  department: "Women" | "Men";
  category: string | null;
  subcategory: string | null;
  subcategory_2: string | null;
  size: string | null;
  color: string | null;
  season: string | null;
  season_2: string | null;
  season_3: string | null;
  favorite: boolean;
  styling_suggestion: string | null;
  image_url: string | null;
  clothing_photos?: ClothingPhotoRow[] | null;
  analysis_metadata?: unknown;
  availability_status?: string | null;
};

async function toClothingItem(item: ClothingItemRow): Promise<ClothingItem> {
  const firstPhoto = [...(item.clothing_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
  return {
    id: item.id,
    designer: item.designer,
    itemName: item.item_name,
    department: item.department,
    category: normalizeWardrobeCategory(item.department, item.category),
    subcategory: item.subcategory,
    subcategory2: item.subcategory_2,
    size: item.size,
    color: item.color,
    season: item.season,
    season2: item.season_2,
    season3: item.season_3,
    favorite: item.favorite,
    stylingSuggestion: item.styling_suggestion,
    imageUrl: firstPhoto ? await signPrivateImage(firstPhoto.storage_path) : item.image_url,
  };
}

export async function listClothingItems(userId: string): Promise<ClothingItem[]> {
  const supabase = await createClient();
  const [itemsResult, suggestionsResult] = await Promise.all([
    supabase
      .from("clothing_items")
      .select("id,designer,item_name,department,category,subcategory,subcategory_2,size,color,season,season_2,season_3,favorite,styling_suggestion,image_url,analysis_metadata,availability_status,clothing_photos(storage_path,sort_order)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("wardrobe_metadata_suggestions")
      .select("id,clothing_item_id,field_name,suggested_value,confidence,evidence,provenance,model_version,status,updated_at")
      .eq("user_id", userId)
      .in("status", ["inferred", "confirmed", "needs_review"]),
  ]);
  if (itemsResult.error) throw new Error(`Wardrobe query failed: ${itemsResult.error.message}`);
  if (suggestionsResult.error) throw new Error(`Wardrobe evidence query failed: ${suggestionsResult.error.message}`);
  const rows = (itemsResult.data ?? []) as ClothingItemRow[];
  const evidenceItems = attachCanonicalGarmentEvidence({
    ownerUserId: userId,
    wardrobe: rows.map((item): EngineWardrobeItem => ({
      id: item.id, designer: item.designer, item_name: item.item_name,
      department: item.department, category: item.category,
      subcategory: item.subcategory, subcategory_2: item.subcategory_2,
      color: item.color, season: item.season, season_2: item.season_2,
      season_3: item.season_3, favorite: item.favorite,
      styling_suggestion: item.styling_suggestion,
      analysis_metadata: item.analysis_metadata,
      availability_status: item.availability_status,
    })),
    suggestions: suggestionsResult.data ?? [],
  });
  const evidenceById = new Map(evidenceItems.map((item) => [item.id, item.garmentEvidence]));
  return Promise.all(rows.map(async (row) => ({
    ...await toClothingItem(row),
    garmentEvidence: evidenceById.get(row.id),
  })));
}

export async function createClothingItem(userId: string, input: CreateClothingItemInput): Promise<ClothingItem> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const row = {
    id: randomUUID(),
    user_id: userId,
    designer: input.designer,
    item_name: input.itemName,
    department: input.department,
    category: input.category,
    subcategory: input.subcategory,
    subcategory_2: input.subcategory2,
    size: input.size,
    color: input.color,
    season: input.season,
    season_2: input.season2,
    season_3: input.season3,
    favorite: input.favorite,
    styling_suggestion: input.stylingSuggestion,
    image_url: null,
    analysis_status: "pending",
    updated_at: now,
  };
  const { data, error } = await supabase.from("clothing_items").insert(row).select("id,designer,item_name,department,category,subcategory,subcategory_2,size,color,season,season_2,season_3,favorite,styling_suggestion,image_url").single();
  if (error) throw new Error(`Wardrobe save failed: ${error.message}`);
  return toClothingItem(data as ClothingItemRow);
}
