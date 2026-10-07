import "dotenv/config";
import { defineConfig } from "prisma/config";

// Used by the Prisma CLI (migrate, studio, db pull).
// Migrations need Neon's DIRECT (non-pooled) connection string.
// The running app uses the pooled DATABASE_URL instead (see lib/prisma.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Read optionally so `prisma generate` (postinstall) works without it.
    url: process.env.DIRECT_URL,
  },
});
