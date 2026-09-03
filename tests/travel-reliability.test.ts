import test from "node:test";
import assert from "node:assert/strict";
import {
  conversationInputForRequest,
  isRetryableTravelFailure,
  isValidTravelRequestId,
  TRAVEL_CONVERSATION_LIFETIME_MS,
} from "../lib/travel/reliability";

test("first and follow-up Travel requests use valid idempotency identifiers", () => {
  assert.equal(isValidTravelRequestId("ba7b968f-9b27-47d8-a987-0d319028827c"), true);
  assert.equal(isValidTravelRequestId("not-a-request-id"), false);
});

test("a retry replaces the already-persisted message instead of duplicating it", () => {
  const messages = conversationInputForRequest([
    { id: "earlier", role: "assistant" as const, content: "Earlier answer" },
    { id: "ba7b968f-9b27-47d8-a987-0d319028827c", role: "user" as const, content: "Question" },
  ], {
    id: "ba7b968f-9b27-47d8-a987-0d319028827c",
    content: "Question",
  });
  assert.deepEqual(messages, [
    { role: "assistant", content: "Earlier answer" },
    { role: "user", content: "Question" },
  ]);
});

test("multiple follow-ups retain only the bounded recent conversation", () => {
  const saved = Array.from({ length: 14 }, (_, index) => ({
    id: `message-${index}`,
    role: index % 2 ? "assistant" as const : "user" as const,
    content: `Message ${index}`,
  }));
  const result = conversationInputForRequest(saved, { id: "new-request", content: "Latest question" });
  assert.equal(result.length, 12);
  assert.deepEqual(result.at(-1), { role: "user", content: "Latest question" });
});

test("Travel distinguishes retryable operational failures from permanent and expired states", () => {
  for (const code of ["request_rate_limited", "conversation_read_failed", "conversation_persistence_failed", "travel_context_unavailable", "ai_rate_limited", "ai_timed_out", "ai_unavailable"]) {
    assert.equal(isRetryableTravelFailure(code), true, code);
  }
  for (const code of ["authentication_required", "conversation_expired", "conversation_unavailable", "ai_configuration_missing", "ai_credentials_invalid", "ai_model_unavailable", "ai_quota_exhausted"]) {
    assert.equal(isRetryableTravelFailure(code), false, code);
  }
  assert.equal(TRAVEL_CONVERSATION_LIFETIME_MS, 14_400_000);
});
