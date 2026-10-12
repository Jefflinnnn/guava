import { cn } from "@/lib/utils";

import { CategorySwatch } from "./category-swatch";

type ChipProps = React.ComponentProps<"button"> & {
  selected?: boolean;
  /** `primary` fills green when selected (category pickers); `subtle` greys (subcategory pills). */
  tone?: "primary" | "subtle";
  /** Shows a category swatch before the label. */
  color?: string;
  shape?: "rounded" | "pill";
};

/** A selectable chip button: category pickers, subcategory pills, move-to choices. */
export function Chip({ selected, tone = "primary", color, shape = "rounded", className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex h-8 max-w-full min-w-0 cursor-pointer items-center gap-2 border px-3 text-[13px] font-medium transition-colors",
        shape === "pill" ? "rounded-full" : "rounded-lg",
        !selected && "border-border bg-card text-ink-2 hover:bg-muted",
        selected && tone === "primary" && "border-primary bg-primary text-primary-foreground",
        selected && tone === "subtle" && "border-faint bg-muted text-foreground",
        !selected && tone === "subtle" && "text-ink-3",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {color && <CategorySwatch color={color} />}
      <span className="truncate">{children}</span>
    </button>
  );
}

/** A static category label: bordered tag with swatch and ellipsized name. */
export function CategoryTag({ color, name, className }: { color: string; name: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-[26px] max-w-full min-w-0 items-center gap-1.5 rounded-md border bg-card px-2 text-xs font-medium text-ink-2",
        className
      )}
    >
      <CategorySwatch color={color} />
      <span className="truncate">{name}</span>
    </span>
  );
}
