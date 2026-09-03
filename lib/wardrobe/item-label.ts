export function wardrobeItemLabel(item: {
  designer?: string | null;
  item_name?: string | null;
  category?: string | null;
}) {
  const itemName = item.item_name?.trim() || "";
  const brand = item.designer?.trim() || "";
  if (itemName) {
    if (brand && !itemName.toLowerCase().includes(brand.toLowerCase())) return `${brand} — ${itemName}`;
    return itemName;
  }
  return [brand, item.category].filter(Boolean).join(" ") || "Wardrobe piece";
}
