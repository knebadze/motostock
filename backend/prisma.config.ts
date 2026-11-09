// { quiet: true }: no dotenv promotional "tip" line in the output (see
// src/config/env.ts) — `import "dotenv/config"` can't pass options.
import { config as loadEnv } from "dotenv";
loadEnv({ quiet: true });
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
