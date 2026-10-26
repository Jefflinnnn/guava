"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usePlaidLink, type PlaidLinkOnSuccess } from "react-plaid-link";
import { Landmark, Loader2, RefreshCw } from "lucide-react";

import { ConfirmDeleteDialog } from "@/components/guava/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import {
  connectBank,
  createLinkToken,
  disconnectBank,
  reconnectBank,
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

/** What a sync, connect or reconnect returns on success. */
type SyncResult = SyncCounts & {
  institution?: string;
  /** Banks skipped because they need the user to sign in again. */
  loginRequired?: string[];
};

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
 * opens Plaid Link, "Sync now" pulls new transactions into Expenses, and each
 * bank can be reconnected (when it asks for sign-in again) or disconnected.
 */
export function BanksCard({ banks }: { banks: BankDetails[] }) {
  const router = useRouter();
  const { reload } = useActions();
  // The open Link session: a new connection, or update mode for a saved bank.
  const [link, setLink] = useState<{
    token: string;
    reconnectId: string | null;
  } | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [disconnecting, setDisconnecting] = useState<BankDetails | null>(null);
  const [isBusy, startBusy] = useTransition();

  const refresh = useCallback(async () => {
    await reload().catch(() => {});
    router.refresh();
  }, [reload, router]);

  const finish = useCallback(
    async (result: BankResult<SyncResult>, verb = "Connected") => {
      if (!result.ok) {
        setMessage({ ok: false, text: result.error });
        return;
      }
      const relogin = result.loginRequired?.length
        ? `${result.loginRequired.join(", ")} needs you to sign in again: use Reconnect below.`
        : "";
      const changed = result.added || result.updated || result.removed;
      // "Up to date" would be wrong when banks were skipped.
      const done = changed || !relogin ? summary(result) : "";
      setMessage({
        ok: !relogin,
        text: [
          result.institution && `${verb} ${result.institution}.`,
          done,
          relogin,
        ]
          .filter(Boolean)
          .join(" "),
      });
      await refresh();
    },
    [refresh],
  );

  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    (publicToken) => {
      const reconnectId = link?.reconnectId ?? null;
      setLink(null);
      startBusy(async () => {
        await finish(
          reconnectId
            ? await reconnectBank(reconnectId).catch(() => FAILED)
            : await connectBank(publicToken).catch(() => FAILED),
          reconnectId ? "Reconnected" : "Connected",
        );
      });
    },
    [finish, link],
  );
  const { open, ready } = usePlaidLink({
    token: link?.token ?? null,
    onSuccess,
    onExit: () => setLink(null),
  });
  // Open Link as soon as its token arrives.
  useEffect(() => {
    if (link && ready) open();
  }, [link, ready, open]);

  /** Opens Link: a new bank, or `reconnectId`'s bank in update mode. */
  function openLink(reconnectId: string | null) {
    setMessage(null);
    startBusy(async () => {
      const result = await (
        reconnectId ? createLinkToken(reconnectId) : createLinkToken()
      ).catch(() => FAILED);
      if (result.ok) setLink({ token: result.linkToken, reconnectId });
      else setMessage({ ok: false, text: result.error });
    });
  }

  function disconnect(bank: BankDetails) {
    setDisconnecting(null);
    setMessage(null);
    startBusy(async () => {
      const result = await disconnectBank(bank.id).catch(() => FAILED);
      if (!result.ok) {
        setMessage({ ok: false, text: result.error });
        return;
      }
      setMessage({
        ok: true,
        text: `Disconnected ${result.institution}. Its imported expenses are still in Expenses.`,
      });
      await refresh();
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
          onClick={() => openLink(null)}
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
              <li
                key={b.id}
                className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    <span className="truncate">{b.institution}</span>
                    {b.loginRequired && (
                      <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-danger-soft px-2 text-xs font-medium text-danger">
                        Sign-in needed
                      </span>
                    )}
                  </p>
                  <ul className="mt-0.5 text-[13px] text-ink-3">
                    {b.accounts.map((a) => (
                      <li key={a.id} className="truncate">
                        {a.name}
                        {a.mask ? ` ••${a.mask}` : ""}
                        {a.subtype ? ` · ${a.subtype}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
                {b.loginRequired && (
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 px-2.5"
                    disabled={isBusy}
                    onClick={() => openLink(b.id)}
                  >
                    Reconnect
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2.5 text-ink-3"
                  disabled={isBusy}
                  onClick={() => setDisconnecting(b)}
                >
                  Disconnect
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {disconnecting && (
        <ConfirmDeleteDialog
          open
          onOpenChange={(open) => !open && setDisconnecting(null)}
          title={`Disconnect ${disconnecting.institution}?`}
          description={
            <>
              guava stops syncing {disconnecting.institution} and forgets its
              accounts.{" "}
              {disconnecting.expenseCount
                ? `The ${plural(disconnecting.expenseCount, "expense")} already imported stay in Expenses.`
                : "Nothing was imported from it yet."}{" "}
              Connecting it again later imports its history again, as new
              expenses.
            </>
          }
          confirmLabel="Disconnect"
          onConfirm={() => disconnect(disconnecting)}
        />
      )}
    </section>
  );
}
