"use client";

import { useState } from "react";

import { CategorySwatch } from "@/components/guava/category-swatch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCategories } from "@/lib/guava/store";
import { UNCATEGORIZED } from "@/lib/guava/uncategorized";
import { cn } from "@/lib/utils";

const ITEM =
  "flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm text-foreground hover:bg-muted";

/**
 * The bulk bar's "Categorize" button: a list of every category with its
 * subcategories beneath it. Picking one applies it to all selected expenses.
 */
export function CategorizeMenu({
  trigger,
  onPick,
}: {
  /** The button that opens the menu. */
  trigger: React.ReactElement;
  onPick: (catId: string | null, subId: string | null) => void;
}) {
  const cats = useCategories();
  const [open, setOpen] = useState(false);
  const pick = (catId: string | null, subId: string | null) => {
    setOpen(false);
    onPick(catId, subId);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="max-h-[min(400px,var(--radix-popover-content-available-height))] w-[240px] gap-0 overflow-y-auto rounded-lg p-1"
      >
        <div className="px-2 py-1.5 text-xs font-medium text-ink-3">
          Move to category
        </div>
        {cats.map((c) => (
          <div key={c.id}>
            <button
              type="button"
              onClick={() => pick(c.id, null)}
              className={ITEM}
            >
              <CategorySwatch color={c.color} />
              <span className="truncate">{c.name}</span>
            </button>
            {c.subs.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-label={`${c.name}: ${s.name}`}
                onClick={() => pick(c.id, s.id)}
                className={cn(ITEM, "h-7 pl-6 text-[13px] text-ink-2")}
              >
                <span className="truncate">{s.name}</span>
              </button>
            ))}
          </div>
        ))}
        <div className="my-1 h-px bg-border" />
        <button type="button" onClick={() => pick(null, null)} className={ITEM}>
          <CategorySwatch color={UNCATEGORIZED.color} />
          {UNCATEGORIZED.name}
        </button>
      </PopoverContent>
    </Popover>
  );
}
