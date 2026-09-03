import assert from "node:assert/strict";
import test from "node:test";
import { validateCreateClothingItem } from "../lib/validation/clothing-item";

const validItem = {
  designer: "  The Row  ",
  itemName: "Silk blouse",
  category: "Shirts / Tees",
  size: null,
  color: "Ivory",
  season: "All season",
  favorite: true,
};

test("accepts and normalizes a valid clothing item", () => {
  const result = validateCreateClothingItem(validItem);
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.designer, "The Row");
});

test("allows optional fields to be blank", () => {
  const result = validateCreateClothingItem({ ...validItem, color: "   " });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.color, null);
});

test("accepts perfume and fragrance as a wardrobe category", () => {
  const result = validateCreateClothingItem({
    ...validItem,
    category: "Perfumes / Fragrances",
    itemName: "Signature scent",
  });
  assert.equal(result.success, true);
});

test("defaults existing wardrobe items to Women", () => {
  const result = validateCreateClothingItem(validItem);
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.department, "Women");
});

test("accepts Women swimwear and shoe subcategories", () => {
  const swimwear = validateCreateClothingItem({ ...validItem, department: "Women", category: "Swimwear", subcategory: "Bathing Suits" });
  const shoes = validateCreateClothingItem({ ...validItem, department: "Women", category: "Shoes", subcategory: "Heels" });
  assert.equal(swimwear.success, true);
  assert.equal(shoes.success, true);
});

test("accepts plural Women wardrobe categories", () => {
  const shirts = validateCreateClothingItem({ ...validItem, category: "Shirts / Tees", subcategory: "T-Shirts" });
  const skirts = validateCreateClothingItem({ ...validItem, category: "Skirts", subcategory: "Midi" });
  assert.equal(shirts.success, true);
  assert.equal(skirts.success, true);
});

test("accepts two distinct Dresses subcategories", () => {
  const result = validateCreateClothingItem({
    ...validItem,
    category: "Dresses",
    subcategory: "Dinner Dress",
    subcategory2: "Cocktail Dresses",
  });
  assert.equal(result.success, true);
});

test("rejects a duplicate second Dresses subcategory", () => {
  const result = validateCreateClothingItem({
    ...validItem,
    category: "Dresses",
    subcategory: "Dinner Dress",
    subcategory2: "Dinner Dress",
  });
  assert.equal(result.success, false);
});

test("accepts Men categories and matching subcategories", () => {
  const result = validateCreateClothingItem({ ...validItem, department: "Men", category: "Shirts", subcategory: "Dress Shirts" });
  assert.equal(result.success, true);
});

test("rejects subcategories from a different wardrobe hierarchy", () => {
  const result = validateCreateClothingItem({ ...validItem, department: "Men", category: "Shirts", subcategory: "Heels" });
  assert.equal(result.success, false);
});

test("accepts as many as three distinct seasons", () => {
  const result = validateCreateClothingItem({ ...validItem, season: "Spring", season2: "Summer", season3: "Autumn" });
  assert.equal(result.success, true);
  if (result.success) assert.deepEqual([result.data.season, result.data.season2, result.data.season3], ["Spring", "Summer", "Autumn"]);
});

test("rejects duplicate season selections", () => {
  assert.equal(validateCreateClothingItem({ ...validItem, season: "Spring", season2: "Spring" }).success, false);
});

test("rejects unsupported categories and seasons", () => {
  assert.equal(
    validateCreateClothingItem({ ...validItem, category: "Costume" }).success,
    false,
  );
  assert.equal(
    validateCreateClothingItem({ ...validItem, season: "Category" }).success,
    false,
  );
});

test("rejects text over the supported length", () => {
  const result = validateCreateClothingItem({
    ...validItem,
    itemName: "a".repeat(101),
  });
  assert.equal(result.success, false);
});

test("rejects malformed payloads", () => {
  assert.equal(validateCreateClothingItem(null).success, false);
  assert.equal(
    validateCreateClothingItem({ ...validItem, favorite: "yes" }).success,
    false,
  );
});
