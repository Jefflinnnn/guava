"use client";

import { useId } from "react";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/** Title + muted description with a switch on the right. */
export function SwitchRow({
  title,
  description,
  checked,
  onCheckedChange,
  icon,
  bordered = false,
  disabled,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  icon?: React.ReactNode;
  /** Renders as its own bordered card (inside dialogs). */
  bordered?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex items-center gap-3", bordered && "rounded-lg border px-3.5 py-3", className)}>
      {icon && <span className="flex-none text-ink-3 [&_svg]:size-4">{icon}</span>}
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <div className="font-medium">{title}</div>
        {description && <div className="mt-0.5 text-[13px] text-ink-3">{description}</div>}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}
