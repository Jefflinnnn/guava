"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/** Shown when the app can't load (most often: the database is unreachable). */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-3 bg-background p-6 text-center">
      <h1 className="text-lg font-semibold">Couldn’t load guava</h1>
      <p className="max-w-sm text-[13px] text-ink-3">
        Your data didn’t load. Check the database connection and that migrations
        have run, then try again.
      </p>
      <Button onClick={retry}>Try again</Button>
    </main>
  );
}
