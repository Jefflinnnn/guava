import "server-only";

import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "@/generated/user-prisma/client";
import "@/lib/neon-config";

// One client per workspace database, reused across requests on the same
// server instance. Capped so a busy instance doesn't hold a connection pool
// for every user it has ever served.
const MAX_CLIENTS = 50;

const globalForUserDb = globalThis as unknown as {
  userDbClients?: Map<string, PrismaClient>;
};
const clients = (globalForUserDb.userDbClients ??= new Map());

export type UserDb = PrismaClient;

/** A Prisma client for one user's own database (prisma/user/schema.prisma). */
export function userDbClient(connectionString: string): UserDb {
  const cached = clients.get(connectionString);
  if (cached) {
    // Re-insert so the Map's order tracks recent use.
    clients.delete(connectionString);
    clients.set(connectionString, cached);
    return cached;
  }
  const client = new PrismaClient({
    adapter: new PrismaNeon({ connectionString }),
  });
  clients.set(connectionString, client);
  if (clients.size > MAX_CLIENTS) {
    const [oldestKey, oldest] = clients.entries().next().value!;
    clients.delete(oldestKey);
    void oldest.$disconnect();
  }
  return client;
}
