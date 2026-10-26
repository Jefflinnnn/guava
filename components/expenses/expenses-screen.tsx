"use client";

import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Page, PageHeader } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { useReviewCount, useTxns } from "@/lib/guava/store";

import { ExpenseDialog } from "./expense-dialog";
import { ExpenseTable } from "./expense-table";
import { ExpensesToolbar } from "./expenses-toolbar";
import { useExpensesView } from "./use-expenses-view";

/** The Expenses page: header, toolbar, the review/reviewed table and the editor. */
export function ExpensesScreen() {
  const txns = useTxns();
  const reviewCount = useReviewCount();
  const view = useExpensesView();

  // `open` is kept apart from the edited id so the dialog's title doesn't
  // flip to "Add" while it animates closed.
  const [editor, setEditor] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  // The header and toolbar stick to the top of the page, and the table's
  // column header sticks right below them, so it needs their height.
  const top = useRef<HTMLDivElement>(null);
  const [topHeight, setTopHeight] = useState(0);
  useEffect(() => {
    const el = top.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setTopHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Page
      width="full"
      style={{ "--expenses-top": `${topHeight}px` } as React.CSSProperties}
    >
      {/* -my/py: the page's padding and gap belong to the block, so rows
          scroll under them instead of showing through. */}
      <div
        ref={top}
        className="sticky top-0 z-20 -mt-6 -mb-5 flex flex-col gap-5 bg-background pt-6 pb-5"
      >
        <PageHeader
          title="Expenses"
          subtitle={`${reviewCount} need review · ${txns.length} total transactions`}
          actions={
            <Button onClick={() => setEditor({ open: true, id: null })}>
              <Plus />
              Add manual expense
            </Button>
          }
        />
        <ExpensesToolbar view={view} />
      </div>
      <ExpenseTable
        view={view}
        onOpen={(t) => setEditor({ open: true, id: t.id })}
      />
      <ExpenseDialog
        open={editor.open}
        onOpenChange={(open) => setEditor((e) => ({ ...e, open }))}
        txnId={editor.id}
        onDelete={(id) => view.deleteExpenses([id])}
      />
    </Page>
  );
}
