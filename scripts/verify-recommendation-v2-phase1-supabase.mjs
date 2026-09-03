import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_V2_TEST_URL;
const publishableKey = process.env.SUPABASE_V2_TEST_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_V2_TEST_SECRET_KEY;

if (!url || !publishableKey || !secretKey) {
  throw new Error(
    "The isolated Supabase URL, publishable key, and secret key are required.",
  );
}

const admin = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const runId = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
const password = `V2!${crypto.randomUUID()}aA9`;
const emails = [
  `v2-security-a-${runId}@example.invalid`,
  `v2-security-b-${runId}@example.invalid`,
];
const createdUserIds = [];
const evidence = [];

const client = () =>
  createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

async function test(name, run) {
  try {
    await run();
    evidence.push({ name, status: "pass" });
  } catch (error) {
    evidence.push({
      name,
      status: "fail",
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function customerAuthorization(userId, idempotencyKey) {
  return {
    actor: { kind: "customer", actorUserId: userId },
    targetUserId: userId,
    idempotencyKey,
  };
}

function serviceAuthorization(userId, idempotencyKey, extra = {}) {
  return {
    actor: {
      kind: "authorized-customer-service",
      actorId: "synthetic-security-gate",
      authorizationId: `synthetic-${runId}`,
      targetUserId: userId,
      reason: "Isolated Supabase security verification",
      confirmationChannel: "support-session",
      ...extra,
    },
    targetUserId: userId,
    idempotencyKey,
  };
}

function todayScope(userId) {
  return {
    kind: "today-only",
    localDate: "2026-07-29",
    timezone: "America/New_York",
    timezoneBehavior: "fixed-at-creation",
    ownerUserId: userId,
  };
}

function correction(userId, idempotencyKey, extra = {}) {
  return {
    commandVersion: "customer-memory-command.v2.2.0",
    kind: "create-correction",
    authorization: customerAuthorization(userId, idempotencyKey),
    originalLanguage: "Keep this polished but comfortable.",
    scope: todayScope(userId),
    directive: {
      kind: "comfort",
      requirement: "comfortable walking shoes",
      polarity: "require",
    },
    ...extra,
  };
}

async function createSyntheticCustomer(email) {
  const result = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      synthetic: true,
      purpose: "recommendation-v2-phase1-security-gate",
    },
  });
  if (result.error || !result.data.user) {
    throw result.error ?? new Error("Synthetic Auth user was not created.");
  }
  createdUserIds.push(result.data.user.id);
  const signedIn = client();
  const session = await signedIn.auth.signInWithPassword({ email, password });
  if (session.error || !session.data.session) {
    throw session.error ?? new Error("Synthetic Auth session was not issued.");
  }
  return { id: result.data.user.id, client: signedIn };
}

async function expectApiError(run, pattern) {
  const result = await run();
  assert.ok(result.error, "Expected the Supabase operation to fail.");
  assert.match(result.error.message, pattern);
  return result.error;
}

try {
  let customerA;
  let customerB;
  let correctionA;
  let serviceCorrection;

  await test("real Supabase Auth issues two isolated customer sessions", async () => {
    customerA = await createSyntheticCustomer(emails[0]);
    customerB = await createSyntheticCustomer(emails[1]);
    assert.notEqual(customerA.id, customerB.id);
  });

  await test("customer RPC derives ownership from the signed-in JWT", async () => {
    const result = await customerA.client.rpc(
      "customer_execute_recommendation_memory_v2",
      { command: correction(customerA.id, `customer-create-${runId}`) },
    );
    assert.ifError(result.error);
    assert.equal(result.data?.[0]?.owner_user_id, customerA.id);
    correctionA = result.data[0];
  });

  await test("cross-customer targeting fails closed", async () => {
    await expectApiError(
      () =>
        customerA.client.rpc("customer_execute_recommendation_memory_v2", {
          command: correction(customerB.id, `cross-target-${runId}`),
        }),
      /authorization|ownership|mismatch/i,
    );
  });

  await test("RLS exposes only the signed-in customer's rows", async () => {
    const createB = await customerB.client.rpc(
      "customer_execute_recommendation_memory_v2",
      { command: correction(customerB.id, `customer-b-${runId}`) },
    );
    assert.ifError(createB.error);
    const [rowsA, rowsB] = await Promise.all([
      customerA.client.from("recommendation_corrections_v2").select("user_id"),
      customerB.client.from("recommendation_corrections_v2").select("user_id"),
    ]);
    assert.ifError(rowsA.error);
    assert.ifError(rowsB.error);
    assert.ok(rowsA.data.length > 0);
    assert.ok(rowsB.data.length > 0);
    assert.ok(rowsA.data.every((row) => row.user_id === customerA.id));
    assert.ok(rowsB.data.every((row) => row.user_id === customerB.id));
  });

  await test("authenticated direct writes and deletes are denied", async () => {
    await expectApiError(
      () =>
        customerA.client
          .from("recommendation_corrections_v2")
          .update({ original_language: "tampered" })
          .eq("id", correctionA.record_id),
      /permission denied/i,
    );
    await expectApiError(
      () =>
        customerA.client
          .from("recommendation_corrections_v2")
          .delete()
          .eq("id", correctionA.record_id),
      /permission denied/i,
    );
  });

  await test("anonymous callers cannot execute customer or service RPCs", async () => {
    const anonymous = client();
    await expectApiError(
      () =>
        anonymous.rpc("customer_execute_recommendation_memory_v2", {
          command: correction(customerA.id, `anonymous-customer-${runId}`),
        }),
      /permission denied|authentication|authorization/i,
    );
    await expectApiError(
      () =>
        anonymous.rpc("service_execute_recommendation_memory_v2", {
          command: correction(customerA.id, `anonymous-service-${runId}`, {
            authorization: serviceAuthorization(
              customerA.id,
              `anonymous-service-${runId}`,
            ),
          }),
        }),
      /permission denied|authentication|authorization/i,
    );
  });

  await test("authorized service RPC atomically links mutation and audit", async () => {
    const command = correction(customerA.id, `service-create-${runId}`, {
      authorization: serviceAuthorization(
        customerA.id,
        `service-create-${runId}`,
      ),
    });
    const result = await admin.rpc("service_execute_recommendation_memory_v2", {
      command,
    });
    assert.ifError(result.error);
    serviceCorrection = result.data[0];
    assert.ok(serviceCorrection.audit_record_id);
    const linked = await customerA.client
      .from("recommendation_customer_service_audit_v2")
      .select("id,record_id,target_user_id")
      .eq("id", serviceCorrection.audit_record_id)
      .single();
    assert.ifError(linked.error);
    assert.equal(linked.data.record_id, serviceCorrection.record_id);
    assert.equal(linked.data.target_user_id, customerA.id);
  });

  await test("audit failure rolls back mutation and revision", async () => {
    const beforeRows = await customerA.client
      .from("recommendation_corrections_v2")
      .select("id", { count: "exact", head: true });
    const beforeRevision = await customerA.client
      .from("recommendation_customer_revisions_v2")
      .select("correction_revision,suppression_revision")
      .single();
    assert.ifError(beforeRows.error);
    assert.ifError(beforeRevision.error);
    const command = correction(customerA.id, `bad-audit-${runId}`, {
      authorization: serviceAuthorization(
        customerA.id,
        `bad-audit-${runId}`,
        { confirmationChannel: "invalid" },
      ),
    });
    await expectApiError(
      () =>
        admin.rpc("service_execute_recommendation_memory_v2", { command }),
      /constraint|confirmation_channel/i,
    );
    const afterRows = await customerA.client
      .from("recommendation_corrections_v2")
      .select("id", { count: "exact", head: true });
    const afterRevision = await customerA.client
      .from("recommendation_customer_revisions_v2")
      .select("correction_revision,suppression_revision")
      .single();
    assert.equal(afterRows.count, beforeRows.count);
    assert.deepEqual(afterRevision.data, beforeRevision.data);
  });

  await test("immutable evidence uses restoration rather than mutation", async () => {
    const restore = await customerA.client.rpc(
      "customer_execute_recommendation_memory_v2",
      {
        command: {
          commandVersion: "customer-memory-command.v2.2.0",
          kind: "restore-correction",
          authorization: customerAuthorization(
            customerA.id,
            `restore-${runId}`,
          ),
          recordId: correctionA.record_id,
        },
      },
    );
    assert.ifError(restore.error);
    assert.equal(restore.data[0].operation, "restored");
    await expectApiError(
      () =>
        customerA.client.rpc("customer_execute_recommendation_memory_v2", {
          command: {
            commandVersion: "customer-memory-command.v2.2.0",
            kind: "restore-correction",
            authorization: customerAuthorization(
              customerA.id,
              `restore-replay-${runId}`,
            ),
            recordId: correctionA.record_id,
          },
        }),
      /not found/i,
    );
  });

  await test("service role cannot bypass RPC-only table mutation", async () => {
    await expectApiError(
      () =>
        admin
          .from("recommendation_corrections_v2")
          .update({ original_language: "service tamper" })
          .eq("id", serviceCorrection.record_id),
      /permission denied|immutable/i,
    );
  });

  console.log(
    JSON.stringify(
      {
        environment: "isolated Supabase project",
        migration:
          "recommendation-v2-phase-1.sql / customer-memory-record.v2.2.0",
        syntheticDataOnly: true,
        isolatedFromPreviewAndProduction: true,
        secretsPrinted: false,
        total: evidence.length,
        passed: evidence.filter((entry) => entry.status === "pass").length,
        failed: evidence.filter((entry) => entry.status === "fail").length,
        tests: evidence,
      },
      null,
      2,
    ),
  );
} finally {
  for (const userId of createdUserIds) {
    await admin.auth.admin.deleteUser(userId);
  }
}
