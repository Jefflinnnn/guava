"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

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

  return (
    <Page width="full">
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
      <ExpenseTable
        view={view}
        onOpen={(t) => setEditor({ open: true, id: t.id })}
      />
      <ExpenseDialog
        open={editor.open}
        onOpenChange={(open) => setEditor((e) => ({ ...e, open }))}
        txnId={editor.id}
      />
    </Page>
  );
}
