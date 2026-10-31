import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";

/** Thrown by `getCurrentUserId` when the request has no valid session. */
export class UnauthorizedError extends Error {
  constructor() {
    super("Not signed in");
    this.name = "UnauthorizedError";
  }
}

/**
 * The Better Auth session for this request, or null. Cached per request, so
 * the layout, pages and route handlers can all call it without extra queries.
 */
const getSession = cache(async () => {
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

/**
 * The signed-in user's id. Throws `UnauthorizedError` when there's no session.
 * For server actions, which turn the error into a result instead of
 * redirecting.
 */
export async function getCurrentUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user.id;
}
