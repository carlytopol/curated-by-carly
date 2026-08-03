import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const phase1 = await readFile(new URL("../supabase/recommendation-v2-phase-1.sql", import.meta.url), "utf8");
const artifacts = await readFile(new URL("../supabase/recommendation-v2-artifacts.sql", import.meta.url), "utf8");
const optionItemsReadGrant = await readFile(new URL("../supabase/recommendation-v2-option-items-read-grant.sql", import.meta.url), "utf8");
const db = new PGlite();
const A = "00000000-0000-4000-8000-000000000001";
const B = "00000000-0000-4000-8000-000000000002";
const IA = "10000000-0000-4000-8000-000000000001";
const IB = "10000000-0000-4000-8000-000000000002";
const EA = "20000000-0000-4000-8000-000000000001";
const EB = "20000000-0000-4000-8000-000000000002";
const results = [];

async function test(name, run) {
  try { await run(); results.push({ name, status: "pass" }); }
  catch (error) { results.push({ name, status: "fail" }); throw error; }
}
async function as(user, statement, params = []) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)", [user]);
    return tx.query(statement, params);
  });
}
const payload = (user, event, item, key = "run-1") => ({
  userId: user,
  dailyEventId: event,
  requestId: `request-${key}`,
  idempotencyKey: key,
  engineVersion: "recommendation-v2.1.0",
  architectureVersion: "recommendation-architecture.v2",
  briefVersion: "customer-dressing-brief.v2.3.0",
  postureVersion: "dressing-posture.v2.3.0",
  adjudicationVersion: "stylist-adjudication.v2.3.0",
  correctionRevision: 0,
  suppressionRevision: 0,
  outcome: "recommend",
  customerSummary: "A synthetic, privacy-safe recommendation.",
  postureArtifact: { schemaVersion: "dressing-posture.v2.3.0", artifactId: `posture-${key}` },
  adjudicationArtifact: { schemaVersion: "stylist-adjudication.v2.3.0", outcome: "recommend" },
  traceArtifact: { stages: ["posture", "direction", "adjudication"] },
  options: [{
    optionIndex: 0,
    summary: "Synthetic complete look",
    rationale: "Appropriate for the synthetic fixture.",
    candidateArtifact: { schemaVersion: "candidate-look.v2.3.0" },
    items: [{ itemId: item, garmentRole: "top", position: 0 }],
  }],
});

try {
  await db.exec(`
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create role anon nologin;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.role() returns text language sql stable as
      $$select nullif(current_setting('request.jwt.claim.role',true),'')$$;
    create table public.clothing_items(id uuid primary key,user_id uuid not null references auth.users(id));
    create table public.daily_events(id uuid primary key,user_id uuid not null references auth.users(id));
    insert into auth.users values('${A}'),('${B}');
    insert into public.clothing_items values('${IA}','${A}'),('${IB}','${B}');
    insert into public.daily_events values('${EA}','${A}'),('${EB}','${B}');
  `);
  await db.exec(phase1);
  await test("additive artifact migration is idempotent", async () => {
    await db.exec(artifacts);
    await db.exec(artifacts);
  });
  let runA;
  await test("owner can atomically persist an idempotent run", async () => {
    const first = await as(A, "select public.persist_recommendation_run_v2($1::jsonb) id", [JSON.stringify(payload(A, EA, IA))]);
    const second = await as(A, "select public.persist_recommendation_run_v2($1::jsonb) id", [JSON.stringify(payload(A, EA, IA))]);
    runA = first.rows[0].id;
    assert.equal(second.rows[0].id, runA);
    assert.equal((await db.query("select count(*)::int n from public.recommendation_options_v2 where run_id=$1", [runA])).rows[0].n, 1);
  });
  await test("cross-customer event and wardrobe references fail atomically", async () => {
    await assert.rejects(() => as(A, "select public.persist_recommendation_run_v2($1::jsonb)", [JSON.stringify(payload(A, EB, IA, "bad-event"))]), /event does not belong/);
    await assert.rejects(() => as(A, "select public.persist_recommendation_run_v2($1::jsonb)", [JSON.stringify(payload(A, EA, IB, "bad-item"))]), /item does not belong/);
    assert.equal((await db.query("select count(*)::int n from public.recommendation_runs_v2 where idempotency_key like 'bad-%'")).rows[0].n, 0);
  });
  await test("authenticated direct writes are denied", async () => {
    await assert.rejects(() => as(A, `delete from public.recommendation_runs_v2 where id='${runA}'`), /permission denied/);
    await assert.rejects(() => as(A, `update public.recommendation_options_v2 set summary='tampered' where run_id='${runA}'`), /permission denied/);
  });
  await test("RLS hides another customer's artifacts", async () => {
    await as(B, "select public.persist_recommendation_run_v2($1::jsonb)", [JSON.stringify(payload(B, EB, IB, "run-b"))]);
    const visible = await as(A, "select user_id from public.recommendation_runs_v2");
    assert.deepEqual(new Set(visible.rows.map((row) => row.user_id)), new Set([A]));
  });
  await test("repair grants owner-scoped option-item reads only", async () => {
    await db.exec("revoke select on public.recommendation_option_items_v2 from authenticated");
    await assert.rejects(
      () => as(A, "select item_id from public.recommendation_option_items_v2"),
      /permission denied/,
    );
    await db.exec(optionItemsReadGrant);
    await db.exec(optionItemsReadGrant);
    const ownerItems = await as(A, "select user_id,item_id from public.recommendation_option_items_v2");
    const otherCustomerItems = await as(B, "select user_id,item_id from public.recommendation_option_items_v2 where user_id=$1", [A]);
    assert.deepEqual(ownerItems.rows, [{ user_id: A, item_id: IA }]);
    assert.deepEqual(otherCustomerItems.rows, []);
    await assert.rejects(
      () => as(A, "update public.recommendation_option_items_v2 set garment_role='tampered' where user_id=$1", [A]),
      /permission denied/,
    );
    const serviceRpcExecute = await db.query(`
      select has_function_privilege('service_role', 'public.persist_recommendation_run_v2(jsonb)', 'execute') allowed
    `);
    assert.equal(serviceRpcExecute.rows[0].allowed, false);
  });
  await test("cache is account and contract revision isolated", async () => {
    const cache = {
      partitionKey: `account:${A}:architecture:recommendation-architecture.v2:correction:0:suppression:0`,
      userId: A, runId: runA,
      engineVersion: "recommendation-v2.1.0", architectureVersion: "recommendation-architecture.v2",
      briefVersion: "customer-dressing-brief.v2.3.0", postureVersion: "dressing-posture.v2.3.0",
      adjudicationVersion: "stylist-adjudication.v2.3.0", correctionRevision: 0, suppressionRevision: 0,
      expiresAt: "2027-01-01T00:00:00Z",
    };
    await as(A, "select public.put_recommendation_cache_v2($1::jsonb)", [JSON.stringify(cache)]);
    await assert.rejects(() => as(B, "select public.put_recommendation_cache_v2($1::jsonb)", [JSON.stringify({ ...cache, userId: B })]), /run does not belong/);
    assert.equal((await as(A, "select count(*)::int n from public.recommendation_cache_v2")).rows[0].n, 1);
  });
  console.log(JSON.stringify({ environment: "PGlite disposable synthetic database", syntheticDataOnly: true, credentialsUsed: false, total: results.length, passed: results.filter((x) => x.status === "pass").length, failed: results.filter((x) => x.status === "fail").length, tests: results }, null, 2));
} finally {
  await db.close();
}
