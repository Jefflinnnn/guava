"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { HoverCard } from "radix-ui";

import { CategorySwatch } from "@/components/guava/category-swatch";
import { ProgressBar } from "@/components/guava/progress-bar";
import { Button } from "@/components/ui/button";
import { money0Fit, percent, plural } from "@/lib/guava/format";
import type { CategoryStat } from "@/lib/guava/selectors";
import { useCategoryStats, useUncategorizedStat } from "@/lib/guava/store";
import type { WidgetSize } from "@/lib/guava/types";
import { UNCATEGORIZED } from "@/lib/guava/uncategorized";
import { cn } from "@/lib/utils";

import { WidgetHeader } from "./widget-header";

const TOP_N = 5;
/** Rows listed in the "+N more" hover card before it gives up and links out. */
const MORE_MAX = 8;

/** Top categories by spend this month, with a hover list of the rest. */
export function CategorySpendWidget({ size }: { size: WidgetSize }) {
  const stats = useCategoryStats();
  const none = useUncategorizedStat();
  const top = stats.slice(0, TOP_N);
  const rest = stats.slice(TOP_N);

  return (
    <>
      <WidgetHeader
        title="Spending by category"
        subtitle={`${stats.length > TOP_N ? `Top ${TOP_N} by spend` : "By spend"} · share of the month`}
        aside={
          <Button variant="outline" size="sm" asChild>
            <Link href="/categories">
              Manage
              <ChevronRight data-icon="inline-end" />
            </Link>
          </Button>
        }
      />
      <div
        className={cn(
          "mt-3.5 grid gap-x-7 gap-y-1.5",
          size === "full"
            ? "grid-cols-[repeat(auto-fill,minmax(260px,1fr))]"
            : "grid-cols-1",
        )}
      >
        {top.map((s) => (
          <CategoryRow key={s.cat.id} stat={s} />
        ))}
        {none.spent > 0 && (
          <SpendRow {...UNCATEGORIZED} spent={none.spent} share={none.share}>
            <Link
              href="/expenses"
              className="self-start text-xs text-ink-3 underline underline-offset-[3px] hover:text-foreground"
            >
              Categorize {plural(none.count, "expense")}
            </Link>
          </SpendRow>
        )}
        {rest.length > 0 && <MoreCategories stats={rest} />}
        {stats.length === 0 && none.spent === 0 && (
          <p className="py-1.5 text-[13px] text-ink-3">
            No categories yet.{" "}
            <Link
              href="/categories"
              className="font-medium text-primary-text underline underline-offset-[3px]"
            >
              Create one
            </Link>{" "}
            to group your spending.
          </p>
        )}
      </div>
    </>
  );
}

/** Swatch, name, `$spent` and `%` of the month, over a share-of-month bar. */
function SpendRow({
  name,
  color,
  spent,
  share,
  dense = false,
  children,
}: {
  name: string;
  color: string;
  spent: number;
  share: number;
  /** The smaller variant used inside the "+N more" hover card. */
  dense?: boolean;
  /** Extra line under the bar. */
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col",
        dense ? "gap-[5px] p-2" : "gap-1.5 py-1.5",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 items-center gap-2",
          dense && "text-[13px]",
        )}
      >
        <CategorySwatch color={color} />
        <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
        <span className="font-medium tabular">{money0Fit(spent, 8)}</span>
        <span
          className={cn(
            "text-right text-xs text-ink-3 tabular",
            !dense && "w-10",
          )}
        >
          {percent(share)}
        </span>
      </div>
      <ProgressBar value={share} max={1} color={color} height={dense ? 4 : 6} />
      {children}
    </div>
  );
}

function CategoryRow({ stat, dense }: { stat: CategoryStat; dense?: boolean }) {
  const { cat, spent, share } = stat;
  return (
    <SpendRow
      name={cat.name}
      color={cat.color}
      spent={spent}
      share={share}
      dense={dense}
    />
  );
}

/** Dotted "+N more categories" that lists the rest on hover. */
function MoreCategories({ stats }: { stats: CategoryStat[] }) {
  const shown = stats.slice(0, MORE_MAX);
  const hidden = stats.length - shown.length;
  return (
    <HoverCard.Root openDelay={0} closeDelay={120}>
      <HoverCard.Trigger asChild>
        <span
          tabIndex={0}
          className="col-span-full mt-1 cursor-default justify-self-start text-[13px] text-ink-3 underline decoration-dotted underline-offset-[3px] outline-none focus-visible:text-foreground"
        >
          +{plural(stats.length, "more category", "more categories")}
        </span>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="bottom"
          align="start"
          alignOffset={-6}
          sideOffset={6}
          className="z-50 w-[290px] rounded-[10px] border bg-popover p-1.5 text-popover-foreground shadow-popover data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
        >
          <div className="flex max-h-[232px] flex-col overflow-y-auto">
            {shown.map((s) => (
              <CategoryRow key={s.cat.id} stat={s} dense />
            ))}
          </div>
          {hidden > 0 && (
            <div className="flex items-center justify-between gap-2 border-t border-muted p-2 text-xs text-ink-3">
              <span>{hidden} more not shown</span>
              <Link
                href="/categories"
                className="font-medium text-primary-text underline underline-offset-[3px]"
              >
                View all
              </Link>
            </div>
          )}
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
