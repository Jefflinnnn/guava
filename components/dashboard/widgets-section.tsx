"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { SectionHeader } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { useWidgets } from "@/lib/guava/store";
import type { Widget, WidgetId, WidgetSize } from "@/lib/guava/types";
import { cn } from "@/lib/utils";

import { AddWidgetTile } from "./add-widget-tile";
import { WidgetCard } from "./widget-card";
import { WidgetGalleryDialog } from "./widget-gallery-dialog";
import { normalizeWidgets, WIDGET_IDS, WIDGETS } from "./widgets/registry";

/** Moves `from` to where `to` sits. Returns `list` itself when nothing moves. */
function move(list: Widget[], from: WidgetId, to: WidgetId): Widget[] {
  const fi = list.findIndex((w) => w.id === from);
  const ti = list.findIndex((w) => w.id === to);
  if (fi < 0 || ti < 0 || fi === ti) return list;
  const next = list.slice();
  const [item] = next.splice(fi, 1);
  next.splice(ti, 0, item);
  return next;
}

/** The iOS-style widget board: grid, edit mode with drag reorder, gallery. */
export function WidgetsSection() {
  const [stored, setWidgets] = useWidgets();
  const widgets = useMemo(() => normalizeWidgets(stored), [stored]);
  const [editMode, setEditMode] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [dragId, setDragId] = useState<WidgetId | null>(null);

  const count = widgets.length;
  const editing = editMode && count > 0;
  const added = useMemo(() => new Set(widgets.map((w) => w.id)), [widgets]);
  const showAddTile = (count === 0 || editing) && count < WIDGET_IDS.length;

  const update = (fn: (list: Widget[]) => Widget[]) =>
    setWidgets((prev) => fn(normalizeWidgets(prev)));

  const remove = (id: WidgetId) => {
    update((list) => list.filter((w) => w.id !== id));
    if (count <= 1) setEditMode(false);
  };
  const resize = (id: WidgetId, size: WidgetSize) =>
    update((list) => list.map((w) => (w.id === id ? { ...w, size } : w)));

  return (
    <>
      <SectionHeader
        title="Widgets"
        subtitle={
          count > 0 &&
          `${count} of ${WIDGET_IDS.length} widgets${
            editing ? " · drag to reorder, pick a size, or remove" : ""
          }`
        }
        actions={
          <>
            <Button variant="outline" onClick={() => setGalleryOpen(true)}>
              <Plus data-icon="inline-start" />
              Add widget
            </Button>
            {count > 0 && (
              <Button
                variant={editing ? "default" : "outline"}
                onClick={() => {
                  setEditMode(!editing);
                  setDragId(null);
                }}
              >
                {editing ? "Done" : "Edit"}
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,400px),1fr))] items-start gap-4">
        {widgets.map(({ id, size }) => {
          const { name, sizes, Component } = WIDGETS[id];
          return (
            <WidgetCard
              key={id}
              name={name}
              size={size}
              sizes={sizes}
              editing={editing}
              dragging={dragId === id}
              onSizeChange={(s) => resize(id, s)}
              onRemove={() => remove(id)}
              dragHandlers={{
                onDragStart: (e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", id);
                  setDragId(id);
                },
                onDragOver: (e) => {
                  if (!dragId) return;
                  e.preventDefault();
                  const next = move(widgets, dragId, id);
                  if (next !== widgets) setWidgets(next);
                },
                onDrop: (e) => {
                  e.preventDefault();
                  setDragId(null);
                },
                onDragEnd: () => setDragId(null),
              }}
            >
              <Component size={size} />
            </WidgetCard>
          );
        })}
        {showAddTile && (
          <AddWidgetTile
            label={count === 0 ? "Add your first widget" : "Add widget"}
            className={cn(count === 0 && "col-span-full")}
            onClick={() => setGalleryOpen(true)}
          />
        )}
      </div>

      <WidgetGalleryDialog
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        added={added}
        onAdd={(id, size) =>
          update((list) =>
            list.some((w) => w.id === id) ? list : [...list, { id, size }],
          )
        }
        onReset={() => {
          setWidgets([]);
          setEditMode(false);
        }}
      />
    </>
  );
}
