import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * The Better Auth session for this request, or null. Cached per request, so
 * the layout, pages and route handlers can all call it without extra queries.
 */
export const getSession = cache(async () => {
  // Read headers first: during `next build` this marks the route dynamic
  // before anything touches the database.
  const requestHeaders = await headers();
  return getAuth().api.getSession({ headers: requestHeaders });
});

/** The signed-in user, or null. */
export async function getCurrentUser() {
  return (await getSession())?.user ?? null;
}

/** The signed-in user. Redirects to /login when there isn't one. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

const DEMO_USER_EMAIL = "demo@example.com";

/**
 * TODO: switch to the session user once the login screens land.
 * Every Plaid route calls this, so swapping it in one place secures them all.
 * Until then, everything belongs to a single demo user.
 */
export async function getCurrentUserId(): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    update: {},
    create: { email: DEMO_USER_EMAIL, name: "Demo user" },
    select: { id: true },
  });
  return user.id;
}
