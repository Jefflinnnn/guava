import { useState } from "react";

/**
 * Returns `value`, or the last non-null value once it turns null. Keeps a
 * confirm dialog's text steady while it animates out after its subject has
 * been deleted. `value` must be referentially stable (memoize it).
 */
export function useRetained<T>(value: T | null): T | null {
  const [kept, setKept] = useState(value);
  if (value != null && value !== kept) setKept(value);
  return value ?? kept;
}
