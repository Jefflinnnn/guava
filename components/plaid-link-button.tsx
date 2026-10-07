"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usePlaidLink, type PlaidLinkOnSuccess } from "react-plaid-link";
import { Landmark, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PlaidLinkButton() {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Step 1: get a link_token from our server.
  useEffect(() => {
    fetch("/api/plaid/create-link-token", { method: "POST" })
      .then((res) => res.json())
      .then((data: { linkToken?: string; error?: string }) => {
        if (data.linkToken) setLinkToken(data.linkToken);
        else setError(data.error ?? "Could not start Plaid Link");
      })
      .catch(() => setError("Could not start Plaid Link"));
  }, []);

  // Step 3: send the public_token to our server to exchange.
  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    (publicToken) => {
      setError(null);
      startTransition(async () => {
        const res = await fetch("/api/plaid/exchange-public-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicToken }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          setError(data.error ?? "Could not link account");
          return;
        }
        router.refresh();
      });
    },
    [router]
  );

  // Step 2: the user picks their bank in Plaid's modal.
  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess });

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={() => open()} disabled={!ready || isPending}>
        {isPending ? (
          <Loader2 data-icon="inline-start" className="animate-spin" />
        ) : (
          <Landmark data-icon="inline-start" />
        )}
        {isPending ? "Connecting…" : "Connect a bank"}
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
