"use client";

import { useId } from "react";

import { Input } from "@/components/ui/input";

import { Field } from "./field";

/** Text input with a hard length cap and a live "n/max" counter. */
export function CharCountInput({
  label,
  value,
  onChange,
  max,
  error,
  hint,
  showCount = true,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange" | "maxLength"> & {
  label: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  max: number;
  error?: string;
  hint?: React.ReactNode;
  showCount?: boolean;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} aside={showCount ? `${value.length}/${max}` : undefined} error={error} hint={hint}>
      <Input
        id={id}
        value={value}
        maxLength={max}
        aria-invalid={!!error || undefined}
        onChange={(e) => onChange(e.target.value.slice(0, max))}
        {...props}
      />
    </Field>
  );
}
