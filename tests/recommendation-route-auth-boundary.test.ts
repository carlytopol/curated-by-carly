import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routeSource = readFileSync(
  new URL("../app/api/daily-events/[id]/recommendations/route.ts", import.meta.url),
  "utf8",
);

test("recommendation regeneration uses owner-scoped server access after authentication", () => {
  assert.match(routeSource, /const userId = await requireCurrentUserId\(\)/);
  assert.match(routeSource, /const supabase = createAdminClient\(\)/);
  assert.match(routeSource, /resolveServerRecommendationEngine\(userId\)/);
  assert.match(routeSource, /client:\s*await createClient\(\),\s*userId/);
  assert.match(routeSource, /\.eq\("user_id", userId\)/);
});

test("expired recommendation sessions return an actionable authentication response", () => {
  assert.match(routeSource, /error instanceof AuthenticationRequiredError/);
  assert.match(routeSource, /code: "authentication_required"/);
  assert.match(routeSource, /status: 401/);
});

test("explicit owned pieces enter governed retrieval before rotation can omit them", () => {
  assert.match(routeSource, /resolveExplicitlyRequestedItemIds\(\s*closet,/);
  assert.match(routeSource, /const governedWardrobe = \[/);
  assert.match(routeSource, /wardrobe: governedWardrobe/);
  assert.match(routeSource, /requiredItemIds,/);
});
