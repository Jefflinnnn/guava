"use client";

/**
 * New / Edit category dialog. Used by the Categories page and the Dashboard's
 * "Add category" button.
 *
 * Contract (fixed; implemented by the Categories work):
 * - `categoryId` omitted/null → "New category"; otherwise edits that category.
 * - Deleting closes this dialog and opens the "Are you sure?" confirm.
 */
export type CategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId?: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CategoryDialog(props: CategoryDialogProps) {
  return null;
}
