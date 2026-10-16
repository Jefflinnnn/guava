"use client";

import { useMemo } from "react";

import { ConfirmDeleteDialog } from "@/components/guava/confirm-delete-dialog";
import { useActions, useCatById, useTxns } from "@/lib/guava/store";

import { useRetained } from "./use-retained";

/** "Are you sure?" for a subcategory. Its expenses keep the parent category. */
export function DeleteSubcategoryDialog({
  open,
  onOpenChange,
  categoryId,
  subId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string | null;
  subId: string | null;
}) {
  const catById = useCatById();
  const txns = useTxns();
  const { deleteSub } = useActions();

  const info = useMemo(() => {
    const cat = categoryId ? catById.get(categoryId) : undefined;
    const sub = cat?.subs.find((s) => s.id === subId);
    if (!cat || !sub) return null;
    return {
      cat,
      sub,
      used: txns.filter((t) => t.catId === cat.id && t.subId === sub.id).length,
    };
  }, [catById, txns, categoryId, subId]);
  const shown = useRetained(info);

  if (!shown) return null;
  const { cat, sub, used } = shown;

  return (
    <ConfirmDeleteDialog
      open={open && !!info}
      onOpenChange={onOpenChange}
      description={
        <>
          “{sub.name}” will be removed from {cat.name}.{" "}
          {used
            ? `${used} ${used === 1 ? "expense keeps" : "expenses keep"} the ${cat.name} category but lose this subcategory.`
            : "No expenses use it."}
        </>
      }
      confirmLabel="Delete subcategory"
      onConfirm={() => {
        onOpenChange(false);
        deleteSub(cat.id, sub.id);
      }}
    />
  );
}
