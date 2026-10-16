import { Suspense } from "react";
import { connection } from "next/server";

import { PlaidLinkButton } from "@/components/plaid-link-button";
import { Card } from "@/components/shell/page";
import { getCurrentUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

/** Plaid-linked banks for the current user, with the "Connect a bank" flow. */
export function ConnectedBanksCard() {
  return (
    <Card className="px-5 py-4">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold">Connected banks</h2>
            <p className="mt-0.5 text-[13px] text-ink-3">
              Linked through Plaid, stored in Neon with Prisma.
            </p>
          </div>
          <PlaidLinkButton />
        </div>
        <Suspense fallback={<p className="text-[13px] text-ink-3">Loading…</p>}>
          <ConnectedBanks />
        </Suspense>
      </section>
    </Card>
  );
}

async function ConnectedBanks() {
  // Read from the database at request time, not build time.
  await connection();

  const items = await loadItems();
  if (!items) {
    return (
      <p role="alert" className="text-[13px] text-danger">
        Couldn’t load connected banks. Check the database connection and
        migrations.
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-[13px] text-ink-3">
        No banks connected yet. In sandbox, sign in with{" "}
        <code className="font-mono">user_good</code> /{" "}
        <code className="font-mono">pass_good</code>.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-muted border-t border-muted">
      {items.map((item) => (
        <li key={item.id} className="py-3 last:pb-0">
          <p className="truncate font-medium">
            {item.institutionName ?? "Bank"}
          </p>
          <ul className="mt-0.5 text-[13px] text-ink-3">
            {item.accounts.map((a) => (
              <li key={a.id} className="truncate">
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

// A database failure should only break this card, not the whole Settings page.
async function loadItems() {
  try {
    const userId = await getCurrentUserId();
    return await prisma.plaidItem.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        institutionName: true,
        accounts: {
          select: { id: true, name: true, mask: true, subtype: true },
        },
      },
    });
  } catch (error) {
    console.error("Failed to load connected banks", error);
    return null;
  }
}
