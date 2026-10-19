"use client";

import { Plus } from "lucide-react";
import { useId, useState } from "react";

import { NAME_MAX as CATEGORY_NAME_MAX } from "@/components/categories/category-dialog";

import { CharCountInput } from "@/components/guava/char-count-input";
import { Chip } from "@/components/guava/chip";
import { Field } from "@/components/guava/field";
import { InitialAvatar } from "@/components/guava/initial-avatar";
import { MoneyInput } from "@/components/guava/money-input";
import { SwitchRow } from "@/components/guava/switch-row";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_COLORS } from "@/lib/guava/colors";
import { formatLongDate } from "@/lib/guava/dates";
import { money } from "@/lib/guava/format";
import { EXPENSE_CAP_CENTS } from "@/lib/guava/money-input";
import {
  useActions,
  useCategories,
  useToday,
  useTxns,
} from "@/lib/guava/store";
import type { Cat, DateKey, Txn } from "@/lib/guava/types";
import { UNCATEGORIZED } from "@/lib/guava/uncategorized";
import { cn } from "@/lib/utils";

import { NAME_MAX, NOTE_MAX } from "./layout";

type Draft = {
  name: string;
  amountCents: number | null;
  date: DateKey;
  /** null = uncategorized. */
  catId: string | null;
  subId: string | null;
  note: string;
  reviewed: boolean;
};

function draftFrom(txn: Txn | undefined, today: DateKey): Draft {
  if (txn)
    return {
      name: txn.name,
      amountCents: txn.amountCents,
      date: txn.date,
      catId: txn.catId,
      subId: txn.subId,
      note: txn.note,
      reviewed: !txn.needsReview,
    };
  return {
    name: "",
    amountCents: null,
    date: today,
    catId: null,
    subId: null,
    note: "",
    // You typed it in yourself, so it starts out reviewed (once it has a
    // category; uncategorized expenses always need review).
    reviewed: true,
  };
}

const isDateKey = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * Add / Edit expense dialog. `txnId` null creates a new expense. The form is
 * keyed by `txnId` and remounts on every open, so its draft is initialized
 * fresh from the store (no syncing effects).
 */
export function ExpenseDialog({
  open,
  onOpenChange,
  txnId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  txnId: string | null;
}) {
  const txns = useTxns();
  const isEdit = txnId != null;
  // Undefined after a delete; the mounted form keeps its draft while closing.
  const txn = isEdit ? txns.find((t) => t.id === txnId) : undefined;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-[18px] sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit expense" : "Add manual expense"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Fix details or recategorize before marking reviewed."
              : "Log cash or anything your bank didn’t catch."}
          </DialogDescription>
        </DialogHeader>
        <ExpenseForm
          key={txnId ?? "new"}
          txn={txn}
          isEdit={isEdit}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ExpenseForm({
  txn,
  isEdit,
  onDone,
}: {
  txn: Txn | undefined;
  isEdit: boolean;
  onDone: () => void;
}) {
  const cats = useCategories();
  const today = useToday();
  const { upsertTxn, deleteTxn } = useActions();
  const [draft, setDraft] = useState(() => draftFrom(txn, today));
  const [amountTouched, setAmountTouched] = useState(false);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const cat = cats.find((c) => c.id === draft.catId);
  const amount = draft.amountCents ?? 0;
  const amountError =
    draft.amountCents === 0 || (amountTouched && draft.amountCents == null)
      ? "Amount must be more than $0.00."
      : undefined;
  const canSave =
    draft.name.trim() !== "" && amount > 0 && isDateKey(draft.date);
  const reviewed = draft.reviewed && cat != null;

  const save = () => {
    if (!canSave) return;
    upsertTxn({
      id: txn?.id ?? null,
      name: draft.name.trim(),
      amountCents: amount,
      date: draft.date,
      catId: cat?.id ?? null,
      subId: cat ? draft.subId : null,
      note: draft.note.trim(),
      needsReview: !reviewed,
    });
    onDone();
  };

  const remove = () => {
    if (!txn) return;
    // Close first so the dialog animates out with the last draft still shown.
    onDone();
    deleteTxn(txn.id);
  };

  return (
    <>
      <ExpensePreview
        name={draft.name}
        date={draft.date}
        amountCents={amount}
      />

      <div className="grid grid-cols-2 gap-3.5">
        <div className="col-span-2">
          <CharCountInput
            label="Name"
            placeholder="e.g. Chipotle"
            value={draft.name}
            onChange={(name) => set({ name })}
            max={NAME_MAX}
            showCount={false}
            className="shadow-control"
          />
        </div>
        <MoneyInput
          label="Amount"
          valueCents={draft.amountCents}
          onChange={(amountCents) => {
            setAmountTouched(true);
            set({ amountCents });
          }}
          capCents={EXPENSE_CAP_CENTS}
          error={amountError}
        />
        <DateField value={draft.date} onChange={(date) => set({ date })} />

        <CategoryPicker
          cats={cats}
          value={draft.catId}
          onChange={(catId) => set({ catId, subId: null })}
        />
        {cat && cat.subs.length > 0 && (
          <SubcategoryPicker
            cat={cat}
            value={draft.subId}
            onChange={(subId) => set({ subId })}
          />
        )}

        <NoteField value={draft.note} onChange={(note) => set({ note })} />
      </div>

      <SwitchRow
        bordered
        title="Mark as reviewed"
        description={
          cat
            ? "Reviewed expenses move to the bottom list."
            : "Pick a category first. Uncategorized expenses stay in review."
        }
        checked={reviewed}
        disabled={!cat}
        onCheckedChange={(reviewed) => set({ reviewed })}
      />

      <div className="flex items-center gap-2">
        {isEdit && (
          <Button variant="destructive" onClick={remove}>
            Delete
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button disabled={!canSave} onClick={save} className="px-4">
            Save
          </Button>
        </div>
      </div>
    </>
  );
}

/** Live summary card at the top of the dialog. */
function ExpensePreview({
  name,
  date,
  amountCents,
}: {
  name: string;
  date: DateKey;
  amountCents: number;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-[10px] border border-muted bg-surface p-3.5">
      <InitialAvatar name={name} size={40} className="bg-card" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">
          {name.trim() || "Untitled expense"}
        </div>
        <div className="text-xs text-ink-3">
          {isDateKey(date) ? formatLongDate(date) : "No date"}
        </div>
      </div>
      <div className="text-[22px] font-semibold tracking-[-0.02em] tabular">
        {money(amountCents)}
      </div>
    </div>
  );
}

function DateField({
  value,
  onChange,
}: {
  value: DateKey;
  onChange: (v: DateKey) => void;
}) {
  const id = useId();
  return (
    <Field label="Date" htmlFor={id}>
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="shadow-control"
      />
    </Field>
  );
}

const CHIP = "h-[30px] px-[11px]";

/** Category chips, "Uncategorized", and "+ New category" to add one inline. */
function CategoryPicker({
  cats,
  value,
  onChange,
}: {
  cats: Cat[];
  value: string | null;
  onChange: (catId: string | null) => void;
}) {
  const { upsertCat } = useActions();
  // null = showing the "+ New category" chip; a string = the name being typed.
  const [newName, setNewName] = useState<string | null>(null);

  const name = newName?.trim() ?? "";
  const nameError = cats.some(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  )
    ? "A category with this name already exists."
    : undefined;

  const create = () => {
    if (!name || nameError) return;
    const id = upsertCat({
      id: null,
      name,
      color: CATEGORY_COLORS[cats.length % CATEGORY_COLORS.length],
      budgetCents: 0,
      locked: false,
    });
    setNewName(null);
    onChange(id);
  };

  return (
    <Field label="Category" className="col-span-2" error={nameError}>
      <div
        role="group"
        aria-label="Category"
        className="flex flex-wrap gap-1.5"
      >
        <Chip
          color={UNCATEGORIZED.color}
          selected={value == null}
          onClick={() => onChange(null)}
          className={CHIP}
        >
          {UNCATEGORIZED.name}
        </Chip>
        {cats.map((c) => (
          <Chip
            key={c.id}
            color={c.color}
            selected={c.id === value}
            onClick={() => onChange(c.id)}
            className={CHIP}
          >
            {c.name}
          </Chip>
        ))}
        {newName == null ? (
          <Button
            variant="dashed"
            onClick={() => setNewName("")}
            className={cn(CHIP, "gap-1 text-[13px]")}
          >
            <Plus />
            New category
          </Button>
        ) : (
          <Input
            autoFocus
            value={newName}
            maxLength={CATEGORY_NAME_MAX}
            placeholder="Category name"
            aria-label="New category name"
            aria-invalid={!!nameError}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                create();
              } else if (e.key === "Escape") {
                // Close just the inline input, not the whole dialog.
                e.stopPropagation();
                setNewName(null);
              }
            }}
            onBlur={() => (name && !nameError ? create() : setNewName(null))}
            className="h-[30px] w-40 rounded-lg text-[13px]"
          />
        )}
      </div>
    </Field>
  );
}

function SubcategoryPicker({
  cat,
  value,
  onChange,
}: {
  cat: Cat;
  value: string | null;
  onChange: (subId: string | null) => void;
}) {
  const options = [{ id: null, name: "None" }, ...cat.subs];
  return (
    <div
      role="group"
      aria-label="Subcategory"
      className="col-span-2 -mt-1.5 flex flex-wrap items-center gap-1.5"
    >
      <span className="mr-0.5 text-xs text-ink-3">Subcategory</span>
      {options.map((s) => (
        <Chip
          key={s.id ?? "none"}
          tone="subtle"
          shape="pill"
          selected={s.id === value}
          onClick={() => onChange(s.id)}
          className="h-[26px] max-w-[180px] px-2.5 text-xs"
        >
          {s.name}
        </Chip>
      ))}
    </div>
  );
}

function NoteField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <Field
      label={
        <>
          Note <span className="font-normal text-faint">(optional)</span>
        </>
      }
      htmlFor={id}
      aside={`${value.length}/${NOTE_MAX}`}
      className="col-span-2"
    >
      <Textarea
        id={id}
        rows={2}
        value={value}
        maxLength={NOTE_MAX}
        placeholder="Add context for later…"
        onChange={(e) => onChange(e.target.value.slice(0, NOTE_MAX))}
        className="resize-y shadow-control"
      />
    </Field>
  );
}
