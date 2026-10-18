import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/auth-validation";
import { prisma } from "@/lib/prisma";

// Reads BETTER_AUTH_SECRET and BETTER_AUTH_URL from the environment.
function createAuth() {
  return betterAuth({
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    // Better Auth's "account" model is AuthAccount in prisma/schema.prisma,
    // so it doesn't collide with the Plaid bank Account model.
    account: { modelName: "authAccount" },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: PASSWORD_MIN,
      maxPasswordLength: PASSWORD_MAX,
      // TODO: add sendResetPassword once there's an email provider.
    },
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
