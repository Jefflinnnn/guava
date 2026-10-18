import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TestStatus = "idle" | "testing" | "ok" | "fail";

const PILL: Record<TestStatus, { label: string; className: string }> = {
  idle: { label: "Not connected", className: "bg-muted text-ink-3" },
  testing: { label: "Testing…", className: "bg-pink-soft text-pink-ink" },
  ok: { label: "Connected", className: "bg-success/12 text-success" },
  fail: { label: "Failed", className: "bg-danger/10 text-danger" },
};

/** A bordered card for one integration: letter mark, name, status pill. */
export function IntegrationCard({
  mark,
  name,
  purpose,
  status,
  children,
}: {
  mark: string;
  name: string;
  purpose: string;
  status: TestStatus;
  children: React.ReactNode;
}) {
  const pill = PILL[status];
  return (
    <section
      aria-label={name}
      className="flex flex-col rounded-xl border bg-card shadow-card"
    >
      <div className="flex items-center gap-3 border-b px-4 py-3.5">
        <span
          aria-hidden
          className="flex size-8 flex-none items-center justify-center rounded-lg bg-foreground text-sm font-bold text-card"
        >
          {mark}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{name}</div>
          <div className="mt-px text-xs text-ink-3">{purpose}</div>
        </div>
        <span
          role="status"
          className={cn(
            "inline-flex h-6 flex-none items-center gap-1.5 rounded-full px-[9px] text-xs font-medium",
            pill.className,
          )}
        >
          <span className="size-1.5 rounded-full bg-current" />
          {pill.label}
        </span>
      </div>
      <div className="flex flex-col gap-3.5 p-4">{children}</div>
    </section>
  );
}

/** Green line after a passing test, or the red box after a failing one. */
export function TestOutcome({
  status,
  detail,
  error,
}: {
  status: TestStatus;
  detail: string;
  error: string;
}) {
  if (status === "ok" && detail) {
    return <div className="text-xs leading-[1.4] text-success">{detail}</div>;
  }
  if (status === "fail" && error) {
    return (
      <div
        role="alert"
        className="rounded-lg bg-danger-soft px-3 py-2.5 text-[13px] leading-[1.4] text-danger"
      >
        {error}
      </div>
    );
  }
  return null;
}

/** Docs link on the left, "Test connection" on the right. */
export function IntegrationCardFooter({
  docsHref,
  docsLabel,
  status,
  tested,
  onTest,
}: {
  docsHref: string;
  docsLabel: string;
  status: TestStatus;
  /** Whether a test has run, so the button reads "Test again". */
  tested: boolean;
  onTest: () => void;
}) {
  const testing = status === "testing";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <a
        href={docsHref}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-ink-3 underline underline-offset-3 hover:text-foreground"
      >
        {docsLabel}
      </a>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 px-3 text-foreground"
        disabled={testing}
        onClick={onTest}
      >
        {testing && (
          <Loader2 data-icon="inline-start" className="animate-spin" />
        )}
        {testing ? "Testing…" : tested ? "Test again" : "Test connection"}
      </Button>
    </div>
  );
}
