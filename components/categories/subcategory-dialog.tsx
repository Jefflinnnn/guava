"use client";

import { useState } from "react";

import { CategorySwatch } from "@/components/guava/category-swatch";
import { CharCountInput } from "@/components/guava/char-count-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useActions, useCatById } from "@/lib/guava/store";
import type { Cat } from "@/lib/guava/types";

import { NAME_MAX } from "./category-dialog";
import { DeleteSubcategoryDialog } from "./delete-subcategory-dialog";
import { FormDialogFooter } from "./form-dialog-footer";

/**
 * New / Edit subcategory dialog. `subId` null → "New subcategory" in
 * `categoryId`. Works even when the parent category is locked. Deleting
 * closes this dialog and opens its own "Are you sure?" confirm.
 */
export function SubcategoryDialog({
  open,
  onOpenChange,
  categoryId,
  subId = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string | null;
  subId?: string | null;
}) {
  const cat = useCatById().get(categoryId ?? "");
  const [confirm, setConfirm] = useState<{
    open: boolean;
    catId: string | null;
    subId: string | null;
  }>({ open: false, catId: null, subId: null });

  return (
    <>
      <Dialog open={open && !!cat} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[400px]">
          {cat && (
            <SubcategoryForm
              key={`${cat.id}/${subId ?? "new"}`}
              cat={cat}
              subId={subId}
              onDone={() => onOpenChange(false)}
              onDelete={(id) => {
                onOpenChange(false);
                setConfirm({ open: true, catId: cat.id, subId: id });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <DeleteSubcategoryDialog
        open={confirm.open}
        onOpenChange={(o) => setConfirm((c) => ({ ...c, open: o }))}
        categoryId={confirm.catId}
        subId={confirm.subId}
      />
    </>
  );
}

function SubcategoryForm({
  cat,
  subId,
  onDone,
  onDelete,
}: {
  cat: Cat;
  subId: string | null;
  onDone: () => void;
  onDelete: (subId: string) => void;
}) {
  const { upsertSub } = useActions();
  const orig = subId ? cat.subs.find((s) => s.id === subId) : undefined;

  const [name, setName] = useState(orig?.name ?? "");
  const [nameError, setNameError] = useState("");

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    const error = !trimmed
      ? "Give the subcategory a name."
      : cat.subs.some(
            (s) =>
              s.id !== orig?.id &&
              s.name.toLowerCase() === trimmed.toLowerCase(),
          )
        ? `That subcategory already exists in ${cat.name}.`
        : "";
    if (error) return setNameError(error);
    upsertSub(cat.id, {
      id: orig?.id ?? null,
      name: trimmed,
    });
    onDone();
  };

  return (
    <form onSubmit={save} className="grid gap-5">
      <DialogHeader>
        <DialogTitle>
          {orig ? "Edit subcategory" : "New subcategory"}
        </DialogTitle>
        <DialogDescription className="flex min-w-0 items-center gap-1.5">
          <CategorySwatch color={cat.color} />
          <span className="truncate">In {cat.name}</span>
        </DialogDescription>
      </DialogHeader>

      <CharCountInput
        label="Name"
        value={name}
        max={NAME_MAX}
        placeholder="e.g. Internet"
        error={nameError}
        onChange={(v) => {
          setName(v);
          setNameError("");
        }}
      />

      <FormDialogFooter
        saveLabel={orig ? "Save" : "Add"}
        onDelete={orig ? () => onDelete(orig.id) : undefined}
      />
    </form>
  );
}
