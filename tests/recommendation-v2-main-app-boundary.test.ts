import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const endpoint = readFileSync(
  new URL("../app/api/daily-events/[id]/recommendations/route.ts", import.meta.url),
  "utf8",
);
const followUpEndpoint = readFileSync(
  new URL("../app/api/recommendations/[id]/follow-up/route.ts", import.meta.url),
  "utf8",
);
const followUpService = readFileSync(
  new URL("../lib/recommendations/v2/follow-up.server.ts", import.meta.url),
  "utf8",
);
const followUpUi = readFileSync(
  new URL("../app/today/_components/recommendation-follow-up.tsx", import.meta.url),
  "utf8",
);
const mainAppV2 = readFileSync(
  new URL("../lib/recommendations/v2/main-app.server.ts", import.meta.url),
  "utf8",
);

test("main Dress My Day endpoint uses the server-enforced V2 router before legacy generation", () => {
  const routing = endpoint.indexOf("resolveServerRecommendationEngine(userId)");
  const v2 = endpoint.indexOf("await generateMainAppV2Recommendation", routing);
  const legacy = endpoint.indexOf("generateGovernedRecommendations({", v2);
  assert.ok(routing >= 0);
  assert.ok(v2 > routing);
  assert.ok(legacy > v2);
  assert.doesNotMatch(endpoint.slice(v2, legacy), /catch[\s\S]*legacy/i);
});

test("V2 follow-ups use authoritative customer memory inside the owner-scoped route", () => {
  assert.match(followUpEndpoint, /resolveServerRecommendationEngine\(userId\)\.engine === "v2"/);
  assert.match(followUpEndpoint, /handleMainAppV2FollowUp/);
  assert.match(followUpService, /SupabaseCustomerMemoryRepository\(input\.client, input\.userId\)/);
  assert.match(followUpService, /executeCustomerMemoryCommand\(repository, command\)/);
  assert.match(followUpService, /kind: "create-suppression"/);
  assert.match(followUpService, /kind: "restore-suppression"/);
  assert.match(followUpService, /kind: "today-only"/);
  assert.doesNotMatch(followUpService, /service.role|service_role|SUPABASE_SERVICE_ROLE_KEY/);
});

test("correction UI does not promise three alternatives when fewer qualify", () => {
  assert.doesNotMatch(followUpUi, /composing three new looks/);
  assert.doesNotMatch(followUpUi, /applied to three new outfit options/);
  assert.match(followUpUi, /regenerated\.length/);
});

test("V2 asserts owner and structural validity immediately before persistence", () => {
  const assertion = mainAppV2.indexOf("assertPersistableRecommendationLooks(looks, input.userId)");
  const persistence = mainAppV2.indexOf("persist_recommendation_run_v2", assertion);
  assert.ok(assertion >= 0);
  assert.ok(persistence > assertion);
});
