"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCatById } from "@/lib/guava/store";
import { cn } from "@/lib/utils";

import { activeFilters } from "./filter-state";
import { SEARCH_MAX } from "./layout";
import type { ExpensesView } from "./use-expenses-view";

/** Search · active filter chips · Reset … bulk actions (when rows are selected). */
export function ExpensesToolbar({ view }: { view: ExpensesView }) {
  const catById = useCatById();
  const chips = activeFilters(view.filters, catById);
  const ids = view.selected;

  return (
    <div className="flex min-h-9 flex-wrap items-center gap-2">
      <SearchInput
        value={view.filters.q}
        onChange={(q) => view.setFilters({ q })}
      />
      {chips.map((c) => (
        <FilterChip
          key={c.key}
          label={c.label}
          onRemove={() => view.setFilters(c.clear)}
        />
      ))}
      {chips.length > 0 && (
        <Button
          variant="ghost"
          size="xs"
          className="h-7 px-2"
          onClick={view.resetFilters}
        >
          Reset
        </Button>
      )}
      {ids.length > 0 && (
        <BulkBar
          count={ids.length}
          onMarkReviewed={() => view.setNeedsReview(ids, false)}
          onNeedsReview={() => view.setNeedsReview(ids, true)}
          onClear={view.clearSelection}
        />
      )}
    </div>
  );
}

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative w-[260px] max-w-full">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-ink-3"
      />
      <Input
        aria-label="Search expenses"
        placeholder="Search expenses…"
        value={value}
        maxLength={SEARCH_MAX}
        onChange={(e) => onChange(e.target.value)}
        className="pl-[34px] shadow-control"
      />
    </div>
  );
}

/** Dashed chip for one active filter, with × to clear it. */
function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-lg border border-dashed border-border-strong bg-card pr-1 pl-2.5 text-xs font-medium text-ink-2">
      <span className="max-w-[260px] truncate" title={label}>
        {label}
      </span>
      <button
        type="button"
        aria-label={`Remove filter ${label}`}
        onClick={onRemove}
        className="flex size-5 cursor-pointer items-center justify-center rounded-sm text-ink-3 hover:bg-hover hover:text-foreground"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

/** The primary-colored pill that appears while rows are selected. */
function BulkBar({
  count,
  onMarkReviewed,
  onNeedsReview,
  onClear,
}: {
  count: number;
  onMarkReviewed: () => void;
  onNeedsReview: () => void;
  onClear: () => void;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Selected expenses"
      className="ml-auto flex h-9 items-center gap-1.5 rounded-lg bg-primary pr-1.5 pl-3 text-[13px] text-primary-foreground"
    >
      <span className="mr-1.5 font-medium">{count} selected</span>
      <BulkAction onClick={onMarkReviewed}>Mark reviewed</BulkAction>
      <BulkAction onClick={onNeedsReview}>Needs review</BulkAction>
      <BulkAction aria-label="Clear selection" icon onClick={onClear}>
        <X className="size-3.5" />
      </BulkAction>
    </div>
  );
}

function BulkAction({
  icon,
  className,
  ...props
}: React.ComponentProps<"button"> & { icon?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-[26px] cursor-pointer items-center justify-center rounded-md text-xs font-medium transition-colors",
        icon
          ? "w-[26px] text-primary-foreground/70 hover:bg-primary-hover hover:text-primary-foreground"
          : "bg-primary-hover px-2.5 hover:bg-primary-hover/80",
        className,
      )}
      {...props}
    />
  );
}
