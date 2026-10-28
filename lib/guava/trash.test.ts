import { describe, expect, it } from "vitest";

import { daysLeft, restoredTxn, TRASH_DAYS } from "./trash";
import type { DeletedTxn } from "./types";

describe("daysLeft", () => {
  const deletedAt = "2026-10-01T09:00:00.000Z";
  const at = (days: number) => Date.parse(deletedAt) + days * 86_400_000;

  it("counts down from the deletion time, rounding up", () => {
    expect(daysLeft(deletedAt, at(0))).toBe(TRASH_DAYS);
    expect(daysLeft(deletedAt, at(0.5))).toBe(TRASH_DAYS);
    expect(daysLeft(deletedAt, at(29.9))).toBe(1);
  });

  it("never goes below zero", () => {
    expect(daysLeft(deletedAt, at(30))).toBe(0);
    expect(daysLeft(deletedAt, at(45))).toBe(0);
  });
});

describe("restoredTxn", () => {
  it("drops deletedAt and keeps everything else", () => {
    const deleted = {
      id: "t1",
      deletedAt: "2026-10-01T09:00:00.000Z",
    } as unknown as DeletedTxn;
    const restored = restoredTxn(deleted);
    expect(restored).toEqual({ id: "t1" });
    expect(deleted.deletedAt).toBeDefined();
  });
});
