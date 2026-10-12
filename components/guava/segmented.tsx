import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = { value: T; label: React.ReactNode; disabled?: boolean };

/** A small segmented control; the active segment is a raised chip. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "sm",
  className,
  "aria-label": ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("inline-flex rounded-md bg-muted p-0.5", className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "cursor-pointer rounded-[5px] px-2.5 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              size === "sm" ? "h-[22px] text-xs" : "h-7 text-[13px]",
              on ? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,.12)]" : "text-ink-3 hover:text-foreground"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
