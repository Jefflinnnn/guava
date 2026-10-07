import { connection } from "next/server";

import { prisma } from "@/lib/prisma";

// GET /api/health — confirms the app can reach Neon.
export async function GET() {
  // Run on every request; never prerender a health check at build time.
  await connection();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, database: "connected" });
  } catch (error) {
    console.error("health check failed", error);
    return Response.json(
      { ok: false, database: "unreachable" },
      { status: 503 }
    );
  }
}
