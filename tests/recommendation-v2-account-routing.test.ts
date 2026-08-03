import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveRecommendationEngineForAccount,
  type RecommendationAccountRoutingConfig,
} from "../lib/recommendations/v2/account-routing";

const founder = "11111111-1111-4111-8111-111111111111";
const customer = "22222222-2222-4222-8222-222222222222";

function config(
  overrides: Partial<RecommendationAccountRoutingConfig> = {},
): RecommendationAccountRoutingConfig {
  return {
    dormantCodeEnabled: true,
    founderActivationAuthorized: true,
    globalKillSwitch: false,
    assignedUserIds: new Set([founder]),
    killedUserIds: new Set(),
    featureFlagRevision: "founder-main-app-1",
    ...overrides,
  };
}

test("only the server-assigned authenticated account enters V2", () => {
  const founderDecision = resolveRecommendationEngineForAccount(founder, config());
  const customerDecision = resolveRecommendationEngineForAccount(customer, config());

  assert.equal(founderDecision.engine, "v2");
  assert.deepEqual(customerDecision, {
    routingVersion: "recommendation-account-routing.v1.0.0",
    engine: "legacy",
    reason: "account-not-assigned",
  });
});

test("an invalid or browser-shaped identity cannot select V2", () => {
  const decision = resolveRecommendationEngineForAccount(
    "founder@example.com?v2=true",
    config({ assignedUserIds: new Set(["founder@example.com?v2=true"]) }),
  );
  assert.equal(decision.engine, "legacy");
});

test("the global kill switch returns every account to legacy", () => {
  const decision = resolveRecommendationEngineForAccount(
    founder,
    config({ globalKillSwitch: true }),
  );
  assert.deepEqual(decision, {
    routingVersion: "recommendation-account-routing.v1.0.0",
    engine: "legacy",
    reason: "global-kill-switch",
  });
});

test("the per-account kill switch affects only that account", () => {
  const assigned = new Set([founder, customer]);
  const killed = new Set([founder]);
  assert.equal(
    resolveRecommendationEngineForAccount(founder, config({ assignedUserIds: assigned, killedUserIds: killed })).engine,
    "legacy",
  );
  assert.equal(
    resolveRecommendationEngineForAccount(customer, config({ assignedUserIds: assigned, killedUserIds: killed })).engine,
    "v2",
  );
});

test("dormant code and Product authorization are independent fail-closed gates", () => {
  assert.equal(
    resolveRecommendationEngineForAccount(founder, config({ dormantCodeEnabled: false })).engine,
    "legacy",
  );
  assert.equal(
    resolveRecommendationEngineForAccount(
      founder,
      config({ founderActivationAuthorized: false }),
    ).engine,
    "legacy",
  );
});

test("V2 cache partitions include account, engine, architecture, and flag revision", () => {
  const decision = resolveRecommendationEngineForAccount(founder, config());
  assert.equal(decision.engine, "v2");
  if (decision.engine !== "v2") return;
  assert.match(decision.cachePartition, /recommendation-architecture\.v2/);
  assert.match(decision.cachePartition, /recommendation-engine\.v2\.1\.1/);
  assert.match(decision.cachePartition, /founder-main-app-1/);
  assert.match(decision.cachePartition, new RegExp(founder));
});
