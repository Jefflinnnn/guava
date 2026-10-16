import { cn } from "@/lib/utils";

/**
 * Spend-vs-budget bar. Turns red when `value` exceeds `max`.
 * With no budget (`max` 0), any spend fills the bar and counts as over,
 * unless `noBudget="empty"`.
 */
export function ProgressBar({
  value,
  max,
  color,
  height = 6,
  noBudget = "over",
  className,
}: {
  value: number;
  max: number;
  color: string;
  height?: 4 | 6;
  noBudget?: "over" | "empty";
  className?: string;
}) {
  const over = max > 0 ? value > max : noBudget === "over" && value > 0;
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : over ? 100 : 0;
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
        style={{ width: `${pct}%`, background: over ? "var(--danger)" : color }}
      />
    </div>
  );
}
