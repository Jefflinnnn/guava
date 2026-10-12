import { Suspense } from "react";
import { connection } from "next/server";

import { PlaidLinkButton } from "@/components/plaid-link-button";
import { getCurrentUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16">
      <section className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-lg font-semibold">
              Connected banks
            </h1>
            <p className="text-muted-foreground text-sm">
              Linked through Plaid, stored in Neon with Prisma.
            </p>
          </div>
          <PlaidLinkButton />
        </div>
        <div className="mt-6">
          <Suspense
            fallback={<p className="text-muted-foreground text-sm">Loading…</p>}
          >
            <ConnectedBanks />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function ConnectedBanks() {
  // Read from the database at request time, not build time.
  await connection();

  const userId = await getCurrentUserId();
  const items = await prisma.plaidItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      institutionName: true,
      accounts: { select: { id: true, name: true, mask: true, subtype: true } },
    },
  });

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No banks connected yet. In sandbox, sign in with{" "}
        <code className="font-mono">user_good</code> /{" "}
        <code className="font-mono">pass_good</code>.
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {items.map((item) => (
        <li key={item.id} className="py-3">
          <p className="font-medium">{item.institutionName ?? "Bank"}</p>
          <ul className="text-muted-foreground mt-1 text-sm">
            {item.accounts.map((a) => (
              <li key={a.id}>
                {a.name}
                {a.mask ? ` ••${a.mask}` : ""}
                {a.subtype ? ` · ${a.subtype}` : ""}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
