import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  AUTHORITY_SOURCE_MATRIX,
  CUSTOMER_MEMORY_COMMAND_VERSION,
  CURRENT_PREVIEW_V2_COMPATIBILITY_VERSION,
  SIMILAR_CONTEXT_MATCHER_VERSION,
  authorizeCustomerStateMutation,
  customerMemoryScopeMatches,
  executeCustomerMemoryCommand,
  mayAuthorityMutateCustomerState,
  projectCustomerMemoryForCurrentPreview,
  validateCorrectionDirective,
  validateCustomerMemoryScope,
  type CustomerMemoryCommand,
  type CustomerMemoryRepository,
  type PersistedCustomerMemoryMutation,
} from "@/lib/recommendations/v2";

const requestedAt = "2026-07-29T13:00:00.000Z";
const customerAuthorization = (actorUserId = "customer-a", targetUserId = "customer-a") => ({
  authorityVersion: "recommendation-authority.v2.1.0" as const,
  targetUserId,
  actor: { kind: "customer" as const, actorUserId },
  idempotencyKey: "command-1",
  requestedAt,
});

test("canonical correction contract covers every Product-required correction family", () => {
  const directives = [
    { kind: "current-intention", intention: "approachable" },
    { kind: "event-context", occasion: "school-community", action: "set" },
    { kind: "formality", floor: "casual", ceiling: "polished" },
    { kind: "ceremony", allowance: "restrained" },
    { kind: "effort", level: "moderate" },
    { kind: "comfort", subject: "movement", action: "require" },
    { kind: "coverage", subject: "shoulders", action: "require", value: "covered" },
    { kind: "footwear", subject: "walking", action: "require", value: "sustained" },
    { kind: "carrying", subject: "hands-free", action: "prefer", value: "yes" },
    { kind: "accessibility", subject: "mobility", requirement: "step-free" },
    { kind: "garment-fact", itemId: "item-a", fact: "has-pockets", value: "true" },
    { kind: "garment-occasion-role", itemId: "item-a", occasion: "errands", action: "prefer" },
    { kind: "outfit-direction", direction: "quiet polish", action: "prefer" },
    { kind: "piece-change", itemId: "item-a", action: "replace" },
    { kind: "item-instruction", itemId: "item-a", action: "avoid-item" },
    { kind: "quality-instruction", quality: "comfortable", action: "require" },
    { kind: "outfit-relationship", firstItemId: "item-a", secondItemId: "item-b", relationship: "does-not-work-together" },
  ];
  for (const directive of directives) assert.deepEqual(validateCorrectionDirective(directive), []);
  assert.deepEqual(validateCorrectionDirective({ kind: "current-intention", intention: "" }), [
    "current-intention requires intention",
  ]);
  assert.deepEqual(validateCorrectionDirective({ kind: "invented" }), ["unsupported correction directive"]);
});
const serviceAuthorization = (targetUserId = "customer-a") => ({
  authorityVersion: "recommendation-authority.v2.1.0" as const,
  targetUserId,
  actor: {
    kind: "authorized-customer-service" as const,
    actorId: "support-agent-7",
    authorizationId: "support-grant-44",
    targetUserId,
    reason: "Customer requested help in an authenticated support session.",
    confirmationChannel: "support-session" as const,
  },
  idempotencyKey: "service-command-1",
  requestedAt,
});
const todayScope = {
  kind: "today-only" as const,
  localDate: "2026-07-29",
  timezone: "America/New_York",
  timezoneBehavior: "fixed-at-creation" as const,
  dailyEventId: "event-a",
};
const similarScope = {
  kind: "similar-contexts" as const,
  matcher: {
    matcherVersion: SIMILAR_CONTEXT_MATCHER_VERSION,
    occasion: "school-community" as const,
    dayCharacter: "professional" as const,
    socialStakes: "professionally-visible" as const,
  },
  confirmation: {
    status: "confirmed" as const,
    plainLanguageDescription: "School-community days when you are visible to other parents",
    confirmedByUserId: "customer-a",
    confirmedAt: requestedAt,
    matcherVersionPresented: SIMILAR_CONTEXT_MATCHER_VERSION,
  },
};
const createCorrection = (): CustomerMemoryCommand => ({
  commandVersion: CUSTOMER_MEMORY_COMMAND_VERSION,
  kind: "create-correction",
  authorization: customerAuthorization(),
  scope: similarScope,
  originalLanguage: "Keep this polished and practical for school visits.",
  directive: { kind: "quality-instruction", quality: "comfortable", action: "require" },
});

class MemoryRepository implements CustomerMemoryRepository {
  correctionRevision = 0;
  suppressionRevision = 0;
  fail = false;
  records = new Map<string, PersistedCustomerMemoryMutation>();

  async executeAuthorized(command: CustomerMemoryCommand) {
    if (this.fail) throw new Error("database unavailable");
    const ownerUserId = command.authorization.targetUserId;
    const existing = this.records.get(command.authorization.idempotencyKey);
    if (existing) return existing;
    const recordKind = command.kind.includes("suppression") ? "suppression" as const : "correction" as const;
    if (recordKind === "suppression") this.suppressionRevision += 1;
    else this.correctionRevision += 1;
    const restoring = command.kind === "restore-correction" || command.kind === "restore-suppression";
    const mutation: PersistedCustomerMemoryMutation = {
      recordId: restoring ? command.recordId : `record-${this.records.size + 1}`,
      ownerUserId,
      recordKind,
      operation: restoring ? "restored" : "created",
      scope: "scope" in command ? command.scope : { kind: "until-restored" },
      revisions: {
        correctionRevision: this.correctionRevision,
        suppressionRevision: this.suppressionRevision,
      },
      auditRecordId: command.authorization.actor.kind === "authorized-customer-service" ? "audit-1" : null,
    };
    this.records.set(command.authorization.idempotencyKey, mutation);
    return mutation;
  }
}

test("authority matrix separates customer service from connected evidence services", () => {
  assert.equal(mayAuthorityMutateCustomerState("authorized-customer-service"), true);
  assert.equal(mayAuthorityMutateCustomerState("connected-external-service"), false);
  assert.deepEqual(
    AUTHORITY_SOURCE_MATRIX.find(({ authority }) => authority === "connected-external-service")?.allowedSources,
    ["calendar", "weather", "venue"],
  );
  const external = authorizeCustomerStateMutation({
    ...customerAuthorization(),
    actor: { kind: "connected-external-service", actorId: "google-calendar" },
  });
  assert.deepEqual(external, { authorized: false, reason: "actor-not-authorized" });
});

test("Founder, diagnostics, Product, tests, and inference cannot mutate customer memory", () => {
  for (const kind of ["founder-evaluation", "diagnostic", "product-evaluation", "automated-test", "inference"] as const) {
    const result = authorizeCustomerStateMutation({
      ...customerAuthorization(),
      actor: { kind, actorId: `${kind}-actor` },
    });
    assert.equal(result.authorized, false);
  }
});

test("customer and governed customer service authorization enforce target ownership and audit fields", () => {
  assert.equal(authorizeCustomerStateMutation(customerAuthorization()).authorized, true);
  assert.deepEqual(
    authorizeCustomerStateMutation(customerAuthorization("customer-b", "customer-a")),
    { authorized: false, reason: "customer-mismatch" },
  );
  const service = authorizeCustomerStateMutation(serviceAuthorization());
  assert.deepEqual(service, {
    authorized: true,
    authority: "authorized-customer-service",
    auditRequired: true,
  });
  const mismatch = serviceAuthorization();
  mismatch.actor.targetUserId = "customer-b";
  assert.deepEqual(authorizeCustomerStateMutation(mismatch), {
    authorized: false,
    reason: "customer-service-target-mismatch",
  });
});

test("today-only and similar-context matching are exact and never broaden on missing context", () => {
  const exact = {
    ownerUserId: "customer-a",
    localDate: "2026-07-29",
    timezone: "America/New_York",
    dailyEventId: "event-a",
    occasion: "school-community" as const,
    dayCharacter: "professional" as const,
    socialStakes: "professionally-visible" as const,
  };
  assert.equal(customerMemoryScopeMatches(todayScope, exact), true);
  assert.equal(customerMemoryScopeMatches(todayScope, { ...exact, dailyEventId: "event-b" }), false);
  assert.equal(customerMemoryScopeMatches(similarScope, exact), true);
  assert.equal(customerMemoryScopeMatches(similarScope, { ...exact, occasion: "dinner" }), false);
  assert.equal(customerMemoryScopeMatches(similarScope, { ...exact, dayCharacter: null }), false);
  assert.ok(validateCustomerMemoryScope({
    ...similarScope,
    matcher: { ...similarScope.matcher, dayCharacter: null, socialStakes: null },
  }).length > 0);
  assert.ok(validateCustomerMemoryScope({
    ...similarScope,
    confirmation: { ...similarScope.confirmation, status: "pending" },
  }, "customer-a").includes("similar-context scope requires customer confirmation"));
  assert.ok(validateCustomerMemoryScope({
    ...similarScope,
    confirmation: { ...similarScope.confirmation, plainLanguageDescription: "similar occasions" },
  }, "customer-a").some((message) => message.includes("specific customer-readable")));
});

test("persistence confirmation follows commit and carries owner-scoped cache revisions", async () => {
  const repository = new MemoryRepository();
  const result = await executeCustomerMemoryCommand(repository, createCorrection());
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.match(result.customerMessage, /School-community days/);
  assert.match(result.rememberedMessage, /restore/);
  assert.deepEqual(result.cacheInvalidation, {
    ownerUserId: "customer-a",
    correctionRevision: 1,
    suppressionRevision: 0,
  });
});

test("failed persistence preserves input, confirms nothing, and is retryable", async () => {
  const repository = new MemoryRepository();
  repository.fail = true;
  const result = await executeCustomerMemoryCommand(repository, createCorrection());
  assert.deepEqual(result, {
    success: false,
    retryable: true,
    reason: "Curated could not save that note yet. Nothing was changed.",
    preservedInput: "Keep this polished and practical for school visits.",
  });
});

test("suppression creation and restoration increment suppression revision without deleting memory", async () => {
  const repository = new MemoryRepository();
  const create: CustomerMemoryCommand = {
    commandVersion: CUSTOMER_MEMORY_COMMAND_VERSION,
    kind: "create-suppression",
    authorization: { ...customerAuthorization(), idempotencyKey: "suppression-create" },
    scope: { kind: "until-restored" },
    originalLanguage: "Take the Roland Garros shirt out of rotation.",
    itemId: "roland-garros-shirt",
  };
  const created = await executeCustomerMemoryCommand(repository, create);
  assert.equal(created.success, true);
  const restore: CustomerMemoryCommand = {
    commandVersion: CUSTOMER_MEMORY_COMMAND_VERSION,
    kind: "restore-suppression",
    authorization: { ...customerAuthorization(), idempotencyKey: "suppression-restore" },
    recordId: created.success ? created.mutation.recordId : "missing",
  };
  const restored = await executeCustomerMemoryCommand(repository, restore);
  assert.equal(restored.success, true);
  if (restored.success) {
    assert.equal(restored.mutation.operation, "restored");
    assert.equal(restored.mutation.revisions.suppressionRevision, 2);
    assert.match(restored.customerMessage, /no longer apply/);
  }
});

test("V2 compatibility is read-only and never broadens durable memory into Current Preview", () => {
  const base = {
    recordVersion: "customer-memory-record.v2.2.0" as const,
    id: "correction-a",
    ownerUserId: "customer-a",
    status: "active" as const,
    originalLanguage: "Keep this practical.",
    directive: { kind: "quality-instruction" as const, quality: "comfortable" as const, action: "require" as const },
    authority: "customer-current" as const,
    revision: 1,
    supersedesRecordId: null,
    createdAt: requestedAt,
    restoredAt: null,
  };
  const today = projectCustomerMemoryForCurrentPreview({ ...base, scope: todayScope });
  assert.equal(today.compatibilityVersion, CURRENT_PREVIEW_V2_COMPATIBILITY_VERSION);
  assert.equal(today.visibility, "defined-not-connected");
  assert.equal(today.writableFromCurrentPreview, false);
  const durable = projectCustomerMemoryForCurrentPreview({ ...base, scope: { kind: "until-restored" } });
  assert.equal(durable.visibility, "v2-only");
});

test("Phase 1 SQL restricts writes to owner-scoped transactional RPCs", () => {
  const sql = readFileSync("supabase/recommendation-v2-phase-1.sql", "utf8");
  for (const table of [
    "recommendation_customer_revisions_v2",
    "recommendation_corrections_v2",
    "recommendation_suppressions_v2",
    "recommendation_customer_service_audit_v2",
  ]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(sql, /auth\.uid\(\) = user_id/);
  assert.match(sql, /customer_execute_recommendation_memory_v2/);
  assert.match(sql, /service_execute_recommendation_memory_v2/);
  assert.match(sql, /auth\.role\(\) <> 'service_role'/);
  assert.doesNotMatch(sql, /customer_service_audit_v2 for insert\s+to authenticated/i);
  assert.doesNotMatch(sql, /for update\s+to authenticated/i);
  assert.match(sql, /revoke insert, update, delete .* from authenticated, service_role/);
  assert.match(sql, /service_audit_id uuid references/);
  assert.match(sql, /original recommendation-memory evidence is immutable/);
  assert.match(sql, /create a superseding record/);
  assert.match(sql, /bump_recommendation_memory_revision_v2/);
  assert.match(sql, /authority in \('customer-current', 'authorized-customer-service'\)/);
  assert.match(sql, /today-only event does not belong to target customer/);
  assert.match(sql, /similar-context scope requires target-customer confirmation/);
});

test("Phase 1 remains disabled by default while the main endpoint is server-routed", () => {
  const continuity = readFileSync("lib/recommendations/v2/continuity.ts", "utf8");
  assert.match(continuity, /enabled: false/);
  assert.match(continuity, /deploymentAuthorized: false/);
  const routeFiles = [
    "app/api/recommendations/[id]/follow-up/route.ts",
    "app/api/daily-events/[id]/recommendations/route.ts",
  ].map((path) => readFileSync(path, "utf8")).join("\n");
  assert.match(routeFiles, /recommendations\/v2/);
  assert.match(routeFiles, /resolveServerRecommendationEngine/);
});
