import { describe, expect, it } from "vitest";

import {
  generateVerificationId,
  isVerificationId,
  normalizeVerificationId,
} from "@/lib/verification/id";

describe("generateVerificationId", () => {
  it("matches the documented PC-XXXXXX shape", () => {
    expect(generateVerificationId()).toMatch(/^PC-[2-9A-HJ-NP-Z]{6}$/);
  });

  it("never emits characters that are easily misread", () => {
    // 0/O and 1/I/L are excluded because these ids get read aloud and typed
    // from printed paper.
    const sample = Array.from({ length: 400 }, generateVerificationId).join("");
    expect(sample).not.toMatch(/[01OIL]/);
  });

  it("produces distinct ids", () => {
    const ids = new Set(Array.from({ length: 1000 }, generateVerificationId));
    // 31^6 possibilities, so 1000 draws should collide vanishingly rarely.
    expect(ids.size).toBeGreaterThan(995);
  });
});

describe("isVerificationId", () => {
  it("accepts a canonical id", () => {
    expect(isVerificationId("PC-8F29A2")).toBe(true);
  });

  it.each([
    ["lowercase", "pc-8f29a2"],
    ["missing hyphen", "PC8F29A2"],
    ["wrong prefix", "XX-8F29A2"],
    ["too short", "PC-8F29A"],
    ["too long", "PC-8F29A22"],
    ["excluded character", "PC-8F29A0"],
    ["empty", ""],
  ])("rejects %s", (_label, value) => {
    expect(isVerificationId(value)).toBe(false);
  });
});

describe("normalizeVerificationId", () => {
  it.each([
    "pc-8f29a2",
    "PC8F29A2",
    "  PC-8F29A2  ",
    "8F29A2",
    "pc 8f29 a2",
  ])("canonicalises %s", (input) => {
    expect(normalizeVerificationId(input)).toBe("PC-8F29A2");
  });

  it("returns null for something that cannot be an id", () => {
    expect(normalizeVerificationId("not-an-id")).toBeNull();
    expect(normalizeVerificationId("PC-000000")).toBeNull();
    expect(normalizeVerificationId("")).toBeNull();
  });
});
