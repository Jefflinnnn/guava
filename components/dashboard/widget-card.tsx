"use client";

import { GripVertical, Minus } from "lucide-react";

import { Card } from "@/components/shell/page";
import type { WidgetSize } from "@/lib/guava/types";
import { cn } from "@/lib/utils";

import { WidgetSizePicker } from "./widgets/size-picker";

type DragHandlers = Pick<
  React.ComponentProps<"div">,
  "onDragStart" | "onDragOver" | "onDrop" | "onDragEnd"
>;

/**
 * The card frame around a widget. In edit mode it is draggable and gets a
 * dashed overlay with a size picker and a remove button; the widget itself
 * is made inert so it can't be clicked through the overlay.
 */
export function WidgetCard({
  name,
  size,
  sizes,
  editing,
  dragging,
  onSizeChange,
  onRemove,
  dragHandlers,
  children,
}: {
  name: string;
  size: WidgetSize;
  sizes: readonly WidgetSize[];
  editing: boolean;
  /** This card is the one being dragged. */
  dragging: boolean;
  onSizeChange: (size: WidgetSize) => void;
  onRemove: () => void;
  dragHandlers: DragHandlers;
  children: React.ReactNode;
}) {
  return (
    <Card
      draggable={editing}
      {...(editing ? dragHandlers : {})}
      aria-label={name}
      className={cn(
        "relative px-6 py-5 transition-[box-shadow,opacity]",
        size === "full" && "col-span-full",
        editing && "shadow-lift",
        dragging && "opacity-35",
      )}
    >
      <div inert={editing}>{children}</div>
      {editing && (
        <>
          <EditOverlay size={size} sizes={sizes} onSizeChange={onSizeChange} />
          <RemoveButton name={name} onClick={onRemove} />
        </>
      )}
    </Card>
  );
}

function EditOverlay({
  size,
  sizes,
  onSizeChange,
}: {
  size: WidgetSize;
  sizes: readonly WidgetSize[];
  onSizeChange: (size: WidgetSize) => void;
}) {
  return (
    <div className="absolute inset-0 flex cursor-grab items-start justify-end rounded-xl bg-card/45 p-2.5 outline-2 -outline-offset-1 outline-border-strong outline-dashed">
      <div className="flex cursor-default items-center gap-1.5 rounded-[9px] border bg-card p-[3px] shadow-[0_2px_8px_rgba(0,0,0,.08)]">
        <span
          title="Drag to move"
          className="flex size-[26px] cursor-grab items-center justify-center text-ink-3"
        >
          <GripVertical className="size-3.5" />
        </span>
        {sizes.length > 1 ? (
          <WidgetSizePicker
            sizes={sizes}
            value={size}
            onChange={onSizeChange}
          />
        ) : (
          <span className="px-1.5 text-xs text-ink-3">Full width only</span>
        )}
      </div>
    </div>
  );
}

function RemoveButton({
  name,
  onClick,
}: {
  name: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title="Remove widget"
      aria-label={`Remove ${name}`}
      onClick={onClick}
      className="absolute -top-[9px] -left-[9px] z-[2] flex size-6 cursor-pointer items-center justify-center rounded-full border-2 border-background bg-ink-2 text-card transition-colors hover:bg-danger hover:text-white"
    >
      <Minus className="size-3" strokeWidth={3} />
    </button>
  );
}
