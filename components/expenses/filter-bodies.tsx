"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { CategorySwatch } from "@/components/guava/category-swatch";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  filterAmountToCents,
  parseFilterAmount,
} from "@/lib/guava/money-input";
import {
  DATE_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
} from "@/lib/guava/selectors";
import type { Cat, Filters } from "@/lib/guava/types";
import { cn } from "@/lib/utils";

import { SEARCH_MAX } from "./layout";

type SetFilters = (patch: Partial<Filters>) => void;

// ---- Building blocks

/** Small muted caption at the top of a filter popover. */
function FilterHeading({
  inset = true,
  children,
}: {
  /** Pads to line up with list items (list popovers use p-1). */
  inset?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("text-xs font-medium text-ink-3", inset && "px-2 py-1.5")}
    >
      {children}
    </div>
  );
}

const ITEM =
  "flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm text-foreground hover:bg-muted";

/** Single-select list: a check marks the current option. */
function OptionList<T extends string>({
  options,
  value,
  onChange,
}: {
  options: [T, string][];
  value: T;
  onChange: (v: T) => void;
}) {
  return options.map(([v, label]) => (
    <button
      key={v}
      type="button"
      aria-pressed={v === value}
      onClick={() => onChange(v)}
      className={ITEM}
    >
      <span className="flex w-3.5">
        {v === value && <Check className="size-3.5" />}
      </span>
      {label}
    </button>
  ));
}

/** Multi-select row: checkbox + content. */
function CheckOption({
  checked,
  onCheckedChange,
  children,
}: {
  checked: boolean;
  onCheckedChange: (on: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className={ITEM}>
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
      />
      {children}
    </label>
  );
}

function toggle(list: string[], item: string, on: boolean): string[] {
  return on
    ? [...list.filter((x) => x !== item), item]
    : list.filter((x) => x !== item);
}

// ---- One body per filterable column

export function DateFilter({
  value,
  setFilters,
}: {
  value: Filters["date"];
  setFilters: SetFilters;
}) {
  return (
    <>
      <FilterHeading>Date range</FilterHeading>
      <OptionList
        options={DATE_FILTER_OPTIONS}
        value={value}
        onChange={(date) => setFilters({ date })}
      />
    </>
  );
}

export function NameFilter({
  value,
  setFilters,
}: {
  value: string;
  setFilters: SetFilters;
}) {
  return (
    <div className="flex flex-col gap-2 p-2">
      <FilterHeading inset={false}>Name contains</FilterHeading>
      <Input
        autoFocus
        value={value}
        maxLength={SEARCH_MAX}
        placeholder="e.g. Chipotle"
        aria-label="Name contains"
        onChange={(e) => setFilters({ q: e.target.value })}
        className="h-[34px] rounded-md"
      />
    </div>
  );
}

export function AmountFilter({
  min,
  max,
  setFilters,
}: {
  min: string;
  max: string;
  setFilters: SetFilters;
}) {
  // A rejected keystroke leaves the filter unchanged and explains why.
  const [inputError, setInputError] = useState("");
  const lo = filterAmountToCents(min);
  const hi = filterAmountToCents(max);
  const message =
    inputError ||
    (lo > hi ? "Min is higher than max — nothing will match." : "");

  const bind = (key: "min" | "max") => ({
    value: key === "min" ? min : max,
    placeholder: key === "min" ? "Min" : "Max",
    "aria-label": key === "min" ? "Minimum amount" : "Maximum amount",
    inputMode: "decimal" as const,
    className: "h-[34px] w-0 flex-1 rounded-md",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const r = parseFilterAmount(e.target.value);
      if (r.error !== undefined) return setInputError(r.error);
      setInputError("");
      setFilters({ [key]: r.value });
    },
  });

  return (
    <div className="flex flex-col gap-2 p-2">
      <FilterHeading inset={false}>Amount between</FilterHeading>
      <div className="flex items-center gap-1.5">
        <Input autoFocus {...bind("min")} />
        <span className="text-ink-3">–</span>
        <Input {...bind("max")} />
      </div>
      {message && (
        <p role="alert" className="text-xs leading-snug text-danger">
          {message}
        </p>
      )}
    </div>
  );
}

export function CategoryFilter({
  cats,
  counts,
  value,
  setFilters,
}: {
  cats: Cat[];
  counts: Map<string, number>;
  value: string[];
  setFilters: SetFilters;
}) {
  return (
    <>
      <FilterHeading>Show categories</FilterHeading>
      {cats.map((c) => (
        <CheckOption
          key={c.id}
          checked={value.includes(c.id)}
          onCheckedChange={(on) =>
            setFilters({ cats: toggle(value, c.id, on) })
          }
        >
          <CategorySwatch color={c.color} />
          <span className="min-w-0 flex-1 truncate">{c.name}</span>
          <span className="font-mono text-xs text-ink-3">
            {counts.get(c.id) ?? 0}
          </span>
        </CheckOption>
      ))}
    </>
  );
}

export function SubcategoryFilter({
  cats,
  selectedCats,
  value,
  setFilters,
}: {
  cats: Cat[];
  /** Only these categories' subcategories are listed (all when empty). */
  selectedCats: string[];
  value: string[];
  setFilters: SetFilters;
}) {
  const options = cats
    .filter((c) => !selectedCats.length || selectedCats.includes(c.id))
    .flatMap((c) =>
      c.subs.map((s) => ({
        key: `${c.id}/${s.id}`,
        name: s.name,
        cat: c.name,
      })),
    );
  return (
    <>
      <FilterHeading>Show subcategories</FilterHeading>
      <div className="max-h-[280px] overflow-y-auto">
        {options.length === 0 && (
          <p className="px-2 py-1.5 text-[13px] text-ink-3">
            No subcategories.
          </p>
        )}
        {options.map((o) => (
          <CheckOption
            key={o.key}
            checked={value.includes(o.key)}
            onCheckedChange={(on) =>
              setFilters({ subs: toggle(value, o.key, on) })
            }
          >
            <span className="min-w-0 flex-1 truncate">{o.name}</span>
            <span className="max-w-20 flex-none truncate text-[11px] text-ink-3">
              {o.cat}
            </span>
          </CheckOption>
        ))}
      </div>
    </>
  );
}

export function StatusFilter({
  value,
  setFilters,
}: {
  value: Filters["status"];
  setFilters: SetFilters;
}) {
  return (
    <>
      <FilterHeading>Status</FilterHeading>
      <OptionList
        options={STATUS_FILTER_OPTIONS}
        value={value}
        onChange={(status) => setFilters({ status })}
      />
    </>
  );
}
