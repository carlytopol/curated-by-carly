import assert from "node:assert/strict";
import test from "node:test";
import { isActiveShopperConversation, SHOPPER_ACTIVE_WINDOW_MS } from "../lib/personal-shopper/session";

test("a Personal Shopper conversation remains active for four hours", () => {
  const now = Date.parse("2026-07-13T18:00:00.000Z");
  const updatedAt = new Date(now - SHOPPER_ACTIVE_WINDOW_MS + 1).toISOString();
  assert.equal(isActiveShopperConversation(updatedAt, now), true);
});

test("a Personal Shopper conversation archives at the four-hour boundary", () => {
  const now = Date.parse("2026-07-13T18:00:00.000Z");
  const updatedAt = new Date(now - SHOPPER_ACTIVE_WINDOW_MS).toISOString();
  assert.equal(isActiveShopperConversation(updatedAt, now), false);
});

test("an invalid conversation timestamp is never active", () => {
  assert.equal(isActiveShopperConversation("not-a-date"), false);
});
