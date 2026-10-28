import { describe, expect, it } from "vitest";

import {
  EXPENSE_CAP_CENTS,
  filterAmountToCents,
  parseCentsRTL,
  parseFilterAmount,
} from "./money-input";

describe("parseCentsRTL", () => {
  it("fills digits in from the cents side", () => {
    expect(parseCentsRTL("1", EXPENSE_CAP_CENTS)).toEqual({ value: 1 });
    expect(parseCentsRTL("1,234", EXPENSE_CAP_CENTS)).toEqual({ value: 1234 });
    expect(parseCentsRTL("$12.34", EXPENSE_CAP_CENTS)).toEqual({
      value: 1234,
    });
  });

  it("treats empty or all-zero input as no amount", () => {
    expect(parseCentsRTL("", EXPENSE_CAP_CENTS)).toEqual({ value: null });
    expect(parseCentsRTL("0.00", EXPENSE_CAP_CENTS)).toEqual({ value: null });
  });

  it("rejects letters and amounts over the cap", () => {
    expect(parseCentsRTL("12a", EXPENSE_CAP_CENTS).error).toMatch(
      /Numbers only/,
    );
    expect(parseCentsRTL("10001", 10000).error).toBe("Maximum is $100.00.");
  });
});

describe("parseFilterAmount", () => {
  it("cleans dollar strings", () => {
    expect(parseFilterAmount("$1,200")).toEqual({ value: "1200" });
    expect(parseFilterAmount("007.5")).toEqual({ value: "7.5" });
    expect(parseFilterAmount("")).toEqual({ value: "" });
  });

  it("rejects partial cents, letters and amounts over the cap", () => {
    expect(parseFilterAmount("1.234").error).toMatch(/No partial cents/);
    expect(parseFilterAmount("1e3").error).toMatch(/Numbers only/);
    expect(parseFilterAmount("100000").error).toMatch(/Maximum is/);
  });

  it("converts to cents, NaN when unset", () => {
    expect(filterAmountToCents("12.34")).toBe(1234);
    expect(filterAmountToCents("")).toBeNaN();
  });
});
