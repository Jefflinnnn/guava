import { describe, expect, it } from "vitest";

import {
  emailError,
  normalizeEmail,
  PASSWORD_MAX,
  passwordOk,
} from "./auth-validation";

describe("emailError", () => {
  it("accepts a normal address", () => {
    expect(emailError(" buzz@example.com ")).toBe("");
  });

  it("rejects empty and malformed addresses", () => {
    expect(emailError("  ")).toBe("Enter your email.");
    expect(emailError("buzz@example")).toMatch(/valid email/);
    expect(emailError("buzz example@x.com")).toMatch(/valid email/);
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Buzz@Example.COM ")).toBe("buzz@example.com");
  });
});

describe("passwordOk", () => {
  it("needs 8+ characters with a letter and a number", () => {
    expect(passwordOk("guava123")).toBe(true);
    expect(passwordOk("guava12")).toBe(false);
    expect(passwordOk("guavaguava")).toBe(false);
    expect(passwordOk("12345678")).toBe(false);
  });

  it("caps the length", () => {
    expect(passwordOk("a1".repeat(PASSWORD_MAX))).toBe(false);
  });
});
