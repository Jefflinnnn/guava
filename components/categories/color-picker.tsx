"use client";

import { CATEGORY_COLORS } from "@/lib/guava/colors";
import { cn } from "@/lib/utils";

const DEFAULT_CUSTOM = "#7c3aed";

/** A 28px swatch with a ring when selected. */
function SwatchFrame({
  selected,
  className,
  children,
}: {
  selected: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "relative block size-7 rounded-lg border-2 bg-card p-[3px] transition-colors",
        selected ? "border-primary" : "border-transparent",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Category color choice: the preset swatches plus a custom swatch that wraps
 * a native color input. A custom pick shows its color and hex code.
 */
export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  const isCustom = !CATEGORY_COLORS.includes(value);
  return (
    <div role="radiogroup" className="flex flex-wrap items-center gap-1.5">
      {CATEGORY_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={`Color ${color}`}
          onClick={() => onChange(color)}
          className="cursor-pointer rounded-lg disabled:cursor-not-allowed"
        >
          <SwatchFrame selected={value === color}>
            <span
              className="block size-full rounded-sm"
              style={{ background: color }}
            />
          </SwatchFrame>
        </button>
      ))}
      <label title="Pick any color" className="cursor-pointer">
        <SwatchFrame selected={isCustom}>
          <span
            className={cn(
              "block size-full rounded-sm",
              !isCustom &&
                "bg-[conic-gradient(#ef4444,#eab308,#22c55e,#06b6d4,#3b82f6,#a855f7,#ef4444)]",
            )}
            style={isCustom ? { background: value } : undefined}
          />
          <input
            type="color"
            aria-label="Custom color"
            value={isCustom && value.startsWith("#") ? value : DEFAULT_CUSTOM}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
        </SwatchFrame>
      </label>
      <span className="ml-1 font-mono text-xs text-ink-3">
        {isCustom ? value : "Custom"}
      </span>
    </div>
  );
}
