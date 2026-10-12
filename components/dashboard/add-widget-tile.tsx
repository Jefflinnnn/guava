import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

/** Dashed placeholder tile that opens the widget gallery. */
export function AddWidgetTile({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-border-strong font-medium text-ink-3 transition-colors hover:border-faint hover:text-foreground",
        className,
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-muted">
        <Plus className="size-4" />
      </span>
      {label}
    </button>
  );
}
