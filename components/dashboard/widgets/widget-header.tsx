import { cn } from "@/lib/utils";

/** Title + muted subtitle on the left, an optional aside on the right. */
export function WidgetHeader({
  title,
  subtitle,
  aside,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="text-[15px] font-semibold">{title}</div>
        {subtitle && (
          <div className="mt-0.5 text-[13px] text-ink-3 tabular">
            {subtitle}
          </div>
        )}
      </div>
      {aside}
    </div>
  );
}
