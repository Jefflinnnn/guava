import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Pages for signed-out visitors. Everything else needs a session.
const GUEST_ROUTES = ["/login", "/signup"];

/**
 * Optimistic auth redirect: no session cookie, no app. This only checks that
 * the cookie exists, without touching the database; pages and route handlers
 * still verify the session itself (see lib/current-user.ts).
 *
 * Signed-in visitors on /login and /signup are sent to / by those pages after
 * a real session check, not here. A stale cookie would otherwise bounce
 * between / (no valid session → /login) and /login (cookie → /) forever.
 */
export function proxy(request: NextRequest) {
  if (GUEST_ROUTES.includes(request.nextUrl.pathname)) {
    return NextResponse.next();
  }
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Skip API routes (they answer 401 themselves), Next internals and files
  // with an extension (favicon, images).
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
