import assert from "node:assert/strict";
import test from "node:test";

import {
  assertPersistableRecommendationLooks,
  hasStructurallyCompleteFoundation,
  materiallyDistinctFoundations,
} from "@/lib/recommendations/v2/persistable-looks";
import type { CandidateLook, WardrobeGarment } from "@/lib/recommendations/v2/recommendation-pipeline";
import { classifyCanonicalWardrobeRole } from "@/lib/recommendations/v2/wardrobe-role";
import { containsReservedEngineeringFixture } from "@/lib/daily-agenda/engineering-fixture-guard";

const owner = "founder-fixture";
const garment = (itemId: string, role: WardrobeGarment["role"]): WardrobeGarment => ({
  ownerUserId: owner, itemId, name: itemId, role,
  foundationKind: role === "top" || role === "bottom" ? "top-bottom" : role === "dress" ? "dress" : null,
  available: true, suppressed: false, formality: "polished-casual", materials: [], silhouettes: [], palettes: [],
  genres: ["everyday"], securePockets: null, walkability: role === "shoes" ? "high" : null,
  descriptors: [], evidenceRefs: [],
});
const look = (id: string, items: WardrobeGarment[]): CandidateLook => ({
  schemaVersion: "candidate-look.v2.3.0", taxonomyVersion: "recommendation-taxonomy.v2.3.0",
  artifactId: id, artifactRevision: "1", requestId: "request", ownerUserId: owner,
  generatedAt: "2026-08-03T12:00:00.000Z",
  directionRef: {
    referenceVersion: "artifact-reference.v2.2.0", schemaVersion: "personal-outfit-direction.v2.3.0",
    artifactId: "direction", artifactRevision: "1", requestId: "request", ownerUserId: owner,
    generatedAt: "2026-08-03T12:00:00.000Z",
  },
  items, omittedOptionalRoles: [], evidenceRefs: [],
  diagnostics: { cohesion: 0, personalPolish: 0, burden: items.length, confidence: "high" },
});

test("canonical role projection ignores prose that mentions other garments", () => {
  assert.equal(classifyCanonicalWardrobeRole({
    category: "Accessories", subcategory: "Hats", subcategory2: null,
    itemName: "Straw boater hat with striped band",
  }), "accessory");
  assert.equal(classifyCanonicalWardrobeRole({
    category: "Shoes", subcategory: "Flats", subcategory2: null,
    itemName: "Studded crisscross-strap ballet flats",
  }), "shoes");
  assert.equal(classifyCanonicalWardrobeRole({
    category: "Shirts / Tees", subcategory: "Tank Tops", subcategory2: null,
    itemName: "Black scoop-neck tank top",
  }), "top");
});

test("zero-tolerance persistence rejects every incomplete foundation shape", () => {
  const shoes = garment("shoes", "shoes");
  const incomplete = [
    [garment("top", "top"), shoes],
    [garment("bottom", "bottom"), shoes],
    [garment("dress", "dress"), garment("extra-top", "top"), shoes],
    [garment("jumpsuit", "jumpsuit")],
    [garment("set", "coordinated-set"), garment("extra-bottom", "bottom"), shoes],
  ];
  for (const items of incomplete) {
    assert.equal(hasStructurallyCompleteFoundation(items), false);
    assert.throws(() => assertPersistableRecommendationLooks([look("invalid", items)], owner), /incomplete outfit/);
  }
  assert.doesNotThrow(() => assertPersistableRecommendationLooks([
    look("separates", [garment("top", "top"), garment("bottom", "bottom"), shoes]),
  ], owner));
  for (const role of ["dress", "jumpsuit", "coordinated-set"] as const) {
    assert.doesNotThrow(() => assertPersistableRecommendationLooks([
      look(role, [garment(role, role), shoes]),
    ], owner));
  }
});

test("reserved Engineering fixture labels cannot enter customer DailyAgenda fields", () => {
  assert.equal(containsReservedEngineeringFixture({ title: "Synthetic V2 verification: museum" }), true);
  assert.equal(containsReservedEngineeringFixture({ notes: "  SYNTHETIC V2 VERIFICATION: private run" }), true);
  assert.equal(containsReservedEngineeringFixture({ title: "A genuine customer plan", notes: "Museum and dinner" }), false);
});

test("support-piece swaps cannot qualify as materially distinct alternatives", () => {
  const base = [garment("top", "top"), garment("bottom", "bottom")];
  const primary = look("primary", [...base, garment("shoe-a", "shoes")]);
  const supportSwap = look("support-swap", [...base, garment("shoe-b", "shoes"), garment("bag", "bag")]);
  const foundationChange = look("foundation-change", [garment("top-b", "top"), garment("bottom-b", "bottom"), garment("shoe-a", "shoes")]);
  assert.equal(materiallyDistinctFoundations(primary, supportSwap), false);
  assert.equal(materiallyDistinctFoundations(primary, foundationChange), true);
  assert.throws(() => assertPersistableRecommendationLooks([primary, supportSwap], owner), /support-only alternative/);
});
