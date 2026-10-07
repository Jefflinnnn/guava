import "server-only";

import { prisma } from "@/lib/prisma";

const DEMO_USER_EMAIL = "demo@example.com";

/**
 * TODO: replace with your auth provider (Auth.js, Clerk, Better Auth, ...).
 * Every Plaid route calls this, so swapping it in one place secures them all.
 * Until then, everything belongs to a single demo user.
 */
export async function getCurrentUserId(): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    update: {},
    create: { email: DEMO_USER_EMAIL },
    select: { id: true },
  });
  return user.id;
}
