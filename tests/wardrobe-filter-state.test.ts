import assert from "node:assert/strict";
import test from "node:test";
import { readWardrobeFilters, safeWardrobeReturnPath, wardrobeDetailHref, wardrobeFilterHref } from "../lib/wardrobe/filter-state";

test("wardrobe filters round-trip through the URL", () => {
  const state = { categories: ["Women:Dresses"], subcategories: ["Women:Dresses:Dinner Dress"] };
  const href = wardrobeFilterHref(state);
  assert.deepEqual(readWardrobeFilters(new URL(href, "https://curated.test").searchParams), state);
  assert.equal(wardrobeDetailHref("piece-1", href).startsWith("/closet/piece-1?returnTo="), true);
});

test("wardrobe return paths allow Dress My Day but cannot leave Curated", () => {
  assert.equal(safeWardrobeReturnPath("/closet?category=Women%3ADresses"), "/closet?category=Women%3ADresses");
  assert.equal(
    safeWardrobeReturnPath("/today?event=event-1&option=2#event-event-1"),
    "/today?event=event-1&option=2#event-event-1",
  );
  assert.equal(safeWardrobeReturnPath("https://example.com"), "/closet");
  assert.equal(safeWardrobeReturnPath("//example.com"), "/closet");
  assert.equal(safeWardrobeReturnPath("/profile"), "/closet");
});
