import "server-only";

import { DEMO_USER } from "@/lib/demo-user";
import { defaultCategoriesCreate } from "@/lib/guava/default-categories";
import { prisma } from "@/lib/prisma";

/**
 * TODO: replace with your auth provider (Auth.js, Clerk, Better Auth, ...).
 * Every Plaid route and server action calls this, so swapping it in one
 * place secures them all. Until then, everything belongs to a single demo
 * user. A new user starts with the default categories.
 */
export async function getCurrentUserId(): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: {},
    create: {
      email: DEMO_USER.email,
      name: DEMO_USER.name,
      categories: { create: defaultCategoriesCreate() },
      settings: { create: {} },
    },
    select: { id: true },
  });
  return user.id;
}
