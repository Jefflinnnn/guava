"use client";

import { ArrowDown, ArrowUp, ListFilter } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type SortProps = {
  /** Current direction when this column is the sort key, else null. */
  dir: 1 | -1 | null;
  onSort: () => void;
};

type FilterProps = {
  /** Tints the button and the label when the filter narrows the list. */
  active: boolean;
  /** Accessible name, e.g. "Filter date". */
  title: string;
  /** Which edge of the column the popover lines up with. */
  align?: "start" | "end";
  /** Popover width class, e.g. "w-[200px]". */
  width: string;
};

/**
 * A table header cell: label (a sort toggle when `sort` is given) plus an
 * optional filter button that opens a popover (holding `children`)
 * anchored to the cell.
 */
export function ColumnHeader({
  label,
  sort,
  filter,
  children,
}: {
  label: string;
  sort?: SortProps;
  filter?: FilterProps;
  /** The filter body shown in the popover. */
  children?: React.ReactNode;
}) {
  const tone = filter?.active ? "text-foreground" : "text-ink-3";
  const title = sort ? (
    <button
      type="button"
      onClick={sort.onSort}
      className={cn(
        "-ml-1.5 flex h-7 cursor-pointer items-center gap-1 rounded-md px-1.5 font-medium hover:bg-hover",
        tone,
      )}
    >
      {label}
      {sort.dir === 1 && <ArrowUp aria-label="ascending" className="size-3" />}
      {sort.dir === -1 && (
        <ArrowDown aria-label="descending" className="size-3" />
      )}
    </button>
  ) : (
    <span className={cn("mr-1", tone)}>{label}</span>
  );

  if (!filter)
    return <div className="flex min-w-0 items-center gap-0.5">{title}</div>;

  return (
    <Popover>
      <PopoverAnchor asChild>
        <div className="flex min-w-0 items-center gap-0.5">
          {title}
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={filter.title}
              title={filter.title}
              className={cn(
                "size-6",
                filter.active && "bg-hover text-foreground",
              )}
            >
              <ListFilter className="size-3.5" />
            </Button>
          </PopoverTrigger>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align={filter.align ?? "start"}
        alignOffset={filter.align === "end" ? 0 : -8}
        sideOffset={6}
        className={cn("gap-0 rounded-lg p-1", filter.width)}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
