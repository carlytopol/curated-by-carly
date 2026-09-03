import test from "node:test";
import assert from "node:assert/strict";
import { AIConfigurationError, describeOpenAIServiceFailure, isOpenAIQuotaError, safeAIIncident } from "../lib/ai/errors";

test("identifies exhausted OpenAI API quota errors", () => {
  assert.equal(isOpenAIQuotaError({ status: 429, code: "insufficient_quota" }), true);
  assert.equal(isOpenAIQuotaError({ status: 429, error: { code: "insufficient_quota" } }), true);
  assert.equal(isOpenAIQuotaError({
    status: 429,
    type: "insufficient_quota",
    code: "credit_balance_exhausted",
  }), true);
});

test("does not mislabel ordinary rate limits or unrelated failures as exhausted quota", () => {
  assert.equal(isOpenAIQuotaError({ status: 429, code: "rate_limit_exceeded" }), false);
  assert.equal(isOpenAIQuotaError({ status: 500 }), false);
  assert.equal(isOpenAIQuotaError(null), false);
});

test("describes quota exhaustion without exposing provider internals", () => {
  const result = describeOpenAIServiceFailure(
    { status: 429, code: "insufficient_quota", message: "provider detail" },
    "Ask Curated",
  );
  assert.deepEqual(result, {
    code: "ai_quota_exhausted",
    message: "Ask Curated is unavailable because its AI usage allowance has been reached. Your request has been kept, and Curated’s team needs to restore the allowance.",
  });
  assert.equal(result.message.includes("provider detail"), false);
});

test("distinguishes throttling, timeouts, and other availability failures", () => {
  assert.equal(describeOpenAIServiceFailure({ status: 429 }, "Travel guidance").code, "ai_rate_limited");
  assert.equal(describeOpenAIServiceFailure({ code: "ETIMEDOUT" }, "Travel guidance").code, "ai_timed_out");
  assert.equal(describeOpenAIServiceFailure(new Error("offline"), "Travel guidance").code, "ai_unavailable");
});

test("distinguishes permanent provider configuration failures from retryable outages", () => {
  assert.equal(describeOpenAIServiceFailure(new AIConfigurationError(), "Travel guidance").code, "ai_configuration_missing");
  assert.equal(describeOpenAIServiceFailure({ status: 401, code: "invalid_api_key" }, "Travel guidance").code, "ai_credentials_invalid");
  assert.equal(describeOpenAIServiceFailure({ status: 404, code: "model_not_found" }, "Travel guidance").code, "ai_model_unavailable");
});

test("provider incident metadata excludes private request and credential material", () => {
  const incident = safeAIIncident({
    status: 429,
    code: "credit_balance_exhausted",
    requestID: "req_redacted",
    message: "private itinerary",
    headers: { authorization: "secret", cookie: "private" },
  });
  assert.deepEqual(incident, {
    providerStatus: 429,
    providerCode: "credit_balance_exhausted",
    providerRequestId: "req_redacted",
  });
  assert.equal(JSON.stringify(incident).includes("private itinerary"), false);
  assert.equal(JSON.stringify(incident).includes("secret"), false);
});
