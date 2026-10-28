import { randomBytes } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { decrypt, encrypt } from "./crypto";

describe("encrypt / decrypt", () => {
  beforeEach(() => {
    vi.stubEnv("ENCRYPTION_KEY", randomBytes(32).toString("base64"));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips, with a fresh IV each time", () => {
    const secret = "postgresql://user:pw@ep-x.neon.tech/db";
    const a = encrypt(secret);
    const b = encrypt(secret);
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe(secret);
    expect(decrypt(b)).toBe(secret);
  });

  it("rejects tampered ciphertext", () => {
    const [iv, tag, ciphertext] = encrypt("secret").split(".");
    const flipped = Buffer.from(ciphertext, "base64");
    flipped[0] ^= 1;
    expect(() =>
      decrypt([iv, tag, flipped.toString("base64")].join(".")),
    ).toThrow();
  });

  it("can't decrypt with a different key", () => {
    const payload = encrypt("secret");
    vi.stubEnv("ENCRYPTION_KEY", randomBytes(32).toString("base64"));
    expect(() => decrypt(payload)).toThrow();
  });

  it("requires a 32-byte key", () => {
    vi.stubEnv("ENCRYPTION_KEY", randomBytes(16).toString("base64"));
    expect(() => encrypt("secret")).toThrow(/32 bytes/);
    vi.stubEnv("ENCRYPTION_KEY", "");
    expect(() => encrypt("secret")).toThrow(/not set/);
  });
});
