import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const deleteRoute = readFileSync(
  new URL("../app/api/closet-items/[id]/route.ts", import.meta.url),
  "utf8",
);
const dailyEvents = readFileSync(
  new URL("../lib/data/daily-events.ts", import.meta.url),
  "utf8",
);
const detailPage = readFileSync(
  new URL("../app/closet/[id]/page.tsx", import.meta.url),
  "utf8",
);

test("wardrobe deletion invalidates owner-scoped active legacy and V2 artifacts", () => {
  assert.match(deleteRoute, /requireCurrentUserId\(\)/);
  assert.match(deleteRoute, /recommendation_items/);
  assert.match(deleteRoute, /recommendation_set_id/);
  assert.match(deleteRoute, /recommendation_option_items_v2/);
  assert.match(deleteRoute, /recommendation_runs_v2/);
  assert.match(deleteRoute, /\.eq\("user_id", userId\)/);
  assert.match(deleteRoute, /recommendation\.status === "suggested"/);
});

test("Today never promotes historical recommendation copy as the active edit", () => {
  assert.match(dailyEvents, /recommendation\.status === "suggested"/);
});

test("a wardrobe detail record exposes an explicit permanent removal path", () => {
  assert.match(detailPage, /Permanently remove this piece/);
  assert.match(detailPage, /method: "DELETE"/);
  assert.match(detailPage, /withdrawing affected recommendations/);
});
