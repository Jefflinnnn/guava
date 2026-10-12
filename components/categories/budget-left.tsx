import { money0Fit } from "@/lib/guava/format";
import { cn } from "@/lib/utils";

/** "$X left" (muted) or "$X over" (red) for a spend-vs-budget pair, in cents. */
export function BudgetLeft({
  spent,
  budget,
  maxChars = 8,
  className,
}: {
  spent: number;
  budget: number;
  /** Width limit for the amount before it switches to compact form. */
  maxChars?: number;
  className?: string;
}) {
  const over = spent > budget;
  return (
    <div
      className={cn(
        "tabular whitespace-nowrap",
        over ? "text-danger" : "text-ink-3",
        className,
      )}
    >
      {money0Fit(Math.abs(budget - spent), maxChars)} {over ? "over" : "left"}
    </div>
  );
}
