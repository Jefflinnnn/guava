import { useState } from "react";

/**
 * Open state plus the thing a dialog acts on. The target outlives `open`, so
 * the dialog keeps its content while it animates closed.
 */
export function useDialogTarget<T>(initial: T) {
  const [state, setState] = useState({ open: false, target: initial });
  return {
    open: state.open,
    target: state.target,
    show: (target: T) => setState({ open: true, target }),
    onOpenChange: (open: boolean) => setState((s) => ({ ...s, open })),
  };
}
