import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const dashboardSource = readFileSync(
  resolve(process.cwd(), "lib/recommendations/diagnostics/dashboard-data.ts"),
  "utf8",
);

test("founder diagnostics uses server-only owner-scoped data access after authorization", () => {
  assert.match(dashboardSource, /createAdminClient\(\)/);
  assert.doesNotMatch(dashboardSource, /from\s+["']@\/lib\/supabase\/server["']/);
  assert.match(
    dashboardSource,
    /resolveFeatureStyleProfile\(userId,\s*["']dress-my-day["'],\s*supabase\)/,
  );
  assert.match(dashboardSource, /\.eq\(["']user_id["'],\s*userId\)/);
});
