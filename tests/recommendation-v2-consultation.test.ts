import assert from "node:assert/strict";
import test from "node:test";
import {
  CUSTOMER_MEMORY_COMMAND_VERSION,
  RECOMMENDATION_AUTHORITY_VERSION,
  V2_CONSULTATION_COMMAND_VERSION,
  submitConsultation,
  type ConsultationCommand,
  type CustomerMemoryCommand,
  type CustomerMemoryRepository,
  type PersistedCustomerMemoryMutation,
} from "@/lib/recommendations/v2";

const requestedAt = "2026-07-29T16:00:00.000Z";
const command = (inputMethod: ConsultationCommand["inputMethod"]): ConsultationCommand => ({
  commandVersion: V2_CONSULTATION_COMMAND_VERSION,
  consultationId: `consultation-${inputMethod}`,
  requestId: "request-a",
  ownerUserId: "customer-a",
  inputMethod,
  originalLanguage: "Please keep the shoes flat and walkable.",
  scope: {
    kind: "today-only", localDate: "2026-07-29", timezone: "America/New_York",
    timezoneBehavior: "fixed-at-creation", dailyEventId: "event-a",
  },
  directive: { kind: "footwear", subject: "walking", action: "require", value: "high" },
  authorization: {
    authorityVersion: RECOMMENDATION_AUTHORITY_VERSION,
    targetUserId: "customer-a",
    actor: { kind: "customer", actorUserId: "customer-a" },
    idempotencyKey: `idempotency-${inputMethod}`,
    requestedAt,
  },
});

class Repository implements CustomerMemoryRepository {
  fail = false;
  calls: CustomerMemoryCommand[] = [];

  async executeAuthorized(memoryCommand: CustomerMemoryCommand): Promise<PersistedCustomerMemoryMutation> {
    this.calls.push(memoryCommand);
    if (this.fail) throw new Error("synthetic failure");
    return {
      recordId: "correction-a", ownerUserId: memoryCommand.authorization.targetUserId,
      recordKind: "correction", operation: "created",
      scope: "scope" in memoryCommand ? memoryCommand.scope : { kind: "until-restored" },
      revisions: { correctionRevision: 2, suppressionRevision: 1 }, auditRecordId: null,
    };
  }
}

test("typed, Enter-key, and suggested prompts use one durable consultation path", async () => {
  for (const method of ["typed", "enter-key", "suggested-prompt"] as const) {
    const repository = new Repository();
    const result = await submitConsultation(repository, command(method));
    assert.equal(result.status, "succeeded");
    assert.equal(repository.calls.length, 1);
    assert.equal(repository.calls[0]?.commandVersion, CUSTOMER_MEMORY_COMMAND_VERSION);
    if (result.status === "succeeded") {
      assert.equal(result.draft, "");
      assert.equal(result.rebuildRequired, true);
      assert.equal(result.ownerUserId, "customer-a");
    }
  }
});

test("a persistence failure preserves customer language and exposes a retryable state", async () => {
  const repository = new Repository();
  repository.fail = true;
  const original = command("typed");
  const result = await submitConsultation(repository, original);
  assert.equal(result.status, "failed");
  if (result.status === "failed") {
    assert.equal(result.draft, original.originalLanguage);
    assert.equal(result.retryable, true);
    assert.doesNotMatch(result.message, /remembered|saved|applied/i);
    assert.equal("remembered" in result, false, "failed persistence cannot emit remembered language");
  }
});

test("expired or mismatched customer authority cannot mutate another customer", async () => {
  const repository = new Repository();
  const mismatch = command("enter-key");
  mismatch.authorization.targetUserId = "customer-b";
  const result = await submitConsultation(repository, mismatch);
  assert.equal(result.status, "failed");
  assert.equal(repository.calls.length, 0);
});

test("Founder and diagnostic actors cannot enter the customer correction path", async () => {
  for (const kind of ["founder-evaluation", "diagnostic"] as const) {
    const repository = new Repository();
    const unauthorized = command("suggested-prompt");
    unauthorized.authorization.actor = { kind, actorId: `${kind}-actor` };
    const result = await submitConsultation(repository, unauthorized);
    assert.equal(result.status, "failed");
    assert.equal(repository.calls.length, 0);
  }
});
