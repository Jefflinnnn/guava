"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { WidgetId, WidgetSize } from "@/lib/guava/types";
import { cn } from "@/lib/utils";

import { WidgetSizePicker } from "./widgets/size-picker";
import { fitSize, WIDGET_IDS, WIDGETS } from "./widgets/registry";

/** "Add a widget": every widget with a size picker; each can be added once. */
export function WidgetGalleryDialog({
  open,
  onOpenChange,
  added,
  onAdd,
  onReset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  added: ReadonlySet<WidgetId>;
  onAdd: (id: WidgetId, size: WidgetSize) => void;
  onReset: () => void;
}) {
  const [picked, setPicked] = useState<Partial<Record<WidgetId, WidgetSize>>>(
    {},
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Add a widget</DialogTitle>
          <DialogDescription>
            Pick a size, then add it to your dashboard. Rearrange anytime with
            Edit.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2">
          {WIDGET_IDS.map((id) => {
            const size = fitSize(id, picked[id]);
            return (
              <GalleryRow
                key={id}
                id={id}
                size={size}
                added={added.has(id)}
                onSizeChange={(s) => setPicked((p) => ({ ...p, [id]: s }))}
                onAdd={() => onAdd(id, size)}
              />
            );
          })}
        </ul>
        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={onReset}>
            Reset to default
          </Button>
          <Button className="px-4" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GalleryRow({
  id,
  size,
  added,
  onSizeChange,
  onAdd,
}: {
  id: WidgetId;
  size: WidgetSize;
  added: boolean;
  onSizeChange: (size: WidgetSize) => void;
  onAdd: () => void;
}) {
  const { name, description, icon: Icon, sizes } = WIDGETS[id];
  return (
    <li
      className={cn(
        "grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3.5 rounded-[10px] border p-3",
        added ? "bg-surface" : "bg-card",
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-[10px] bg-pink-soft text-pink-ink">
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0">
        <div className="font-semibold">{name}</div>
        <div className="mt-0.5 text-[13px] text-pretty text-ink-3">
          {description}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <WidgetSizePicker
          sizes={sizes}
          value={size}
          onChange={onSizeChange}
          disabled={added}
        />
        {added ? (
          <Button
            variant="secondary"
            size="sm"
            disabled
            className="disabled:opacity-100"
          >
            Added
          </Button>
        ) : (
          <Button size="sm" onClick={onAdd}>
            Add
          </Button>
        )}
      </div>
    </li>
  );
}
