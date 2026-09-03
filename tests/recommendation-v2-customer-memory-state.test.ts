import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveCustomerMemoryRows,
} from "@/lib/recommendations/v2/customer-memory-state-repository";
import { SIMILAR_CONTEXT_MATCHER_VERSION } from "@/lib/recommendations/v2/customer-memory";

const ownerUserId = "synthetic:owner-a";
const createdAt = "2026-08-02T14:00:00.000Z";
const context = {
  ownerUserId,
  localDate: "2026-08-02",
  timezone: "America/New_York",
  dailyEventId: "event-a",
  occasion: "dinner" as const,
  dayCharacter: "social" as const,
  socialStakes: "socially-visible" as const,
};

const todayScope = {
  kind: "today-only" as const,
  localDate: context.localDate,
  timezone: context.timezone,
  timezoneBehavior: "fixed-at-creation" as const,
  dailyEventId: context.dailyEventId,
};

test("resolves only active owner-scoped memory and preserves authoritative revisions", () => {
  const state = resolveCustomerMemoryRows({
    context,
    requestId: "request-a",
    generatedAt: createdAt,
    revision: { user_id: ownerUserId, correction_revision: "4", suppression_revision: "7" },
    correctionRows: [{
      id: "correction-a",
      user_id: ownerUserId,
      status: "active",
      scope_context: todayScope,
      original_language: "Make this more polished.",
      directive: { kind: "outfit-direction", direction: "polished", action: "prefer" },
      authority: "customer-current",
      revision: "4",
      supersedes_record_id: null,
      created_at: createdAt,
      restored_at: null,
    }],
    suppressionRows: [{
      id: "suppression-a",
      user_id: ownerUserId,
      item_id: "item-a",
      status: "active",
      scope_context: { kind: "until-restored" },
      original_language: "Take this item out of rotation.",
      authority: "customer-current",
      revision: "7",
      supersedes_record_id: null,
      created_at: createdAt,
      restored_at: null,
    }],
  });

  assert.deepEqual(state.revisions, { correctionRevision: 4, suppressionRevision: 7 });
  assert.equal(state.activeCorrectionRefs[0]?.scope, "today-only");
  assert.equal(state.activeSuppressionRefs[0]?.itemId, "item-a");
  assert.equal(state.activeSuppressionRefs[0]?.active, true);
  assert.equal(state.activeSuppressionRefs[0]?.evidenceRef.authority, "customer-current");
  assert.equal(state.correctionStateRef.artifactRevision, "4");
  assert.equal(state.suppressionStateRef.artifactRevision, "7");
});

test("excludes restored and nonmatching similar-context memory", () => {
  const similarScope = {
    kind: "similar-contexts" as const,
    matcher: {
      matcherVersion: SIMILAR_CONTEXT_MATCHER_VERSION,
      occasion: "workout" as const,
      dayCharacter: null,
      socialStakes: null,
    },
    confirmation: {
      status: "confirmed" as const,
      plainLanguageDescription: "Future workouts",
      confirmedByUserId: ownerUserId,
      confirmedAt: createdAt,
      matcherVersionPresented: SIMILAR_CONTEXT_MATCHER_VERSION,
    },
  };
  const state = resolveCustomerMemoryRows({
    context,
    requestId: "request-b",
    generatedAt: createdAt,
    revision: null,
    correctionRows: [],
    suppressionRows: [{
      id: "restored",
      user_id: ownerUserId,
      item_id: "item-restored",
      status: "restored",
      scope_context: { kind: "until-restored" },
      original_language: "",
      authority: "customer-current",
      revision: 1,
      supersedes_record_id: null,
      created_at: createdAt,
      restored_at: createdAt,
    }, {
      id: "other-context",
      user_id: ownerUserId,
      item_id: "item-workout",
      status: "active",
      scope_context: similarScope,
      original_language: "",
      authority: "customer-current",
      revision: 2,
      supersedes_record_id: null,
      created_at: createdAt,
      restored_at: null,
    }],
  });
  assert.deepEqual(state.suppressions, []);
  assert.deepEqual(state.activeSuppressionRefs, []);
});

test("rejects any cross-customer rows before creating recommendation evidence", () => {
  assert.throws(() => resolveCustomerMemoryRows({
    context,
    requestId: "request-c",
    generatedAt: createdAt,
    revision: { user_id: "synthetic:owner-b", correction_revision: 1, suppression_revision: 1 },
    correctionRows: [],
    suppressionRows: [],
  }), /owner mismatch/i);
});
