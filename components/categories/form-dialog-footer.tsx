"use client";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";

/** Dialog form footer: optional red "Delete" on the left, Cancel + submit on the right. */
export function FormDialogFooter({
  saveLabel,
  onDelete,
}: {
  saveLabel: React.ReactNode;
  /** Shows the Delete button when set. */
  onDelete?: () => void;
}) {
  return (
    <DialogFooter>
      {onDelete && (
        <Button
          type="button"
          variant="destructive"
          className="sm:mr-auto"
          onClick={onDelete}
        >
          Delete
        </Button>
      )}
      <DialogClose asChild>
        <Button type="button" variant="outline">
          Cancel
        </Button>
      </DialogClose>
      <Button type="submit">{saveLabel}</Button>
    </DialogFooter>
  );
}
