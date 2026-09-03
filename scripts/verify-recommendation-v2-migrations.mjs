import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const sql = postgres(connectionString, {
  max: 1,
  prepare: false,
  connect_timeout: 15,
  idle_timeout: 5,
});

try {
  const [result] = await sql`
    select
      to_regclass('public.customer_corrections_v2') is not null as corrections,
      to_regclass('public.recommendation_suppressions_v2') is not null as suppressions,
      to_regclass('public.recommendation_runs_v2') is not null as runs,
      to_regclass('public.recommendation_cache_v2') is not null as cache
  `;

  console.log(JSON.stringify(result));
} finally {
  await sql.end({ timeout: 5 });
}
