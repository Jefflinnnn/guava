import { cn } from "@/lib/utils";

const SWATCH_SIZES = {
  8: "size-2 rounded-[2px]",
  10: "size-2.5 rounded-[3px]",
  12: "size-3 rounded-[3px]",
} as const;

/** The small color square that marks a category everywhere. */
export function CategorySwatch({
  color,
  size = 8,
  className,
}: {
  color: string;
  size?: keyof typeof SWATCH_SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block flex-none", SWATCH_SIZES[size], className)}
      style={{ background: color }}
    />
  );
}

/** A tinted square tile holding a swatch (Categories list, dialogs). */
export function CategoryTile({
  color,
  className,
}: {
  color: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      style={{ "--cat": color } as React.CSSProperties}
      className={cn(
        "flex size-9 flex-none items-center justify-center rounded-lg",
        "bg-[color-mix(in_oklch,var(--cat)_14%,white)] dark:bg-[color-mix(in_oklch,var(--cat)_22%,var(--card))]",
        className,
      )}
    >
      <CategorySwatch color={color} size={12} />
    </span>
  );
}
