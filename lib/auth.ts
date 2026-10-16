import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/auth-validation";
import { prisma } from "@/lib/prisma";

/** Google sign-in is optional: it's only wired up when both env vars are set. */
export const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

// Reads BETTER_AUTH_SECRET and BETTER_AUTH_URL from the environment.
function createAuth() {
  return betterAuth({
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: PASSWORD_MIN,
      maxPasswordLength: PASSWORD_MAX,
      // TODO: add sendResetPassword once there's an email provider, then call
      // authClient.requestPasswordReset from the "Forgot password?" link.
    },
    socialProviders: googleEnabled
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          },
        }
      : {},
    // Lets auth.api calls in Server Actions set cookies. Must stay last.
    plugins: [nextCookies()],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

/**
 * The Better Auth instance. Created on first use rather than at import (the
 * Prisma adapter touches the client right away), so `next build` works
 * without DATABASE_URL, like lib/prisma.ts.
 */
export function getAuth() {
  return (instance ??= createAuth());
}
