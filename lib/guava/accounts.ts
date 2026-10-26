import type { Account } from "./types";

// Bank accounts (cards, checking, ...) that imported expenses came from.

/** Filter key for expenses typed in by hand, which have no bank or card. */
export const NO_ACCOUNT_KEY = "__none";
export const NO_ACCOUNT_LABEL = "Typed in";

/** The bank's name; also the Bank filter's key. */
export function bankName(a: Account): string {
  return a.bank ?? "Bank";
}

/** The user's nickname for the account, or else the bank's name for it. */
export function accountName(a: Pick<Account, "name" | "nickname">): string {
  return a.nickname ?? a.name;
}

/** "Chase Freedom ••3333": tells apart same-named cards in lists. */
export function accountLabel(a: Account): string {
  return a.mask ? `${accountName(a)} ••${a.mask}` : accountName(a);
}

/**
 * Hover text: the name (and the bank's own name, if renamed), the kind of
 * account and the last 4.
 */
export function accountTitle(a: Account): string {
  return [
    a.nickname ? `${a.nickname} (${a.name})` : a.name,
    a.subtype ?? a.type,
    a.mask && `••${a.mask}`,
  ]
    .filter(Boolean)
    .join(" · ");
}
