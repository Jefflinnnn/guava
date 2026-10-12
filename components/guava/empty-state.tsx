import { cn } from "@/lib/utils";

/** Dashed placeholder box with an icon, a message and an optional action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border-[1.5px] border-dashed border-border-strong px-6 py-12 text-center",
        className
      )}
    >
      {icon && (
        <span className="flex size-10 items-center justify-center rounded-full bg-muted text-ink-3 [&_svg]:size-5">{icon}</span>
      )}
      <div>
        <div className="font-medium">{title}</div>
        {description && <div className="mt-1 text-[13px] text-ink-3">{description}</div>}
      </div>
      {action}
    </div>
  );
}
