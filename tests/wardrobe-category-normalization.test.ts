import assert from "node:assert/strict";
import test from "node:test";
import { normalizeWardrobeCategory } from "../types/wardrobe";

test("legacy category names map to plural collection names without losing items", () => {
  assert.equal(normalizeWardrobeCategory("Women", "Shirt / Top"), "Shirts / Tees");
  assert.equal(normalizeWardrobeCategory("Women", "Skirt"), "Skirts");
  assert.equal(normalizeWardrobeCategory("Women", "Dress"), "Dresses");
  assert.equal(normalizeWardrobeCategory("Men", "Cologne / Grooming"), "Colognes / Grooming");
});
