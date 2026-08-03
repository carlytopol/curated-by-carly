import fs from "node:fs/promises";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const files = [
  "supabase/recommendation-v2-phase-1.sql",
  "supabase/recommendation-v2-artifacts.sql",
  "supabase/recommendation-v2-option-items-read-grant.sql",
];

const sql = postgres(connectionString, {
  max: 1,
  prepare: false,
  connect_timeout: 15,
  idle_timeout: 5,
});

try {
  for (const file of files) {
    const source = await fs.readFile(new URL(`../${file}`, import.meta.url), "utf8");
    await sql.unsafe(source);
    console.log(`Applied ${file}`);
  }

  const [verification] = await sql`
    select
      to_regclass('public.customer_corrections_v2') is not null as corrections,
      to_regclass('public.recommendation_suppressions_v2') is not null as suppressions,
      to_regclass('public.recommendation_runs_v2') is not null as runs,
      to_regclass('public.recommendation_cache_v2') is not null as cache
  `;

  if (!Object.values(verification).every(Boolean)) {
    throw new Error("V2 migration verification failed.");
  }

  console.log("Verified recommendation V2 schema.");
} finally {
  await sql.end({ timeout: 5 });
}
