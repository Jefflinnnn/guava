import "server-only";

import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

import { PrismaClient } from "@/generated/prisma/client";

// Neon's driver talks to Postgres over WebSockets.
neonConfig.webSocketConstructor = ws;

// Reuse one client across hot reloads in dev so we don't exhaust connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
  }
  const client = new PrismaClient({
    adapter: new PrismaNeon({ connectionString }),
  });
  // Cached in production too: one client per server instance.
  globalForPrisma.prisma = client;
  return client;
}

// Created on first use rather than at import, so `next build` works in
// environments (CI, preview deploys) where DATABASE_URL isn't set.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
