import assert from "node:assert/strict";
import test from "node:test";
import { isContextCompatible } from "../lib/recommendations/context";
import {
  evaluateItemEligibility,
  rankEligibleItems,
  preferFreshMainItems,
  rotationScore,
} from "../lib/recommendations/rotation";
import { buildDeterministicRecommendationSet, completeRecommendationDrafts, isCoherentOutfit, isMainClothingItem, validateRecommendationSet } from "../lib/recommendations/set";
import { stylistChatEndpoint } from "../lib/recommendations/stylist-chat";
import { containsIncompatiblePair, orderedPair } from "../lib/recommendations/pair-preferences";
import { followUpRequiresNewOutfits } from "../lib/recommendations/follow-up";

const now = new Date("2026-07-16T12:00:00.000Z");

test("accepts exactly three complete and materially different outfits", () => {
  const wardrobe = [
    { id: "dress-a", category: "Dresses" },
    { id: "dress-b", category: "Dresses" },
    { id: "dress-c", category: "Dresses" },
    { id: "bag", category: "Handbags" },
  ];
  const valid = validateRecommendationSet([
    { summary: "A", rationale: "First", wardrobeItemIds: ["dress-a", "bag"] },
    { summary: "B", rationale: "Second", wardrobeItemIds: ["dress-b", "bag"] },
    { summary: "C", rationale: "Third", wardrobeItemIds: ["dress-c", "bag"] },
  ], wardrobe);
  assert.deepEqual(valid, { valid: true });

  const repeated = validateRecommendationSet([
    { summary: "A", rationale: "First", wardrobeItemIds: ["dress-a", "bag"] },
    { summary: "B", rationale: "Second", wardrobeItemIds: ["dress-a"] },
    { summary: "C", rationale: "Third", wardrobeItemIds: ["dress-c", "bag"] },
  ], wardrobe);
  assert.equal(repeated.valid, false);
});

test("rules-first fallback returns complete looks with shoes while fragrance remains optional", () => {
  const wardrobe = [
    { id: "dress-a", category: "Dresses", item_name: "Green day dress" },
    { id: "dress-b", category: "Dresses", item_name: "Navy dinner dress" },
    { id: "dress-c", category: "Dresses", item_name: "Ivory shirt dress" },
    { id: "shoe-a", category: "Shoes", item_name: "Loafers" },
    { id: "bag-a", category: "Handbags", item_name: "Top-handle bag" },
    { id: "scent-a", category: "Perfumes / Fragrances", item_name: "Gardenia scent" },
  ];
  const options = buildDeterministicRecommendationSet(wardrobe, "Lunch and dinner");
  assert.equal(options.length, 3);
  assert.deepEqual(validateRecommendationSet(options, wardrobe), { valid: true });
  const ownedIds = new Set(wardrobe.map((item) => item.id));
  assert.equal(options.flatMap((option) => option.wardrobeItemIds).every((id) => ownedIds.has(id)), true);
  assert.equal(isMainClothingItem(wardrobe[3]), false, "shoes are reusable support, not a distinct main look");
  assert.equal(options.every((option) => option.wardrobeItemIds.includes("shoe-a")), true);
  assert.equal(options.every((option) => !option.wardrobeItemIds.includes("scent-a")), true);
});

test("rules-first fallback varies both tops and bottoms before repeating either", () => {
  const wardrobe = [
    { id: "top-a", category: "Shirts / Tees", item_name: "Top A" },
    { id: "top-b", category: "Shirts / Tees", item_name: "Top B" },
    { id: "top-c", category: "Shirts / Tees", item_name: "Top C" },
    { id: "short-a", category: "Shorts", item_name: "Shorts A" },
    { id: "short-b", category: "Shorts", item_name: "Shorts B" },
    { id: "short-c", category: "Shorts", item_name: "Shorts C" },
    { id: "shoe-a", category: "Shoes", item_name: "Shoe A" },
    { id: "shoe-b", category: "Shoes", item_name: "Shoe B" },
    { id: "shoe-c", category: "Shoes", item_name: "Shoe C" },
    { id: "scent-a", category: "Perfumes / Fragrances", item_name: "Scent A" },
    { id: "scent-b", category: "Perfumes / Fragrances", item_name: "Scent B" },
    { id: "scent-c", category: "Perfumes / Fragrances", item_name: "Scent C" },
  ];
  const options = buildDeterministicRecommendationSet(wardrobe, "Hot stadium concert · Forecast high 90°F");
  assert.equal(options.length, 3);
  assert.equal(new Set(options.map((option) => option.wardrobeItemIds.find((id) => id.startsWith("top-")))).size, 3);
  assert.equal(new Set(options.map((option) => option.wardrobeItemIds.find((id) => id.startsWith("short-")))).size, 3);
  assert.equal(new Set(options.map((option) => option.wardrobeItemIds.find((id) => id.startsWith("shoe-")))).size, 3);
  assert.equal(options.every((option) => option.wardrobeItemIds.every((id) => !id.startsWith("scent-"))), true);
  assert.deepEqual(validateRecommendationSet(options, wardrobe), { valid: true });
});

test("a shirt without a bottom is never a complete outfit", () => {
  const wardrobe = [
    { id: "shirt", category: "Shirts / Tees" },
    { id: "pants", category: "Pants" },
    { id: "dress-a", category: "Dresses" },
    { id: "dress-b", category: "Dresses" },
  ];
  const result = validateRecommendationSet([
    { summary: "Incomplete", rationale: "Missing a bottom.", wardrobeItemIds: ["shirt"] },
    { summary: "A", rationale: "Complete.", wardrobeItemIds: ["dress-a"] },
    { summary: "B", rationale: "Complete.", wardrobeItemIds: ["dress-b"] },
  ], wardrobe);
  assert.equal(result.valid, false);
  assert.equal(result.reason, "missing-required-outfit-role");
});

test("three options may not reuse a main garment", () => {
  const wardrobe = [
    { id: "top-a", category: "Shirts / Tees" },
    { id: "top-b", category: "Shirts / Tees" },
    { id: "top-c", category: "Shirts / Tees" },
    { id: "shorts", category: "Shorts" },
  ];
  const result = validateRecommendationSet([
    { summary: "A", rationale: "First.", wardrobeItemIds: ["top-a", "shorts"] },
    { summary: "B", rationale: "Second.", wardrobeItemIds: ["top-b", "shorts"] },
    { summary: "C", rationale: "Third.", wardrobeItemIds: ["top-c", "shorts"] },
  ], wardrobe);
  assert.equal(result.valid, false);
  assert.equal(result.reason, "reused-main-item");
});

test("fallback recognizes legacy tops by item name and avoids double blue denim when alternatives exist", () => {
  const wardrobe = [
    { id: "chambray", category: "Other Pieces", item_name: "Light blue chambray shirt", color: "Light blue" },
    { id: "white-top", category: "Other Pieces", item_name: "White cotton tank top", color: "White" },
    { id: "black-top", category: "Other Pieces", item_name: "Black short sleeve tee", color: "Black" },
    { id: "green-top", category: "Shirt/Tee", item_name: "Green popover shirt", color: "Green" },
    { id: "denim-a", category: "Shorts", item_name: "Light wash denim shorts", color: "Light blue" },
    { id: "denim-b", category: "Shorts", item_name: "Dark wash denim shorts", color: "Dark blue" },
    { id: "black-shorts", category: "Shorts", item_name: "Black utility shorts", color: "Black" },
  ];
  const options = buildDeterministicRecommendationSet(wardrobe, "Hot stadium concert · Forecast high 90°F");
  assert.equal(options.length, 3);
  assert.equal(options.some((option) =>
    option.wardrobeItemIds.includes("chambray")
    && (option.wardrobeItemIds.includes("denim-a") || option.wardrobeItemIds.includes("denim-b")),
  ), false);
  assert.deepEqual(validateRecommendationSet(options, wardrobe), { valid: true });
});

test("coherence rules reject mismatched formality, competing statements, and long tops over skirts", () => {
  const wardrobe = [
    { id: "tank", category: "Shirts / Tees", item_name: "Ribbed scoop-neck tank top" },
    { id: "satin-skirt", category: "Skirts", item_name: "Satin evening skirt" },
    { id: "long-top", category: "Shirts / Tees", item_name: "Three-quarter length tunic top" },
    { id: "tiered-skirt", category: "Skirts", item_name: "Tiered skirt" },
    { id: "pattern-top", category: "Shirts / Tees", item_name: "Bold patterned graphic top" },
    { id: "sequin-skirt", category: "Skirts", item_name: "Gold sequin skirt" },
  ];
  assert.equal(isCoherentOutfit(["tank", "satin-skirt"], wardrobe), false);
  assert.equal(isCoherentOutfit(["long-top", "tiered-skirt"], wardrobe), false);
  assert.equal(isCoherentOutfit(["pattern-top", "sequin-skirt"], wardrobe), false);
});

test("a pocket requirement excludes skirts and one-pieces without confirmed pockets", () => {
  const context = { eventTitle: "Outdoor concert", eventDetails: "I need pockets for my phone at Truist Park", temperature: 90 };
  assert.equal(isContextCompatible(
    { category: "Skirts", itemName: "Tiered cotton skirt", season: "Summer" },
    context,
  ), false);
  assert.equal(isContextCompatible(
    { category: "Skirts", itemName: "Utility skirt with pockets", season: "Summer" },
    context,
  ), true);
});

test("missing shoes are completed while fragrance remains optional", () => {
  const wardrobe = [
    { id: "dress-a", category: "Dresses" },
    { id: "dress-b", category: "Dresses" },
    { id: "dress-c", category: "Dresses" },
    { id: "shoes", category: "Shoes" },
    { id: "perfume", category: "Perfume / Fragrance" },
  ];
  const completed = completeRecommendationDrafts([
    { summary: "A", rationale: "First.", wardrobeItemIds: ["dress-a"] },
    { summary: "B", rationale: "Second.", wardrobeItemIds: ["dress-b"] },
    { summary: "C", rationale: "Third.", wardrobeItemIds: ["dress-c"] },
  ], wardrobe);
  assert.equal(completed.every((option) => option.wardrobeItemIds.includes("shoes")), true);
  assert.equal(completed.every((option) => !option.wardrobeItemIds.includes("perfume")), true);
  assert.deepEqual(validateRecommendationSet(completed, wardrobe), { valid: true });
});

test("underused pieces outrank frequently recommended favorites", () => {
  const favoriteScore = rotationScore({
    id: "favorite",
    favorite: true,
    wearCount: 8,
    recommendationCount: 12,
    lastWornAt: "2026-06-01T12:00:00.000Z",
    lastRecommendedAt: "2026-07-15T12:00:00.000Z",
  }, now);
  const overlookedScore = rotationScore({
    id: "overlooked",
    favorite: false,
    wearCount: 0,
    recommendationCount: 0,
    lastWornAt: null,
    lastRecommendedAt: null,
  }, now);
  assert.ok(overlookedScore > favoriteScore);
});

test("recent foundations remain eligible but fresh foundations lead when enough qualify", () => {
  const rotation = preferFreshMainItems([
    { id: "favorite-repeat", category: "Dresses", favorite: true, lastRecommendedAt: "2026-07-15T12:00:00.000Z" },
    { id: "fresh-a", category: "Dresses", lastRecommendedAt: null },
    { id: "fresh-b", category: "Shirts / Tees", lastRecommendedAt: null },
    { id: "fresh-c", category: "Shorts", lastRecommendedAt: "2026-07-01T12:00:00.000Z" },
    { id: "repeatable-shoe", category: "Shoes", lastRecommendedAt: "2026-07-16T12:00:00.000Z" },
  ], now);
  assert.deepEqual(rotation.map((item) => item.id), ["fresh-a", "fresh-b", "fresh-c", "favorite-repeat", "repeatable-shoe"]);
});

test("explicitly incompatible wardrobe pieces can never appear together", () => {
  const pair = orderedPair("sea-shirt", "orange-shorts");
  assert.equal(containsIncompatiblePair(["sea-shirt", "orange-shorts", "shoes"], [pair]), true);
  const result = validateRecommendationSet([
    { summary: "A", rationale: "First", wardrobeItemIds: ["sea-shirt", "orange-shorts"] },
    { summary: "B", rationale: "Second", wardrobeItemIds: ["dress-b"] },
    { summary: "C", rationale: "Third", wardrobeItemIds: ["dress-c"] },
  ], [
    { id: "sea-shirt", category: "Shirts / Tees" },
    { id: "orange-shorts", category: "Shorts" },
    { id: "dress-b", category: "Dresses" },
    { id: "dress-c", category: "Dresses" },
  ], [pair]);
  assert.equal(result.valid, false);
  assert.equal(result.reason, "incompatible-pair");
});

test("availability is hard while recent wear remains eligible", () => {
  assert.deepEqual(evaluateItemEligibility({ id: "dirty", availabilityStatus: "dirty" }, now), {
    eligible: false,
    reason: "unavailable",
  });
  assert.deepEqual(evaluateItemEligibility({
    id: "recent",
    availabilityStatus: "available",
    lastWornAt: "2026-07-10T12:00:00.000Z",
  }, now), { eligible: true });
  assert.equal(evaluateItemEligibility({
    id: "cleaned",
    availabilityStatus: "available",
    lastWornAt: "2026-07-15T12:00:00.000Z",
    availableOverrideAt: "2026-07-16T08:00:00.000Z",
  }, now).eligible, true);
});

test("available pieces may repeat while repair remains excluded", () => {
  for (const category of ["Handbags", "Shoes", "Perfumes / Fragrances", "Accessories", "Jewelry", "Outerwear"]) {
    assert.equal(evaluateItemEligibility({
      id: category,
      category,
      availabilityStatus: "available",
      lastWornAt: "2026-07-15T12:00:00.000Z",
    }, now).eligible, true, `${category} should remain reusable`);
  }
  assert.deepEqual(evaluateItemEligibility({
    id: "shirt",
    category: "Shirts / Tees",
    availabilityStatus: "available",
    lastWornAt: "2026-07-15T12:00:00.000Z",
  }, now), { eligible: true });
  assert.deepEqual(evaluateItemEligibility({
    id: "shoes-in-repair",
    category: "Shoes",
    availabilityStatus: "repair",
  }, now), { eligible: false, reason: "unavailable" });
});

test("ranking never returns unavailable pieces", () => {
  const ranked = rankEligibleItems([
    { id: "clean", availabilityStatus: "available" },
    { id: "laundry", availabilityStatus: "laundry" },
    { id: "blocked", availabilityStatus: "available", unavailableUntil: "2026-07-20T12:00:00.000Z" },
  ], now);
  assert.deepEqual(ranked.map((item) => item.id), ["clean"]);
});

test("dirty clothing is excluded while a recently worn available piece remains eligible", () => {
  const eligible = rankEligibleItems([
    { id: "dress-a", category: "Dresses", availabilityStatus: "available", lastWornAt: null },
    { id: "dress-b", category: "Dresses", availabilityStatus: "available", lastWornAt: null },
    { id: "dress-c", category: "Dresses", availabilityStatus: "available", lastWornAt: null },
    { id: "dirty-dress", category: "Dresses", availabilityStatus: "dirty", lastWornAt: null },
    { id: "recent-shirt", category: "Shirts / Tees", availabilityStatus: "available", lastWornAt: "2026-07-12T12:00:00.000Z" },
    { id: "bag", category: "Handbags", availabilityStatus: "available", lastWornAt: "2026-07-15T12:00:00.000Z" },
  ], now);
  const eligibleIds = new Set(eligible.map((item) => item.id));
  assert.equal(eligibleIds.has("dirty-dress"), false);
  assert.equal(eligibleIds.has("recent-shirt"), true);

  const options = ["dress-a", "dress-b", "dress-c"].map((id, index) => ({
    summary: `Option ${index + 1}`,
    rationale: "A distinct eligible look.",
    wardrobeItemIds: [id, "bag"].filter((itemId) => eligibleIds.has(itemId)),
  }));
  assert.deepEqual(validateRecommendationSet(options, eligible), { valid: true });
  assert.equal(options.some((option) => option.wardrobeItemIds.includes("dirty-dress")), false);
});

test("known wrong-weather and wrong-occasion items are excluded", () => {
  assert.equal(isContextCompatible({ category: "Dresses", season: "Summer" }, { eventTitle: "Work meeting", temperature: 35 }), false);
  assert.equal(isContextCompatible({ category: "Dresses", season: "All season" }, { eventTitle: "Morning workout", temperature: 70 }), false);
  assert.equal(isContextCompatible({ category: "Activewear", season: "All season" }, { eventTitle: "Morning workout", temperature: 70 }), true);
  assert.equal(isContextCompatible(
    { category: "Shoes", subcategory: "Boots", season: "All season" },
    { eventTitle: "Outdoor concert", eventDetails: "Atlanta", temperature: 86, temperatureHigh: 93 },
  ), false);
  assert.equal(isContextCompatible(
    { category: "Dresses", subcategory: "Day Dresses", season: "Summer" },
    { eventTitle: "Noah Kahan concert", eventDetails: "Truist Park baseball stadium, Atlanta", temperature: 88, temperatureHigh: 92 },
  ), false);
  assert.equal(isContextCompatible(
    { category: "Outerwear", itemName: "Cable-knit cropped sweater", season: "All season" },
    { eventTitle: "Outdoor concert", eventDetails: "Truist Park", temperature: 88, temperatureHigh: 92 },
  ), false);
  assert.equal(isContextCompatible(
    { category: "Swimwear", subcategory: "Cover-Ups", itemName: "Printed kaftan tunic", season: "Summer" },
    { eventTitle: "Evening concert", eventDetails: "Truist Park stadium", temperature: 88, temperatureHigh: 92 },
  ), false);
  assert.equal(isContextCompatible(
    { category: "Activewear", subcategory: "Sweatshirts", itemName: "Cropped graphic sweatshirt", season: "All season" },
    { eventTitle: "Outdoor concert", eventDetails: "Truist Park stadium", temperature: 88, temperatureHigh: 92 },
  ), false);
  assert.equal(isContextCompatible(
    { category: "Handbags", subcategory: "Totes", itemName: "Striped tote" },
    { eventTitle: "Concert", eventDetails: "I can't carry a bag because of stadium rules", temperature: 88 },
  ), false);
  assert.equal(isContextCompatible(
    { category: "Shoes", subcategory: "Sandals", itemName: "Studded platform wedge sandals" },
    { eventTitle: "Concert", eventDetails: "Truist Park stadium", temperature: 88 },
  ), false);
  assert.equal(isContextCompatible(
    { category: "Handbags", subcategory: "Totes", itemName: "Striped Book tote bag" },
    { eventTitle: "Concert", eventDetails: "Truist Park stadium", temperature: 88 },
  ), false);
});

test("durable styling corrections request a new three-look set", () => {
  assert.equal(followUpRequiresNewOutfits("Those pieces do not match. Try again."), true);
  assert.equal(followUpRequiresNewOutfits("The boots are too hot for this venue."), true);
  assert.equal(followUpRequiresNewOutfits("Could you explain the color choice?"), false);
  assert.equal(followUpRequiresNewOutfits("Please remember this pairing.", true), true);
});

test("all recommendation chat surfaces use the shared stylist endpoint", () => {
  assert.equal(stylistChatEndpoint("recommendation id"), "/api/recommendations/recommendation%20id/follow-up");
});
