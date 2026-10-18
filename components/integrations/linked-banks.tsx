import { Suspense } from "react";
import { connection } from "next/server";

import { PlaidLinkButton } from "@/components/plaid-link-button";
import { Card } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { getCurrentUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

/** Banks linked through Plaid, with "Add a bank" once Plaid keys pass a test. */
export function LinkedBanksCard({ plaidReady }: { plaidReady: boolean }) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Linked banks</h2>
          <p className="mt-px text-xs text-ink-3">
            Accounts connected through your Plaid keys
          </p>
        </div>
        {/*
          TODO(plaid): PlaidLinkButton still uses the server's PLAID_* keys.
          The Plaid PR switches it (and /api/plaid/*) to the user's saved keys
          and the design's bank connect sheet.
        */}
        {plaidReady ? (
          <PlaidLinkButton />
        ) : (
          <Button size="sm" className="h-8 px-3" disabled>
            Add a bank
          </Button>
        )}
      </div>
      <Suspense
        fallback={<p className="p-4 text-[13px] text-ink-3">Loading…</p>}
      >
        <LinkedBanks plaidReady={plaidReady} />
      </Suspense>
    </Card>
  );
}

async function LinkedBanks({ plaidReady }: { plaidReady: boolean }) {
  // Read from the database at request time, not build time.
  await connection();

  const items = await loadItems();
  if (!items) {
    return (
      <p role="alert" className="p-4 text-[13px] text-danger">
        Couldn’t load linked banks. Check the database connection and
        migrations.
      </p>
    );
  }

  const accounts = items.flatMap((item) =>
    item.bankAccounts.map((a) => ({
      ...a,
      bank: item.institutionName ?? "Bank",
    })),
  );
  if (accounts.length === 0) {
    return (
      <p className="p-4 text-[13px] text-ink-3">
        {plaidReady
          ? "No banks linked yet."
          : "Test your Plaid keys above, then link a bank."}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-muted">
      {accounts.map((a) => (
        <li key={a.id} className="flex justify-between gap-3 px-4 py-3">
          <span className="min-w-0 truncate font-medium">
            {a.bank} · {a.name}
            {a.mask ? ` ••${a.mask}` : ""}
          </span>
          {a.subtype && (
            <span className="flex-none text-[13px] text-ink-3 capitalize">
              {a.subtype}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

// A database failure should only break this card, not the whole page.
async function loadItems() {
  try {
    const userId = await getCurrentUserId();
    return await prisma.plaidItem.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        institutionName: true,
        bankAccounts: {
          select: { id: true, name: true, mask: true, subtype: true },
        },
      },
    });
  } catch (error) {
    console.error("Failed to load linked banks", error);
    return null;
  }
}
