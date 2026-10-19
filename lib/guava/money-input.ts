export type ParseResult<T> =
  { value: T; error?: undefined } | { value?: never; error: string };

export const EXPENSE_CAP_CENTS = 99_999_99;

const NUMBERS_ONLY = "Numbers only — letters and symbols aren’t allowed.";

function capMessage(capCents: number): string {
  return (
    "Maximum is $" +
    (capCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 }) +
    "."
  );
}

/**
 * Right-to-left cents entry (like Zelle): digits fill in from the cents side.
 * Typing 1,2,3,4 gives 0.01 → 0.12 → 1.23 → 12.34. Returns integer cents,
 * or null when empty.
 */
export function parseCentsRTL(
  raw: string,
  capCents: number,
): ParseResult<number | null> {
  if (/[^\d.,$\s]/.test(raw)) return { error: NUMBERS_ONLY };
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "");
  if (!digits) return { value: null };
  const cents = parseInt(digits, 10);
  if (cents > capCents) return { error: capMessage(capCents) };
  return { value: cents };
}

/**
 * Left-to-right dollar entry for the amount filter boxes. Accepts digits and
 * one dot with at most 2 decimals. Returns the cleaned string ("" = unset).
 */
export function parseFilterAmount(
  raw: string,
  capCents = EXPENSE_CAP_CENTS,
): ParseResult<string> {
  const v = raw.replace(/[,$\s]/g, "");
  if (v === "") return { value: "" };
  if (!/^\d*\.?\d*$/.test(v)) return { error: NUMBERS_ONLY };
  const [int, dec = ""] = v.split(".");
  if (dec.length > 2)
    return { error: "No partial cents — use at most 2 decimal places." };
  if (parseFloat(v) * 100 > capCents) return { error: capMessage(capCents) };
  return {
    value: int.replace(/^0+(?=\d)/, "") + (v.includes(".") ? "." + dec : ""),
  };
}

/** Converts a filter-box dollar string to cents (NaN when unset). */
export function filterAmountToCents(v: string): number {
  const n = parseFloat(v);
  return isNaN(n) ? NaN : Math.round(n * 100);
}
