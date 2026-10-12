"use client";

import { useId, useState } from "react";

import { formatCentsInput } from "@/lib/guava/format";
import { parseCentsRTL } from "@/lib/guava/money-input";
import { cn } from "@/lib/utils";

import { Field } from "./field";

/**
 * Right-to-left cents entry with a "$" prefix: digits fill in from the cents
 * side (1,2,3,4 → 12.34). Rejected keystrokes show an inline error and leave
 * the value unchanged. `error` (e.g. "must be more than $0") shows when the
 * input itself has none.
 */
export function MoneyInput({
  label,
  valueCents,
  onChange,
  capCents,
  hint,
  error,
  hintTone,
  disabled,
  autoFocus,
  className,
}: {
  label: React.ReactNode;
  valueCents: number | null;
  onChange: (cents: number | null) => void;
  capCents: number;
  hint?: React.ReactNode;
  error?: string;
  hintTone?: "muted" | "warning";
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}) {
  const id = useId();
  const [inputError, setInputError] = useState("");
  const shownError = inputError || error;
  return (
    <Field
      label={label}
      htmlFor={id}
      hint={hint}
      error={shownError}
      hintTone={hintTone}
      className={className}
    >
      <div
        className={cn(
          "flex h-9 items-center rounded-lg border bg-card transition-colors focus-within:border-faint focus-within:ring-3 focus-within:ring-faint/35",
          shownError && "border-danger",
          disabled && "opacity-50",
        )}
      >
        <span className="pl-3 text-ink-3">$</span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0.00"
          disabled={disabled}
          autoFocus={autoFocus}
          aria-invalid={!!shownError || undefined}
          value={formatCentsInput(valueCents)}
          onChange={(e) => {
            const r = parseCentsRTL(e.target.value, capCents);
            if (r.error !== undefined) return setInputError(r.error);
            setInputError("");
            onChange(r.value);
          }}
          className="h-full w-full min-w-0 bg-transparent px-1.5 tabular outline-none placeholder:text-faint disabled:cursor-not-allowed dark:bg-transparent"
        />
      </div>
    </Field>
  );
}
