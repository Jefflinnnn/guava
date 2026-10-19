"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { PASSWORD_MAX } from "@/lib/auth-validation";
import { cn } from "@/lib/utils";

/** Password input with a Show/Hide text toggle inside, on the right. */
export function PasswordInput({
  className,
  revealLabel = "password",
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type"> & {
  /** What the toggle's aria-label calls the value, e.g. "secret". */
  revealLabel?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        maxLength={PASSWORD_MAX}
        className={cn("h-10 px-3 pr-16 shadow-card", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={`${visible ? "Hide" : "Show"} ${revealLabel}`}
        aria-pressed={visible}
        className="absolute top-1.5 right-1.5 h-7 cursor-pointer rounded-md px-2 text-xs font-medium text-ink-3 transition-colors hover:bg-muted hover:text-foreground"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
