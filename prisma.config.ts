import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // `prisma generate` does not connect to the database, so production builds
    // can use this inert fallback. Local migration commands should still set
    // DATABASE_URL to the real private connection string.
    url: process.env.DATABASE_URL || "postgresql://localhost:5432/curated_by_carly",
  },
});
