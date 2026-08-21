import assert from "node:assert/strict";
import test from "node:test";
import { isWearAvailabilityChoice, suggestedAvailabilityAfterWear } from "../lib/recommendations/wear-review";
import fs from "node:fs";

test("wear review proposes transparent category-aware availability", () => {
  assert.equal(suggestedAvailabilityAfterWear("Activewear"), "laundry");
  assert.equal(suggestedAvailabilityAfterWear("Shoes"), "available");
  assert.equal(suggestedAvailabilityAfterWear("Dresses"), "available");
});

test("wear review accepts only visible V1 choices", () => {
  assert.equal(isWearAvailabilityChoice("available"), true);
  assert.equal(isWearAvailabilityChoice("laundry"), true);
  assert.equal(isWearAvailabilityChoice("dirty"), false);
});

test("wear review route accepts Supabase's single related garment shape before creating History", () => {
  const source = fs.readFileSync("app/api/recommendations/[id]/wore/route.ts", "utf8");
  assert.match(source, /Array\.isArray\(link\.clothing_items\)/);
  assert.ok(source.indexOf("const recommendationIds") < source.indexOf('from("outfits").insert'));
});

test("wear review has an explicit close control and click-outside dismissal", () => {
  const source = fs.readFileSync("app/today/_components/today-workspace.tsx", "utf8");
  assert.match(source, /aria-label="Close wear review"/);
  assert.match(source, /event\.target === event\.currentTarget/);
});
