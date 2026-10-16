"use client";

import { useMemo, useState } from "react";

import { Chip } from "@/components/guava/chip";
import { ConfirmDeleteDialog } from "@/components/guava/confirm-delete-dialog";
import { plural } from "@/lib/guava/format";
import { useActions, useCategories, useTxns } from "@/lib/guava/store";
import type { Cat } from "@/lib/guava/types";

import { useRetained } from "./use-retained";

type DeleteCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string | null;
};

/**
 * "Are you sure?" for a category. Its expenses move to a destination chosen
 * with chips (defaults to "Other", else the first category).
 */
export function DeleteCategoryDialog(props: DeleteCategoryDialogProps) {
  // Re-keying resets the chosen destination for each category.
  return <DeleteCategoryConfirm key={props.categoryId ?? ""} {...props} />;
}

function defaultDestination(others: Cat[]): string | null {
  return (
    others.find((c) => c.id === "other" || c.name.toLowerCase() === "other")
      ?.id ??
    others[0]?.id ??
    null
  );
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

  const [moveTo, setMoveTo] = useState(() =>
    info ? defaultDestination(info.others) : null,
  );

  if (!shown) return null;
  const { cat, used, others } = shown;
  const canMove = used > 0 && others.length > 0;

  return (
    <ConfirmDeleteDialog
      open={open && !!info}
      onOpenChange={onOpenChange}
      description={
        <>
          “{cat.name}” and its subcategories will be permanently deleted.{" "}
          {used === 0
            ? "No expenses use it."
            : others.length
              ? `Its ${plural(used, "expense")} will move to:`
              : `It’s your only category and ${plural(used, "expense")} use it — create another category first.`}
        </>
      }
      confirmLabel="Delete category"
      confirmDisabled={used > 0 && (!others.length || !moveTo)}
      onConfirm={() => {
        onOpenChange(false);
        deleteCat(cat.id, used ? moveTo : null);
      }}
    >
      {canMove && (
        <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
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
