import { afterEach, describe, expect, it, vi } from "vitest";

import { testNeonUrl } from "@/lib/workspace";
import { NEON_SSL_ERROR } from "@/lib/workspace-validation";

const url = process.env.WORKSPACE_URL_INTEGRATION!;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("testNeonUrl", () => {
  it("connects and reports the database", async () => {
    const result = await testNeonUrl(url);
    expect(result).toEqual({
      ok: true,
      details: {
        database: "workspace_integration",
        region: "us-east-2",
        pgVersion: 17,
      },
    });
  });

  // Neon's local proxy doesn't pass Postgres error codes through the way
  // Neon does, so these only check that the connection fails, not which
  // message the user sees.
  it("fails with a wrong password", async () => {
    const wrong = new URL(url);
    wrong.password = "wrong";
    const result = await testNeonUrl(wrong.toString());
    expect(result.ok).toBe(false);
  });

  it("fails for a missing database", async () => {
    const result = await testNeonUrl(
      url.replace("/workspace_integration?", "/missing?"),
    );
    expect(result.ok).toBe(false);
  });

  it("requires SSL", async () => {
    const result = await testNeonUrl(url.replace("?sslmode=require", ""));
    expect(result).toEqual({ ok: false, error: NEON_SSL_ERROR });
  });

  it("refuses the app's own database, pooled or direct", async () => {
    vi.stubEnv(
      "DIRECT_URL",
      url.replace("ep-guava-test.", "ep-guava-test-pooler."),
    );
    const result = await testNeonUrl(url);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/guava’s own database/);
  });
});
