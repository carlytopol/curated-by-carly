import assert from "node:assert/strict";
import test from "node:test";
import { resolveV2EvaluationAccess } from "@/lib/recommendations/v2";

const permitted = {
  activationAuthorized: true,
  enabled: true,
  deploymentEnvironment: "preview" as const,
  requestHost: "v2-evaluation.example.test",
  isolatedHostAllowlist: ["v2-evaluation.example.test"],
  authenticatedEmail: "founder@example.test",
  founderEmailAllowlist: ["founder@example.test"],
};

test("V2 Evaluation is fail-closed until Product authorizes activation", () => {
  const decision = resolveV2EvaluationAccess({
    ...permitted,
    activationAuthorized: false,
  });
  assert.deepEqual(decision, {
    accessVersion: "v2-evaluation-access.v1.0.0",
    allowed: false,
    reason: "activation-not-authorized",
  });
});

test("V2 Evaluation cannot run on Production or an unlisted host", () => {
  assert.equal(resolveV2EvaluationAccess({
    ...permitted,
    deploymentEnvironment: "production",
  }).allowed, false);
  assert.equal(resolveV2EvaluationAccess({
    ...permitted,
    requestHost: "curated-by-carly.vercel.app",
  }).allowed, false);
});

test("V2 Evaluation requires both founder authentication and allowlisting", () => {
  assert.equal(resolveV2EvaluationAccess({
    ...permitted,
    authenticatedEmail: null,
  }).allowed, false);
  assert.equal(resolveV2EvaluationAccess({
    ...permitted,
    authenticatedEmail: "customer@example.test",
  }).allowed, false);
});

test("an authorized isolated evaluation uses a versioned, separate cache partition", () => {
  const decision = resolveV2EvaluationAccess(permitted);
  assert.deepEqual(decision, {
    accessVersion: "v2-evaluation-access.v1.0.0",
    allowed: true,
    mode: "founder-v2-evaluation",
    cachePartition: "recommendation-v2-evaluation",
  });
});
