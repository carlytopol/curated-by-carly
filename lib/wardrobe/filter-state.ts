export type WardrobeFilterState = {
  categories: string[];
  subcategories: string[];
};

export function readWardrobeFilters(searchParams: URLSearchParams): WardrobeFilterState {
  return {
    categories: [...new Set(searchParams.getAll("category").filter(Boolean))].slice(0, 40),
    subcategories: [...new Set(searchParams.getAll("subcategory").filter(Boolean))].slice(0, 80),
  };
}

export function wardrobeFilterHref({ categories, subcategories }: WardrobeFilterState) {
  const params = new URLSearchParams();
  categories.forEach((category) => params.append("category", category));
  subcategories.forEach((subcategory) => params.append("subcategory", subcategory));
  const query = params.toString();
  return query ? `/closet?${query}` : "/closet";
}

export function wardrobeDetailHref(itemId: string, returnTo: string) {
  const params = new URLSearchParams({ returnTo });
  return `/closet/${encodeURIComponent(itemId)}?${params.toString()}`;
}

export function safeWardrobeReturnPath(value: string | null) {
  if (!value || value.startsWith("//") || value.includes("\n") || value.includes("\r")) return "/closet";
  try {
    const parsed = new URL(value, "https://curated.invalid");
    if (parsed.origin !== "https://curated.invalid") return "/closet";
    if (parsed.pathname !== "/closet" && parsed.pathname !== "/today") return "/closet";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/closet";
  }
}
