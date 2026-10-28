import { describe, expect, it } from "vitest";

import {
  neonRegionOf,
  neonUrlError,
  neonUrlHasSsl,
  stripWhitespace,
} from "./workspace-validation";

const VALID =
  "postgresql://alex:secret@ep-cool-river-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require";

describe("neonUrlError", () => {
  it("accepts a Neon connection string", () => {
    expect(neonUrlError(VALID)).toBe("");
    expect(neonUrlError(VALID.replace("postgresql", "postgres"))).toBe("");
  });

  it("explains what's wrong, in order", () => {
    expect(neonUrlError("")).toMatch(/Paste/);
    expect(neonUrlError("mysql://a:b@x.neon.tech/db")).toMatch(
      /start with postgresql/,
    );
    expect(neonUrlError("postgresql://a:b@db.example.com/db")).toMatch(
      /isn’t a Neon host/,
    );
    expect(neonUrlError("postgresql://alex@ep-x.neon.tech/neondb")).toMatch(
      /user, password, host and database/,
    );
  });
});

describe("neonUrlHasSsl", () => {
  it("requires sslmode=require", () => {
    expect(neonUrlHasSsl(VALID)).toBe(true);
    expect(neonUrlHasSsl(VALID + "&channel_binding=require")).toBe(true);
    expect(neonUrlHasSsl(VALID.replace("?sslmode=require", ""))).toBe(false);
    expect(neonUrlHasSsl(VALID.replace("require", "prefer"))).toBe(false);
  });
});

describe("neonRegionOf", () => {
  it("reads the region, including hosts with a cell segment", () => {
    expect(neonRegionOf(VALID)).toBe("us-east-2");
    expect(
      neonRegionOf(
        "postgresql://a:b@ep-x-pooler.c-6.eu-central-1.aws.neon.tech/db",
      ),
    ).toBe("eu-central-1");
    expect(neonRegionOf("postgresql://a:b@ep-x.neon.tech/db")).toBe("neon");
  });
});

describe("stripWhitespace", () => {
  it("removes pasted whitespace and caps the length", () => {
    expect(stripWhitespace(" postgres://a\n:b@c ", 100)).toBe(
      "postgres://a:b@c",
    );
    expect(stripWhitespace("abcdef", 3)).toBe("abc");
  });
});
