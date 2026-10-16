"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSyncError } from "@/lib/guava/store";

/** Tells the user a change didn't save. */
export function SyncErrorBanner() {
  const [error, dismiss] = useSyncError();
  if (!error) return null;
  return (
    <div
      role="alert"
      className="flex items-center gap-3 border-b bg-pink-soft px-6 py-2 text-[13px] text-pink-ink"
    >
      <span className="flex-1">
        A change didn’t save. guava is reloading your data from the server — try
        again in a moment.
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Dismiss"
        onClick={dismiss}
      >
        <X />
      </Button>
    </div>
  );
}
