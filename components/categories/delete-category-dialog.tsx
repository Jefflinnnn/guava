"use client";

import { useMemo, useState } from "react";

import { Chip } from "@/components/guava/chip";
import { ConfirmDeleteDialog } from "@/components/guava/confirm-delete-dialog";
import { plural } from "@/lib/guava/format";
import { useActions, useCategories, useTxns } from "@/lib/guava/store";
import { UNCATEGORIZED } from "@/lib/guava/uncategorized";

import { useRetained } from "./use-retained";

type DeleteCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string | null;
};

/**
 * "Are you sure?" for a category. Its expenses become uncategorized, or move
 * to another category chosen with chips.
 */
export function DeleteCategoryDialog(props: DeleteCategoryDialogProps) {
  // Re-keying resets the chosen destination for each category.
  return <DeleteCategoryConfirm key={props.categoryId ?? ""} {...props} />;
}

function DeleteCategoryConfirm({
  open,
  onOpenChange,
  categoryId,
}: DeleteCategoryDialogProps) {
  const cats = useCategories();
  const txns = useTxns();
  const { deleteCat } = useActions();

  const info = useMemo(() => {
    const cat = cats.find((c) => c.id === categoryId);
    if (!cat) return null;
    return {
      cat,
      used: txns.filter((t) => t.catId === cat.id).length,
      others: cats.filter((c) => c.id !== cat.id),
    };
  }, [cats, txns, categoryId]);
  const shown = useRetained(info);

  // null = leave them uncategorized.
  const [moveTo, setMoveTo] = useState<string | null>(null);

  if (!shown) return null;
  const { cat, used, others } = shown;

  return (
    <ConfirmDeleteDialog
      open={open && !!info}
      onOpenChange={onOpenChange}
      description={
        <>
          “{cat.name}” and its subcategories will be permanently deleted.{" "}
          {used === 0
            ? "No expenses use it."
            : `Its ${plural(used, "expense")} will move to:`}
        </>
      }
      confirmLabel="Delete category"
      onConfirm={() => {
        onOpenChange(false);
        deleteCat(cat.id, used ? moveTo : null);
      }}
    >
      {used > 0 && (
        <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
          <Chip
            color={UNCATEGORIZED.color}
            selected={moveTo == null}
            onClick={() => setMoveTo(null)}
          >
            {UNCATEGORIZED.name}
          </Chip>
          {others.map((c) => (
            <Chip
              key={c.id}
              color={c.color}
              selected={moveTo === c.id}
              onClick={() => setMoveTo(c.id)}
            >
              {c.name}
            </Chip>
          ))}
        </div>
      )}
    </ConfirmDeleteDialog>
  );
}
