import {
  CLOTHING_SEASONS,
  WARDROBE_DEPARTMENTS,
  categoriesForDepartment,
  subcategoriesFor,
  type CreateClothingItemInput,
  type WardrobeDepartment,
} from "@/types/wardrobe";

const MAX_TEXT_LENGTH = 100;

export type ClothingItemValidationResult =
  | { success: true; data: CreateClothingItemInput }
  | { success: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "string" ? value.trim() || null : undefined;
}

export function validateCreateClothingItem(
  value: unknown,
): ClothingItemValidationResult {
  if (!isRecord(value)) {
    return { success: false, error: "Invalid clothing item." };
  }

  const designer = cleanText(value.designer);
  const itemName = cleanText(value.itemName);
  const department = cleanText(value.department) ?? "Women";
  const category = cleanText(value.category);
  const subcategory = cleanText(value.subcategory);
  const subcategory2 = cleanText(value.subcategory2);
  const size = cleanText(value.size);
  const color = cleanText(value.color);
  const season = cleanText(value.season);
  const season2 = cleanText(value.season2);
  const season3 = cleanText(value.season3);
  const stylingSuggestion = cleanText(value.stylingSuggestion);

  if (
    designer === undefined ||
    itemName === undefined ||
    department === undefined ||
    category === undefined ||
    subcategory === undefined ||
    subcategory2 === undefined ||
    size === undefined ||
    color === undefined ||
    season === undefined ||
    season2 === undefined ||
    season3 === undefined ||
    stylingSuggestion === undefined
  ) {
    return { success: false, error: "Invalid clothing item details." };
  }

  if ([designer, itemName, subcategory, subcategory2, size, color].some((field) => field && field.length > MAX_TEXT_LENGTH)) {
    return { success: false, error: "Item details must be 100 characters or fewer." };
  }

  if (stylingSuggestion && stylingSuggestion.length > 1_000) {
    return { success: false, error: "Styling suggestions must be 1,000 characters or fewer." };
  }

  if (!WARDROBE_DEPARTMENTS.includes(department as WardrobeDepartment)) {
    return { success: false, error: "Choose Women or Men for this wardrobe piece." };
  }

  const validDepartment = department as WardrobeDepartment;
  if (category && !categoriesForDepartment(validDepartment).includes(category)) {
    return { success: false, error: "Choose a valid category." };
  }

  if (subcategory && !subcategoriesFor(validDepartment, category).includes(subcategory)) {
    return { success: false, error: "Choose a valid subcategory." };
  }

  if (subcategory2 && (validDepartment !== "Women" || category !== "Dresses" || !subcategoriesFor(validDepartment, category).includes(subcategory2))) {
    return { success: false, error: "Choose a valid second Dresses subcategory." };
  }

  if (subcategory && subcategory2 && subcategory === subcategory2) {
    return { success: false, error: "Choose two different Dresses subcategories." };
  }

  if ([season, season2, season3].some((entry) => entry && !CLOTHING_SEASONS.includes(entry as (typeof CLOTHING_SEASONS)[number]))) {
    return { success: false, error: "Choose a valid season." };
  }

  const selectedSeasons = [season, season2, season3].filter(Boolean);
  if (new Set(selectedSeasons).size !== selectedSeasons.length) {
    return { success: false, error: "Choose each season only once." };
  }

  if (typeof value.favorite !== "boolean") {
    return { success: false, error: "Invalid favorite selection." };
  }

  return {
    success: true,
    data: { designer, itemName, department: validDepartment, category, subcategory, subcategory2, size, color, season, season2, season3, favorite: value.favorite, stylingSuggestion },
  };
}
