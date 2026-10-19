import { cn } from "@/lib/utils";

/** A filled bar showing `value` as a fraction of `max` (empty when `max` is 0). */
export function ProgressBar({
  value,
  max,
  color,
  height = 6,
  className,
}: {
  value: number;
  max: number;
  color: string;
  height?: 4 | 6;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-muted",
        height === 4 ? "h-1" : "h-1.5",
        className,
      )}
    >
      <div
        className="h-full rounded-full transition-[width]"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}
