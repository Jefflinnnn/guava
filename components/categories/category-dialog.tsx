"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

import { CharCountInput } from "@/components/guava/char-count-input";
import { Field } from "@/components/guava/field";
import { SwitchRow } from "@/components/guava/switch-row";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CATEGORY_COLORS } from "@/lib/guava/colors";
import { useActions, useCategories } from "@/lib/guava/store";

import { ColorPicker } from "./color-picker";
import { DeleteCategoryDialog } from "./delete-category-dialog";
import { FormDialogFooter } from "./form-dialog-footer";

export const NAME_MAX = 24;

/**
 * New / Edit category dialog. Used by the Categories page and the Dashboard's
 * "Add category" button.
 *
 * - `categoryId` omitted/null → "New category"; otherwise edits that category.
 * - Deleting closes this dialog and opens the "Are you sure?" confirm, which
 *   this component owns — keep it mounted (toggle `open`, don't unmount it).
 */
export type CategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId?: string | null;
};

export function CategoryDialog({
  open,
  onOpenChange,
  categoryId = null,
}: CategoryDialogProps) {
  const [confirm, setConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[440px]">
          {/* Content unmounts while closed, so each open starts a fresh draft. */}
          <CategoryForm
            key={categoryId ?? "new"}
            categoryId={categoryId}
            onDone={() => onOpenChange(false)}
            onDelete={(id) => {
              onOpenChange(false);
              setConfirm({ open: true, id });
            }}
          />
        </DialogContent>
      </Dialog>
      <DeleteCategoryDialog
        open={confirm.open}
        onOpenChange={(o) => setConfirm((c) => ({ ...c, open: o }))}
        categoryId={confirm.id}
      />
    </>
  );
}

type CategoryDraft = {
  name: string;
  color: string;
  locked: boolean;
};

function CategoryForm({
  categoryId,
  onDone,
  onDelete,
}: {
  categoryId: string | null;
  onDone: () => void;
  onDelete: (id: string) => void;
}) {
  const cats = useCategories();
  const { upsertCat } = useActions();
  const orig = categoryId ? cats.find((c) => c.id === categoryId) : undefined;

  const [draft, setDraft] = useState<CategoryDraft>(() =>
    orig
      ? {
          name: orig.name,
          color: orig.color,
          locked: orig.locked,
        }
      : {
          name: "",
          color: CATEGORY_COLORS[5],
          locked: false,
        },
  );
  const [nameError, setNameError] = useState("");
  const update = (patch: Partial<CategoryDraft>) =>
    setDraft((d) => ({ ...d, ...patch }));

  // Locked categories can only be unlocked; nothing else is editable.
  const lockedView = !!orig?.locked && draft.locked;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedView) return onDone();
    const name = draft.name.trim();
    const error = !name
      ? "Give the category a name."
      : cats.some(
            (c) =>
              c.id !== orig?.id && c.name.toLowerCase() === name.toLowerCase(),
          )
        ? "A category with this name already exists."
        : "";
    if (error) return setNameError(error);
    upsertCat({
      id: orig?.id ?? null,
      name,
      color: draft.color,
      locked: draft.locked,
    });
    onDone();
  };

  return (
    <form onSubmit={save} className="grid gap-5">
      <DialogHeader>
        <DialogTitle>{orig ? "Edit category" : "New category"}</DialogTitle>
        <DialogDescription>
          {orig
            ? "Rename or recolor."
            : "Group expenses to see where your money goes."}
        </DialogDescription>
      </DialogHeader>

      {lockedView && (
        <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5 text-[13px] text-ink-2">
          <Lock className="size-3.5 flex-none" />
          This category is locked. Turn off the lock below to make changes.
        </p>
      )}

      <fieldset
        disabled={lockedView}
        className="grid min-w-0 gap-4 disabled:opacity-50"
      >
        <CharCountInput
          label="Name"
          value={draft.name}
          max={NAME_MAX}
          placeholder="e.g. Groceries"
          error={nameError}
          onChange={(name) => {
            update({ name });
            setNameError("");
          }}
        />
        <Field label="Color">
          <ColorPicker
            value={draft.color}
            onChange={(color) => update({ color })}
          />
        </Field>
      </fieldset>

      <SwitchRow
        bordered
        icon={<Lock />}
        title="Lock category"
        description="Prevents renaming, recoloring and deletion."
        checked={draft.locked}
        onCheckedChange={(locked) => update({ locked })}
      />

      <FormDialogFooter
        saveLabel={orig ? "Save" : "Create"}
        onDelete={orig && !draft.locked ? () => onDelete(orig.id) : undefined}
      />
    </form>
  );
}
