import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth";

// Better Auth's endpoints: /api/auth/sign-in/email, /api/auth/sign-up/email, /api/auth/get-session, ...
export const { GET, POST } = toNextJsHandler((request) =>
  getAuth().handler(request),
);
