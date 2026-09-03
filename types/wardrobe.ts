export const WARDROBE_TAXONOMY = {
  Women: {
    "Shirts / Tees": ["T-Shirts", "Blouses", "Button-Down Shirts", "Camisoles", "Tank Tops", "Bodysuits"],
    "Sweaters / Knitwear": ["Cardigans", "Pullovers", "Turtlenecks", "Sweater Vests"],
    Pants: ["Trousers", "Casual Pants", "Wide-Leg Pants", "Cropped Pants"],
    Jeans: ["Straight", "Skinny", "Wide-Leg", "Bootcut", "Flare"],
    Shorts: ["Tailored Shorts", "Denim Shorts", "Casual Shorts", "Athletic Shorts"],
    Skirts: ["Mini", "Midi", "Maxi", "Pencil"],
    Dresses: ["Day Dresses", "Dinner Dress", "Cocktail Dresses", "Evening Gowns", "Shirt Dresses", "Knit Dresses"],
    Outerwear: ["Coats", "Jackets", "Blazers", "Trench Coats", "Vests"],
    Shoes: ["Heels", "Flats", "Sneakers", "Sandals", "Boots"],
    Handbags: ["Totes", "Shoulder Bags", "Crossbody Bags", "Clutches", "Evening Bags"],
    Jewelry: ["Necklace", "Earrings", "Rings", "Bracelets", "Watches"],
    Accessories: ["Belts", "Scarves", "Hats", "Sunglasses", "Gloves", "Hair Accessories"],
    Swimwear: ["Bathing Suits", "Cover-Ups", "Rash Guards"],
    Activewear: ["Sweatshirts", "Sweatpants", "Travel Wear", "Leggings", "Tennis Skirts", "Sports Tops", "Sports Bras", "Athletic Shorts"],
    "Lingerie / Sleepwear": ["Bras", "Underwear", "Shapewear", "Pajamas", "Robes"],
    "Formalwear": ["Cocktail", "Evening", "Black Tie"],
    "Suiting / Tailoring": ["Blazers", "Suit Jackets", "Suit Pants", "Suit Skirts", "Vests"],
    "Perfumes / Fragrances": ["Perfume", "Body Fragrance", "Scented Oils"],
    "Other Pieces": [],
  },
  Men: {
    Shirts: ["T-Shirts", "Casual Shirts", "Sweaters", "Pullovers", "Dress Shirts", "Polo Shirts"],
    Shoes: ["Sneakers", "Loafers", "Dress Shoes", "Sandals / Slides / Flip-Flops", "Oxford / Derby", "Boots"],
    "Blazers & Sport Coats": ["Blazers", "Sport Coats", "Dinner Jackets"],
    "Suits & Suit Separates": ["Two-Piece Suits", "Three-Piece Suits", "Suit Jackets", "Suit Pants", "Vests"],
    Pants: ["Trousers", "Chinos", "Casual Pants", "Cargo Pants"],
    Jeans: ["Straight", "Slim", "Relaxed", "Bootcut"],
    Shorts: ["Tailored Shorts", "Chino Shorts", "Cargo Shorts", "Athletic Shorts"],
    "Athletic Wear": ["Training Tops", "Training Pants", "Shorts", "Base Layers", "Tracksuits"],
    Swimwear: ["Swim Trunks", "Board Shorts", "Rash Guards", "Cover-Ups"],
    Formalwear: ["Tuxedos", "Dinner Jackets", "Formal Shirts", "Waistcoats"],
    "Sweatshirts / Hoodies": ["Crewneck Sweatshirts", "Hoodies", "Quarter-Zips", "Travel Wear"],
    Outerwear: ["Overcoats", "Trench Coats", "Jackets", "Bombers", "Vests"],
    "Underwear / Sleepwear": ["Boxers", "Briefs", "Undershirts", "Pajamas", "Robes"],
    Accessories: ["Belts", "Ties", "Pocket Squares", "Hats", "Sunglasses", "Gloves", "Wallets"],
    Bags: ["Briefcases", "Backpacks", "Duffel Bags", "Crossbody Bags", "Garment Bags"],
    "Watches & Jewelry": ["Watches", "Cufflinks", "Bracelets", "Necklaces", "Rings"],
    "Colognes / Grooming": ["Cologne", "Aftershave", "Skincare", "Hair Care", "Grooming Tools"],
    "Other Pieces": [],
  },
} as const;

export type WardrobeDepartment = keyof typeof WARDROBE_TAXONOMY;

export const WARDROBE_DEPARTMENTS = Object.keys(WARDROBE_TAXONOMY) as WardrobeDepartment[];
export const CLOTHING_CATEGORIES = [...new Set(
  WARDROBE_DEPARTMENTS.flatMap((department) => Object.keys(WARDROBE_TAXONOMY[department])),
)];
export const CLOTHING_SUBCATEGORIES = [...new Set(
  WARDROBE_DEPARTMENTS.flatMap((department) => Object.values(WARDROBE_TAXONOMY[department]).flat()),
)];

export function categoriesForDepartment(department: WardrobeDepartment) {
  return Object.keys(WARDROBE_TAXONOMY[department]);
}

export function subcategoriesFor(department: WardrobeDepartment, category: string | null | undefined): readonly string[] {
  if (!category) return [];
  const categories = WARDROBE_TAXONOMY[department] as Record<string, readonly string[]>;
  return categories[category] ?? [];
}

const LEGACY_CATEGORY_NAMES: Record<WardrobeDepartment, Record<string, string>> = {
  Women: {
    "Shirt / Top": "Shirts / Tees",
    "Shirt/Tee": "Shirts / Tees",
    "Shirts/Tops": "Shirts / Tees",
    "Sweater / Knitwear": "Sweaters / Knitwear",
    Skirt: "Skirts",
    Dress: "Dresses",
    Accessory: "Accessories",
    "Perfume / Fragrance": "Perfumes / Fragrances",
    Other: "Other Pieces",
  },
  Men: {
    "Cologne / Grooming": "Colognes / Grooming",
    Other: "Other Pieces",
  },
};

export function normalizeWardrobeCategory(department: WardrobeDepartment, category: string | null | undefined) {
  if (!category) return null;
  return LEGACY_CATEGORY_NAMES[department][category] ?? category;
}

export type ClothingItem = {
  id: string;
  designer: string | null;
  itemName: string | null;
  department: WardrobeDepartment;
  category: string | null;
  subcategory: string | null;
  subcategory2: string | null;
  size: string | null;
  color: string | null;
  season: string | null;
  season2: string | null;
  season3: string | null;
  favorite: boolean;
  stylingSuggestion: string | null;
  imageUrl: string | null;
  garmentEvidence?: import("@/lib/recommendations/evidence/contracts").GarmentEvidence;
};

export type CreateClothingItemInput = Pick<
  ClothingItem,
  "designer" | "itemName" | "department" | "category" | "subcategory" | "subcategory2" | "size" | "color" | "season" | "season2" | "season3" | "favorite" | "stylingSuggestion"
>;

export const CLOTHING_SEASONS = ["Spring", "Summer", "Autumn", "Winter", "All season"] as const;
