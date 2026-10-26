"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";

import { ConfirmDeleteDialog } from "@/components/guava/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { plural } from "@/lib/guava/format";
import { useAccountById, useCatById } from "@/lib/guava/store";
import { cn } from "@/lib/utils";

import { activeFilters } from "./filter-state";
import { SEARCH_MAX } from "./layout";
import type { ExpensesView } from "./use-expenses-view";

/** Search · active filter chips · Reset … bulk actions (when rows are selected). */
export function ExpensesToolbar({ view }: { view: ExpensesView }) {
  const catById = useCatById();
  const accountById = useAccountById();
  const chips = activeFilters(view.filters, catById, accountById);
  const ids = view.selected;
  const [confirmDelete, setConfirmDelete] = useState(false);

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
      {ids.length === 0 && view.undoCount > 0 && (
        <UndoNotice
          count={view.undoCount}
          onUndo={view.undoDelete}
          onDismiss={view.dismissUndo}
        />
      )}
      {ids.length > 0 && (
        <BulkBar count={ids.length} onClear={view.clearSelection}>
          {view.showDeleted ? (
            <>
              <BulkAction onClick={() => view.restore(ids)}>Restore</BulkAction>
              <BulkAction onClick={() => setConfirmDelete(true)}>
                Delete now
              </BulkAction>
            </>
          ) : (
            <>
              <BulkAction onClick={() => view.setNeedsReview(ids, false)}>
                Mark reviewed
              </BulkAction>
              <BulkAction onClick={() => view.setNeedsReview(ids, true)}>
                Needs review
              </BulkAction>
              <BulkAction onClick={() => view.deleteExpenses(ids)}>
                Delete
              </BulkAction>
            </>
          )}
        </BulkBar>
      )}
      <ConfirmDeleteDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${plural(ids.length, "expense")} for good?`}
        description="They can't be restored afterwards. Deleted bank transactions won't come back when you sync."
        confirmLabel="Delete now"
        onConfirm={() => {
          setConfirmDelete(false);
          view.deleteForGood(ids);
        }}
      />
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
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  /** The BulkAction buttons. */
  children: React.ReactNode;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Selected expenses"
      className="ml-auto flex h-9 items-center gap-1.5 rounded-lg bg-primary pr-1.5 pl-3 text-[13px] text-primary-foreground"
    >
      <span className="mr-1.5 font-medium">{count} selected</span>
      {children}
      <BulkAction aria-label="Clear selection" icon onClick={onClear}>
        <X className="size-3.5" />
      </BulkAction>
    </div>
  );
}

/** "Moved 3 expenses to Recently deleted · Undo", after a delete. */
function UndoNotice({
  count,
  onUndo,
  onDismiss,
}: {
  count: number;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className="ml-auto flex h-9 items-center gap-1 rounded-lg border bg-card pr-1 pl-3 text-[13px] text-ink-2 shadow-control"
    >
      <span className="mr-1">
        Moved {plural(count, "expense")} to Recently deleted.
      </span>
      <Button variant="ghost" size="xs" className="h-7 px-2" onClick={onUndo}>
        Undo
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Dismiss"
        className="size-7 text-ink-3"
        onClick={onDismiss}
      >
        <X />
      </Button>
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
