"use client";

import { useState } from "react";
import { ChevronRight, Plus, Tag } from "lucide-react";
import Link from "next/link";

import { MonthControl } from "@/components/dashboard/month-control";
import { CategorySwatch } from "@/components/guava/category-swatch";
import { EmptyState } from "@/components/guava/empty-state";
import { Page, PageHeader } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { monthLabel } from "@/lib/guava/dates";
import { money, plural } from "@/lib/guava/format";
import {
  useCategoryStats,
  useSelectedMonth,
  useUncategorizedStat,
} from "@/lib/guava/store";
import { UNCATEGORIZED } from "@/lib/guava/uncategorized";

import { CategoryCard } from "./category-card";
import { CategoryDialog } from "./category-dialog";
import { DeleteCategoryDialog } from "./delete-category-dialog";
import { DeleteSubcategoryDialog } from "./delete-subcategory-dialog";
import { SubcategoryDialog } from "./subcategory-dialog";
import { useDialogTarget } from "./use-dialog-target";

type SubTarget = { catId: string | null; subId: string | null };
const NO_SUB: SubTarget = { catId: null, subId: null };

/** The Categories page: each category's spend this month, with its subcategories. */
export function CategoriesView() {
  const stats = useCategoryStats();
  const none = useUncategorizedStat();
  const [month] = useSelectedMonth();
  const [expanded, setExpanded] = useState<string[]>([]);

  const catDialog = useDialogTarget<string | null>(null);
  const catDelete = useDialogTarget<string | null>(null);
  const subDialog = useDialogTarget<SubTarget>(NO_SUB);
  const subDelete = useDialogTarget<SubTarget>(NO_SUB);

  const toggle = (id: string) =>
    setExpanded((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );

  return (
    <Page width="medium">
      <PageHeader
        title="Categories"
        subtitle={`Spending in ${monthLabel(month)}`}
        actions={
          stats.length > 0 && (
            <>
              <MonthControl />
              <Button onClick={() => catDialog.show(null)}>
                <Plus />
                Add category
              </Button>
            </>
          )
        }
      />

      {none.count > 0 && (
        <Link
          href="/expenses"
          className="mb-2.5 flex items-center gap-2.5 rounded-xl border border-dashed border-border-strong px-4 py-3 text-sm hover:bg-muted"
        >
          <CategorySwatch color={UNCATEGORIZED.color} />
          <span className="min-w-0 flex-1 truncate">
            <span className="font-medium">{UNCATEGORIZED.name}</span>
            <span className="text-ink-3">
              {" "}
              · {plural(none.count, "expense")} without a category
            </span>
          </span>
          <span className="font-medium tabular">{money(none.spent)}</span>
          <ChevronRight className="size-4 text-ink-3" />
        </Link>
      )}

      {stats.length ? (
        <div className="flex flex-col gap-2.5">
          {stats.map((stat) => {
            const catId = stat.cat.id;
            return (
              <CategoryCard
                key={catId}
                stat={stat}
                expanded={expanded.includes(catId)}
                onToggle={() => toggle(catId)}
                onEdit={() => catDialog.show(catId)}
                onDelete={() => catDelete.show(catId)}
                onAddSub={() => subDialog.show({ catId, subId: null })}
                onEditSub={(subId) => subDialog.show({ catId, subId })}
                onDeleteSub={(subId) => subDelete.show({ catId, subId })}
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Tag />}
          title="No categories yet"
          description="Create categories like Food or Transport to see where your money goes."
          action={
            <Button className="mt-1.5" onClick={() => catDialog.show(null)}>
              Insert a category
            </Button>
          }
          className="bg-surface py-[72px]"
        />
      )}

      <CategoryDialog
        open={catDialog.open}
        onOpenChange={catDialog.onOpenChange}
        categoryId={catDialog.target}
      />
      <DeleteCategoryDialog
        open={catDelete.open}
        onOpenChange={catDelete.onOpenChange}
        categoryId={catDelete.target}
      />
      <SubcategoryDialog
        open={subDialog.open}
        onOpenChange={subDialog.onOpenChange}
        categoryId={subDialog.target.catId}
        subId={subDialog.target.subId}
      />
      <DeleteSubcategoryDialog
        open={subDelete.open}
        onOpenChange={subDelete.onOpenChange}
        categoryId={subDelete.target.catId}
        subId={subDelete.target.subId}
      />
    </Page>
  );
}
