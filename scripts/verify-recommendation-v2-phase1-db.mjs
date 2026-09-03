import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const sql = await readFile(
  new URL("../supabase/recommendation-v2-phase-1.sql", import.meta.url),
  "utf8",
);
const db = new PGlite();
const A = "00000000-0000-4000-8000-000000000001";
const B = "00000000-0000-4000-8000-000000000002";
const IA = "10000000-0000-4000-8000-000000000001";
const IB = "10000000-0000-4000-8000-000000000002";
const EA = "20000000-0000-4000-8000-000000000001";
const EB = "20000000-0000-4000-8000-000000000002";
const evidence = [];

async function test(name, run) {
  try {
    await run();
    evidence.push({ name, status: "pass" });
  } catch (error) {
    evidence.push({ name, status: "fail" });
    throw error;
  }
}
async function rejects(run, pattern) {
  await assert.rejects(run, pattern);
}
async function as(role, user, statement, params = []) {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${role}`);
    await tx.query(
      "select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role',$2,true)",
      [user ?? "", role],
    );
    return tx.query(statement, params);
  });
}
const auth = (user, key) => ({
  actor: { kind: "customer", actorUserId: user },
  targetUserId: user,
  idempotencyKey: key,
});
const serviceAuth = (user, key, actor = {}) => ({
  actor: {
    kind: "authorized-customer-service",
    actorId: "synthetic-support",
    authorizationId: "synthetic-authorization",
    targetUserId: user,
    reason: "Isolated synthetic verification",
    confirmationChannel: "support-session",
    ...actor,
  },
  targetUserId: user,
  idempotencyKey: key,
});
const today = (user, extra = {}) => ({
  kind: "today-only",
  localDate: "2026-07-29",
  timezone: "America/New_York",
  timezoneBehavior: "fixed-at-creation",
  ownerUserId: user,
  ...extra,
});
const similar = (user, extra = {}) => ({
  kind: "similar-contexts",
  matcher: {
    matcherVersion: "similar-context-matcher.v2.2.0",
    occasion: "school volunteering",
    dayCharacter: "active community day",
    socialStakes: "representative but informal",
  },
  confirmation: {
    status: "confirmed",
    plainLanguageDescription:
      "School-volunteering days with walking and informal representative duties.",
    confirmedByUserId: user,
    confirmedAt: "2026-07-29T16:00:00Z",
    matcherVersionPresented: "similar-context-matcher.v2.2.0",
  },
  ...extra,
});
const correction = (user, key, extra = {}) => ({
  commandVersion: "customer-memory-command.v2.2.0",
  kind: "create-correction",
  authorization: auth(user, key),
  originalLanguage: "Keep this polished but comfortable.",
  scope: today(user),
  directive: {
    kind: "comfort",
    requirement: "comfortable walking shoes",
    polarity: "require",
  },
  ...extra,
});
const suppression = (user, item, key, extra = {}) => ({
  commandVersion: "customer-memory-command.v2.2.0",
  kind: "create-suppression",
  authorization: auth(user, key),
  originalLanguage: "Take this item out of rotation.",
  scope: { kind: "until-restored" },
  itemId: item,
  ...extra,
});
async function customer(command, signedInAs = command.authorization.targetUserId) {
  const result = await as(
    "authenticated",
    signedInAs,
    "select * from public.customer_execute_recommendation_memory_v2($1::jsonb)",
    [JSON.stringify(command)],
  );
  return result.rows[0];
}
async function service(command) {
  const result = await as(
    "service_role",
    command.authorization.targetUserId,
    "select * from public.service_execute_recommendation_memory_v2($1::jsonb)",
    [JSON.stringify(command)],
  );
  return result.rows[0];
}
async function revision(user) {
  return (
    await db.query(
      "select correction_revision,suppression_revision from public.recommendation_customer_revisions_v2 where user_id=$1",
      [user],
    )
  ).rows[0];
}

try {
  await test("isolated Supabase-compatible bootstrap", () =>
    db.exec(`
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create role anon nologin;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.role() returns text language sql stable as
        $$select nullif(current_setting('request.jwt.claim.role',true),'')$$;
      create table public.clothing_items(
        id uuid primary key,user_id uuid not null references auth.users(id));
      create table public.daily_events(
        id uuid primary key,user_id uuid not null references auth.users(id));
      insert into auth.users values('${A}'),('${B}');
      insert into public.clothing_items values('${IA}','${A}'),('${IB}','${B}');
      insert into public.daily_events values('${EA}','${A}'),('${EB}','${B}');
    `),
  );
  await test("clean migration", () => db.exec(sql));
  await test("idempotent migration reapplication", () => db.exec(sql));
  await test("schema objects and RLS policies exist", async () => {
    const objects = await db.query(`
      select
       (select count(*)::int from pg_class where relname like 'recommendation_%_v2') relations,
       (select count(*)::int from pg_proc where proname in
        ('customer_execute_recommendation_memory_v2',
         'service_execute_recommendation_memory_v2',
         'validate_recommendation_scope_v2',
         'enforce_immutable_recommendation_memory_v2',
         'bump_recommendation_memory_revision_v2')) functions,
       (select count(*)::int from pg_policy where polrelid in
        ('public.recommendation_customer_revisions_v2'::regclass,
         'public.recommendation_customer_service_audit_v2'::regclass,
         'public.recommendation_corrections_v2'::regclass,
         'public.recommendation_suppressions_v2'::regclass)) policies`);
    assert.ok(objects.rows[0].relations >= 4);
    assert.equal(objects.rows[0].functions, 5);
    assert.equal(objects.rows[0].policies, 4);
  });

  let ca;
  let sa;
  await test("owned correction and suppression RPCs", async () => {
    ca = await customer(correction(A, "a-correction-1"));
    sa = await customer(suppression(A, IA, "a-suppression-1"));
    assert.equal(ca.owner_user_id, A);
    assert.equal(sa.owner_user_id, A);
    await rejects(
      () => customer(suppression(A, IB, "cross-item")),
      /does not belong/,
    );
  });
  await test("two-customer RLS and targeting isolation", async () => {
    await customer(correction(B, "b-correction-1"));
    for (const [table, column] of [
      ["recommendation_corrections_v2", "user_id"],
      ["recommendation_suppressions_v2", "user_id"],
      ["recommendation_customer_revisions_v2", "user_id"],
      ["recommendation_customer_service_audit_v2", "target_user_id"],
    ]) {
      const rows = await as(
        "authenticated",
        A,
        `select ${column} from public.${table}`,
      );
      assert.ok(rows.rows.every((row) => row[column] === A));
    }
    await rejects(
      () => customer(correction(B, "cross-target"), A),
      /mismatch/,
    );
  });
  await test("authenticated direct writes and audit tampering denied", async () => {
    for (const statement of [
      `update public.recommendation_corrections_v2 set original_language='x' where id='${ca.record_id}'`,
      `delete from public.recommendation_corrections_v2 where id='${ca.record_id}'`,
      `insert into public.recommendation_customer_service_audit_v2
       (target_user_id,actor_id,authorization_id,reason,confirmation_channel,action,record_kind,record_id,idempotency_key)
       values('${A}','x','x','x','in-app','create-correction','correction',gen_random_uuid(),'x')`,
    ]) {
      await rejects(() => as("authenticated", A, statement), /permission denied/);
    }
  });
  await test("similar-context confirmation fails closed with today fallback", async () => {
    const base = similar(A);
    const invalid = [
      similar(A, { confirmation: { ...base.confirmation, status: "pending" } }),
      similar(A, {
        confirmation: {
          ...base.confirmation,
          plainLanguageDescription: "similar occasions",
        },
      }),
      similar(A, {
        confirmation: { ...base.confirmation, confirmedByUserId: B },
      }),
      similar(A, {
        confirmation: {
          ...base.confirmation,
          matcherVersionPresented: "similar-context-matcher.v2.1.0",
        },
      }),
      similar(A, {
        matcher: {
          matcherVersion: "similar-context-matcher.v2.2.0",
          occasion: "school volunteering",
        },
      }),
    ];
    for (let i = 0; i < invalid.length; i += 1) {
      await rejects(
        () => customer(correction(A, `bad-similar-${i}`, { scope: invalid[i] })),
        /similar-context|matcher|confirmation|specific/,
      );
    }
    assert.equal(
      (await customer(correction(A, "today-fallback"))).scope.kind,
      "today-only",
    );
    assert.deepEqual(
      (await customer(correction(A, "confirmed-similar", { scope: base }))).scope,
      base,
    );
  });

  let serviceRecord;
  await test("service audit and mutation commit atomically", async () => {
    serviceRecord = await service(
      correction(A, "service-create", {
        authorization: serviceAuth(A, "service-create"),
      }),
    );
    const linked = await db.query(
      `select c.service_audit_id,a.record_id,a.target_user_id
       from public.recommendation_corrections_v2 c
       join public.recommendation_customer_service_audit_v2 a
         on a.id=c.service_audit_id where c.id=$1`,
      [serviceRecord.record_id],
    );
    assert.equal(linked.rows[0].service_audit_id, serviceRecord.audit_record_id);
    assert.equal(linked.rows[0].record_id, serviceRecord.record_id);
    assert.equal(linked.rows[0].target_user_id, A);
  });
  await test("audit failure rolls back mutation and revision", async () => {
    const before = await revision(A);
    const count = await db.query(
      "select count(*)::int n from public.recommendation_corrections_v2",
    );
    await rejects(
      () =>
        service(
          correction(A, "bad-audit", {
            authorization: serviceAuth(A, "bad-audit", {
              confirmationChannel: "invalid",
            }),
          }),
        ),
      /check constraint/,
    );
    assert.deepEqual(await revision(A), before);
    assert.deepEqual(
      (
        await db.query(
          "select count(*)::int n from public.recommendation_corrections_v2",
        )
      ).rows,
      count.rows,
    );
  });
  await test("mutation failure rolls back service audit", async () => {
    const before = await db.query(
      "select count(*)::int n from public.recommendation_customer_service_audit_v2",
    );
    await rejects(
      () =>
        service(
          correction(A, "bad-mutation", {
            authorization: serviceAuth(A, "bad-mutation"),
            directive: { kind: "connected-external-service" },
          }),
        ),
      /unsupported correction directive/,
    );
    assert.deepEqual(
      (
        await db.query(
          "select count(*)::int n from public.recommendation_customer_service_audit_v2",
        )
      ).rows,
      before.rows,
    );
  });
  await test("external and authenticated actors cannot use service RPC", async () => {
    const command = correction(A, "no-service", {
      authorization: serviceAuth(A, "no-service"),
    });
    await rejects(
      () =>
        as(
          "authenticated",
          A,
          "select * from public.service_execute_recommendation_memory_v2($1::jsonb)",
          [JSON.stringify(command)],
        ),
      /permission denied/,
    );
  });
  await test("immutable history, supersession, and cross-owner protection", async () => {
    await rejects(
      () =>
        db.query(
          "update public.recommendation_corrections_v2 set original_language='x' where id=$1",
          [ca.record_id],
        ),
      /immutable/,
    );
    const replacement = await customer(
      correction(A, "a-correction-2", {
        originalLanguage: "Relaxed and polished.",
        directive: {
          kind: "formality",
          floor: "casual",
          ceiling: "polished-casual",
        },
        supersedesRecordId: ca.record_id,
      }),
    );
    const history = await db.query(
      "select status,original_language from public.recommendation_corrections_v2 where id=$1",
      [ca.record_id],
    );
    assert.equal(history.rows[0].status, "superseded");
    assert.equal(
      history.rows[0].original_language,
      "Keep this polished but comfortable.",
    );
    const b = await db.query(
      "select id from public.recommendation_corrections_v2 where user_id=$1 limit 1",
      [B],
    );
    await rejects(
      () =>
        customer(
          correction(A, "cross-supersede", {
            supersedesRecordId: b.rows[0].id,
          }),
        ),
      /not found/,
    );
    assert.ok(replacement.record_id);
  });
  await test("restoration lifecycle, replay safety, and service ownership", async () => {
    const restore = {
      commandVersion: "customer-memory-command.v2.2.0",
      kind: "restore-suppression",
      authorization: auth(A, "restore-a"),
      recordId: sa.record_id,
    };
    assert.equal((await customer(restore)).operation, "restored");
    await rejects(() => customer(restore), /not found/);
    await rejects(
      () =>
        service({
          commandVersion: "customer-memory-command.v2.2.0",
          kind: "restore-correction",
          authorization: serviceAuth(B, "cross-restore"),
          recordId: serviceRecord.record_id,
        }),
      /not found/,
    );
  });
  await test("idempotency replay preserves record and revision counts", async () => {
    const command = correction(A, "replay-key");
    await customer(command);
    const before = await revision(A);
    const count = await db.query(
      "select count(*)::int n from public.recommendation_corrections_v2 where user_id=$1 and idempotency_key='replay-key'",
      [A],
    );
    await rejects(() => customer(command), /unique constraint/);
    assert.deepEqual(await revision(A), before);
    assert.equal(count.rows[0].n, 1);
  });
  await test("revision and V2 cache identity are owner/kind scoped", async () => {
    const beforeA = await revision(A);
    const beforeB = await revision(B);
    await customer(correction(A, "cache-change"));
    const afterA = await revision(A);
    const afterB = await revision(B);
    assert.equal(afterA.correction_revision, beforeA.correction_revision + 1);
    assert.equal(afterA.suppression_revision, beforeA.suppression_revision);
    assert.deepEqual(afterB, beforeB);
  });
  await test("civil date, timezone, fixed day, and event ownership", async () => {
    for (const [i, scope] of [
      today(A, { localDate: "2026-02-30" }),
      today(A, { timezone: "US/Eastern" }),
      today(A, { dailyEventId: EB }),
    ].entries()) {
      await rejects(
        () => customer(correction(A, `invalid-time-${i}`, { scope })),
        /date|timezone|belong/,
      );
    }
    const fixed = today(A, { dailyEventId: EA });
    const stored = await customer(
      correction(A, "fixed-timezone", { scope: fixed }),
    );
    assert.equal(stored.scope.localDate, "2026-07-29");
    assert.equal(stored.scope.timezone, "America/New_York");
  });

  console.log(
    JSON.stringify(
      {
        environment: "PGlite 0.4.1 disposable in-memory PostgreSQL",
        migration:
          "recommendation-v2-phase-1.sql / customer-memory-record.v2.2.0",
        syntheticDataOnly: true,
        credentialsUsed: false,
        isolatedFromPreviewAndProduction: true,
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
  await db.close();
}
