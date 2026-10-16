"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { PASSWORD_MAX } from "@/lib/auth-validation";
import { cn } from "@/lib/utils";

/** Password input with a Show/Hide text toggle inside, on the right. */
export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
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
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute top-1.5 right-1.5 h-7 cursor-pointer rounded-md px-2 text-xs font-medium text-ink-3 transition-colors hover:bg-muted hover:text-foreground"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
