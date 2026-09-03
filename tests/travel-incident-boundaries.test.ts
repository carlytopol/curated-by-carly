import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(new URL("../app/api/packing/route.ts", import.meta.url), "utf8");
const client = readFileSync(new URL("../app/packing/packing-chat.tsx", import.meta.url), "utf8");
const data = readFileSync(new URL("../lib/data/shopper-conversations.ts", import.meta.url), "utf8");
const rls = readFileSync(new URL("../supabase/personal-shopper-rls.sql", import.meta.url), "utf8");
const askCurated = readFileSync(new URL("../app/api/recommendations/[id]/follow-up/route.ts", import.meta.url), "utf8");

test("Travel authenticates before reading private request content and scopes conversation lookup to the customer", () => {
  assert.ok(route.indexOf("requireCurrentUserId()") < route.indexOf("request.json()"));
  assert.match(route, /getTravelConversationState\(userId, suppliedConversationId\)/);
  assert.match(data, /\.eq\("user_id", userId\)/);
  assert.match(data, /\.eq\("conversation_id", conversationId\)/);
});

test("database RLS prevents a second customer from reading or inserting into another conversation", () => {
  assert.match(rls, /shopper_conversations for select to authenticated\s+using \(auth\.uid\(\) = user_id\)/);
  assert.match(rls, /shopper_messages for select to authenticated\s+using \(auth\.uid\(\) = user_id\)/);
  assert.match(rls, /where id = conversation_id and user_id = auth\.uid\(\)/);
});

test("Travel retry reuses one client request id and preserves text on failure", () => {
  assert.match(client, /crypto\.randomUUID\(\)/);
  assert.match(client, /retryRequest\.clientRequestId/);
  assert.match(client, /if \(!firstRequest\) setDraft\(userText\)/);
  assert.match(client, /if \(isSending\) return/);
  assert.match(route, /messageId: clientRequestId/);
});

test("Travel exposes distinct customer-safe operational states", () => {
  for (const code of [
    "authentication_required",
    "conversation_expired",
    "conversation_unavailable",
    "request_rate_limited",
    "conversation_read_failed",
    "conversation_persistence_failed",
    "travel_context_unavailable",
  ]) {
    assert.match(route, new RegExp(`code: "${code}"`), code);
  }
});

test("Travel and Ask Curated use privacy-safe shared provider incident logging", () => {
  assert.match(route, /logAIServiceFailure/);
  assert.match(askCurated, /logAIServiceFailure/);
  assert.doesNotMatch(route, /console\.error\("Packing consultation unavailable\.", error\)/);
  assert.doesNotMatch(route, /console\.warn\("Travel weather context unavailable\.", weatherError\)/);
  assert.doesNotMatch(askCurated, /console\.error\("Recommendation follow-up prose unavailable; continuing with deterministic outfit regeneration\.", replyError\)/);
});
