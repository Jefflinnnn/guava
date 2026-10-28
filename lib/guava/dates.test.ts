import { describe, expect, it } from "vitest";

import {
  addDays,
  addMonths,
  clampMonth,
  daysInMonth,
  firstWeekday,
  formatLongDate,
  isDateKey,
  isInMonth,
} from "./dates";

describe("isDateKey", () => {
  it("accepts real calendar dates only", () => {
    expect(isDateKey("2026-10-27")).toBe(true);
    expect(isDateKey("2028-02-29")).toBe(true);
    expect(isDateKey("2026-02-29")).toBe(false);
    expect(isDateKey("2026-1-5")).toBe(false);
    expect(isDateKey(20261027)).toBe(false);
  });
});

describe("date arithmetic", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(addMonths({ year: 2026, month: 11 }, 1)).toEqual({
      year: 2027,
      month: 0,
    });
    expect(addMonths({ year: 2026, month: 0 }, -1)).toEqual({
      year: 2025,
      month: 11,
    });
  });

  it("is safe across daylight saving changes", () => {
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02");
  });
});

describe("months", () => {
  it("knows month lengths, including leap years", () => {
    expect(daysInMonth({ year: 2028, month: 1 })).toBe(29);
    expect(daysInMonth({ year: 2026, month: 1 })).toBe(28);
    expect(daysInMonth({ year: 2026, month: 9 })).toBe(31);
  });

  it("finds the weekday of the 1st", () => {
    // October 1, 2026 is a Thursday.
    expect(firstWeekday({ year: 2026, month: 9 })).toBe(4);
  });

  it("clamps to a range", () => {
    const min = { year: 2026, month: 0 };
    const max = { year: 2026, month: 11 };
    expect(clampMonth({ year: 2025, month: 6 }, min, max)).toBe(min);
    expect(clampMonth({ year: 2027, month: 1 }, min, max)).toBe(max);
  });

  it("matches keys to their month", () => {
    expect(isInMonth("2026-10-27", { year: 2026, month: 9 })).toBe(true);
    expect(isInMonth("2026-01-27", { year: 2026, month: 0 })).toBe(true);
    expect(isInMonth("2026-11-01", { year: 2026, month: 9 })).toBe(false);
  });
});

describe("formatLongDate", () => {
  it("includes the weekday", () => {
    expect(formatLongDate("2026-10-04")).toBe("Sun, Oct 4, 2026");
  });
});
