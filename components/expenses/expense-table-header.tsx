"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { useAccounts, useCategories } from "@/lib/guava/store";
import type { SortKey } from "@/lib/guava/types";
import { cn } from "@/lib/utils";

import { ColumnHeader } from "./column-header";
import {
  AccountFilter,
  AmountFilter,
  BankFilter,
  CategoryFilter,
  DateFilter,
  NameFilter,
  StatusFilter,
  SubcategoryFilter,
} from "./filter-bodies";
import { activeFilterKeys } from "./filter-state";
import { EXPENSE_GRID } from "./layout";
import type { ExpensesView } from "./use-expenses-view";

/** The 44px header row: select-all, sort toggles and column filters. */
export function ExpenseTableHeader({ view }: { view: ExpensesView }) {
  const cats = useCategories();
  const accounts = useAccounts();
  const { filters: f, sort, setFilters } = view;
  const active = activeFilterKeys(f);
  const sortProps = (key: SortKey) => ({
    dir: sort.key === key ? sort.dir : null,
    onSort: () => view.sortBy(key),
  });

  return (
    <div
      className={cn(
        EXPENSE_GRID[view.showAccounts ? "accounts" : "plain"],
        "sticky top-0 z-10 h-11 border-b bg-card text-[13px] font-medium text-ink-3",
      )}
    >
      <div className="flex justify-center">
        <Checkbox
          aria-label="Select all visible expenses"
          checked={view.allSelected}
          disabled={!view.hasVisibleRows}
          onCheckedChange={view.toggleAll}
        />
      </div>

      <ColumnHeader
        label="Date"
        sort={sortProps("date")}
        filter={{ active: active.date, title: "Filter date", width: "w-50" }}
      >
        <DateFilter value={f.date} setFilters={setFilters} />
      </ColumnHeader>

      <ColumnHeader
        label="Name"
        sort={sortProps("name")}
        filter={{ active: active.name, title: "Filter name", width: "w-60" }}
      >
        <NameFilter value={f.q} setFilters={setFilters} />
      </ColumnHeader>

      {view.showAccounts && (
        <>
          <ColumnHeader
            label="Bank"
            filter={{
              active: active.bank,
              title: "Filter bank",
              width: "w-56",
            }}
          >
            <BankFilter
              accounts={accounts}
              counts={view.bankCounts}
              value={f.banks}
              setFilters={setFilters}
            />
          </ColumnHeader>

          <ColumnHeader
            label="Card"
            filter={{
              active: active.account,
              title: "Filter card",
              width: "w-64",
            }}
          >
            <AccountFilter
              accounts={view.usedAccounts}
              counts={view.accountCounts}
              value={f.accounts}
              setFilters={setFilters}
            />
          </ColumnHeader>

          <span>Last 4</span>
        </>
      )}

      <ColumnHeader
        label="Amount"
        sort={sortProps("amount")}
        filter={{
          active: active.amount,
          title: "Filter amount",
          width: "w-60",
        }}
      >
        <AmountFilter min={f.min} max={f.max} setFilters={setFilters} />
      </ColumnHeader>

      <ColumnHeader
        label="Category"
        filter={{
          active: active.cat,
          title: "Filter category",
          width: "w-[210px]",
        }}
      >
        <CategoryFilter
          cats={cats}
          counts={view.catCounts}
          value={f.cats}
          setFilters={setFilters}
        />
      </ColumnHeader>

      <ColumnHeader
        label="Subcategory"
        filter={{
          active: active.sub,
          title: "Filter subcategory",
          width: "w-60",
          align: "end",
        }}
      >
        <SubcategoryFilter
          cats={cats}
          selectedCats={f.cats}
          value={f.subs}
          setFilters={setFilters}
        />
      </ColumnHeader>

      <ColumnHeader
        label="Needs review?"
        filter={{
          active: active.status,
          title: "Filter status",
          width: "w-[190px]",
          align: "end",
        }}
      >
        <StatusFilter value={f.status} setFilters={setFilters} />
      </ColumnHeader>

      <div />
    </div>
  );
}
