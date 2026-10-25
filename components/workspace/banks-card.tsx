"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usePlaidLink, type PlaidLinkOnSuccess } from "react-plaid-link";
import { Landmark, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  connectBank,
  createLinkToken,
  syncBanks,
  type BankResult,
} from "@/lib/bank-actions";
import { plural, timeAgo } from "@/lib/guava/format";
import { useActions } from "@/lib/guava/store";
import type { BankDetails } from "@/lib/plaid";
import type { SyncCounts } from "@/lib/plaid-sync";

const FAILED = {
  ok: false,
  error: "Something went wrong. Try again.",
} as const;

function summary({ added, updated, removed }: SyncCounts): string {
  if (!added && !updated && !removed) return "Up to date. No new transactions.";
  return [
    added && `${plural(added, "new expense")} to review`,
    updated && `${updated} updated`,
    removed && `${removed} removed`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Banks linked through Plaid (with the user's own keys): "Connect a bank"
 * opens Plaid Link, "Sync now" pulls new transactions into Expenses.
 */
export function BanksCard({ banks }: { banks: BankDetails[] }) {
  const router = useRouter();
  const { reload } = useActions();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [isBusy, startBusy] = useTransition();

  const finish = useCallback(
    async (result: BankResult<SyncCounts & { institution?: string }>) => {
      if (!result.ok) {
        setMessage({ ok: false, text: result.error });
        return;
      }
      const done = summary(result);
      setMessage({
        ok: true,
        text: result.institution
          ? `Connected ${result.institution}. ${done}`
          : done,
      });
      await reload().catch(() => {});
      router.refresh();
    },
    [reload, router],
  );

  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    (publicToken) => {
      setLinkToken(null);
      startBusy(async () => {
        await finish(await connectBank(publicToken).catch(() => FAILED));
      });
    },
    [finish],
  );
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: () => setLinkToken(null),
  });
  // Open Link as soon as its token arrives.
  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  function connect() {
    setMessage(null);
    startBusy(async () => {
      const result = await createLinkToken().catch(() => FAILED);
      if (result.ok) setLinkToken(result.linkToken);
      else setMessage({ ok: false, text: result.error });
    });
  }

  function sync() {
    setMessage(null);
    startBusy(async () => {
      await finish(await syncBanks().catch(() => FAILED));
    });
  }

  // With several banks, show the stalest one so "Last synced" is never rosy.
  const lastSynced = banks
    .map((b) => b.lastSyncedAt)
    .filter((t): t is string => t != null)
    .sort()
    .at(0);

  return (
    <section
      aria-label="Connected banks"
      className="flex flex-col rounded-xl border bg-card shadow-card"
    >
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <div className="font-semibold">Connected banks</div>
          <div className="mt-px text-xs text-ink-3">
            {banks.length === 0 ? (
              "New transactions arrive as uncategorized expenses to review."
            ) : lastSynced ? (
              <span suppressHydrationWarning>
                Last synced {timeAgo(lastSynced)}
              </span>
            ) : (
              "Not synced yet"
            )}
          </div>
        </div>
        {banks.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 text-foreground"
            disabled={isBusy}
            onClick={sync}
          >
            <RefreshCw
              data-icon="inline-start"
              className={isBusy ? "animate-spin" : undefined}
            />
            Sync now
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          className="h-8 px-3"
          disabled={isBusy}
          onClick={connect}
        >
          {isBusy && !banks.length ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : (
            <Landmark data-icon="inline-start" />
          )}
          Connect a bank
        </Button>
      </div>
      <div className="flex flex-col gap-3 p-4">
        {message && (
          <div
            role={message.ok ? "status" : "alert"}
            className={
              message.ok
                ? "text-xs leading-[1.4] text-success"
                : "rounded-lg bg-danger-soft px-3 py-2.5 text-[13px] leading-[1.4] text-danger"
            }
          >
            {message.text}
          </div>
        )}
        {banks.length === 0 ? (
          <p className="text-[13px] text-ink-3">
            No banks yet. In sandbox, pick any bank and sign in with{" "}
            <code className="font-mono">user_good</code> /{" "}
            <code className="font-mono">pass_good</code>.
          </p>
        ) : (
          <ul className="divide-y divide-muted">
            {banks.map((b) => (
              <li key={b.id} className="py-2.5 first:pt-0 last:pb-0">
                <p className="truncate font-medium">{b.institution}</p>
                <ul className="mt-0.5 text-[13px] text-ink-3">
                  {b.accounts.map((a) => (
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
        )}
      </div>
    </section>
  );
}
