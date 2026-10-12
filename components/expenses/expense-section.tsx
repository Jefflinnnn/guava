import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** 40px muted band that opens a table section ("NEEDS REVIEW 6"). */
export function SectionHeader({
  marker,
  title,
  count,
  action,
}: {
  /** A dot or small icon before the title. */
  marker: React.ReactNode;
  title: string;
  count: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex h-10 items-center gap-2 border-b bg-muted px-4 text-xs font-semibold tracking-[0.02em] text-ink-2 uppercase">
      {marker}
      <h2>{title}</h2>
      <span className="font-mono font-medium text-ink-3">{count}</span>
      {action && <div className="ml-auto normal-case">{action}</div>}
    </div>
  );
}

/** The pink "needs review" dot. */
export function ReviewDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("size-2 flex-none rounded-full bg-pink", className)}
    />
  );
}

/** A small outline button for a section header ("Mark all reviewed"). */
export function SectionAction(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="outline"
      size="xs"
      className="h-[26px] px-2.5 tracking-normal shadow-none"
      {...props}
    />
  );
}

/** Centered muted line used for a section's empty state. */
export function SectionMessage({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-18 items-center justify-center gap-2 border-b text-[13px] text-ink-3 [&_svg]:size-4">
      {icon}
      {children}
    </div>
  );
}

/** Footer row under a paged section: a status line and an optional action. */
export function SectionFooter({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex h-13 items-center justify-between px-4 text-[13px] text-ink-3">
      <span>{children}</span>
      {action}
    </div>
  );
}
