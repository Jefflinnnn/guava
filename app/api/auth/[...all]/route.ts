import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth";

// Better Auth's endpoints: /api/auth/sign-in/social, /api/auth/callback/google, ...
export const { GET, POST } = toNextJsHandler((request) =>
  getAuth().handler(request),
);
