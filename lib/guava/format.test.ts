import { describe, expect, it } from "vitest";

import {
  calendarAmount,
  compact,
  initialsOf,
  money,
  money0,
  plural,
  timeAgo,
} from "./format";

describe("money", () => {
  it("formats cents as dollars with separators", () => {
    expect(money(123456)).toBe("$1,234.56");
    expect(money(5)).toBe("$0.05");
    expect(money(-2500)).toBe("-$25.00");
  });

  it("rounds to whole dollars in money0", () => {
    expect(money0(123456)).toBe("$1,235");
    expect(money0(-149)).toBe("-$1");
  });
});

describe("compact", () => {
  it("keeps small amounts whole", () => {
    expect(compact(99_900)).toBe("$999");
  });

  it("adds a unit and drops decimals until it fits", () => {
    expect(compact(123_456)).toBe("$1.23K");
    expect(compact(12_500_000)).toBe("$125.0K");
    expect(compact(12_500_000, 6)).toBe("$125K");
    expect(compact(123_456, 5)).toBe("$1.2K");
  });

  it("moves to the next unit instead of showing 1000K", () => {
    expect(compact(99_999_999)).toBe("$1.00M");
  });

  it("never drops the unit letter", () => {
    expect(calendarAmount(4_800)).toBe("$48");
    expect(calendarAmount(123_456)).toBe("$1.2K");
  });
});

describe("plural", () => {
  it("picks the singular only for one", () => {
    expect(plural(1, "day")).toBe("1 day");
    expect(plural(0, "day")).toBe("0 days");
    expect(plural(2, "category", "categories")).toBe("2 categories");
  });
});

describe("initialsOf", () => {
  it("takes up to two initials", () => {
    expect(initialsOf("Buzz Peterson")).toBe("BP");
    expect(initialsOf("  ada  lovelace byron ")).toBe("AL");
    expect(initialsOf("   ")).toBe("?");
  });
});

describe("timeAgo", () => {
  const now = Date.parse("2026-10-27T12:00:00Z");
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it("steps through minutes, hours and days", () => {
    expect(timeAgo(ago(30_000), now)).toBe("just now");
    expect(timeAgo(ago(5 * 60_000), now)).toBe("5 min ago");
    expect(timeAgo(ago(3 * 3_600_000), now)).toBe("3 hr ago");
    expect(timeAgo(ago(2 * 86_400_000), now)).toBe("2 days ago");
  });
});
