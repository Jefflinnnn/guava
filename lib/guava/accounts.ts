import type { Account } from "./types";

// Bank accounts (cards, checking, ...) that imported expenses came from.

/** Filter key for expenses typed in by hand, which have no bank or card. */
export const NO_ACCOUNT_KEY = "__none";
export const NO_ACCOUNT_LABEL = "Typed in";

/** The bank's name; also the Bank filter's key. */
export function bankName(a: Account): string {
  return a.bank ?? "Bank";
}

/** "Credit Card ••3333": tells apart same-named cards in lists. */
export function accountLabel(a: Account): string {
  return a.mask ? `${a.name} ••${a.mask}` : a.name;
}

/** Hover text: the full name, the kind of account and the last 4. */
export function accountTitle(a: Account): string {
  return [a.name, a.subtype ?? a.type, a.mask && `••${a.mask}`]
    .filter(Boolean)
    .join(" · ");
}
