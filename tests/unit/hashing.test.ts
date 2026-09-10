import { describe, expect, it } from "vitest";

import { isSha256Hex, sha256, toBytes32 } from "@/lib/services/hashing";

const encode = (value: string) => new TextEncoder().encode(value);

describe("sha256", () => {
  it("matches the known digest of an empty input", () => {
    expect(sha256(new Uint8Array())).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("matches the known digest of 'abc'", () => {
    expect(sha256(encode("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("is deterministic for identical bytes", () => {
    expect(sha256(encode("%PDF-1.7 contract"))).toBe(
      sha256(encode("%PDF-1.7 contract")),
    );
  });

  it("changes completely when a single character changes", () => {
    const original = sha256(encode("Invoice total: 1000"));
    const tampered = sha256(encode("Invoice total: 9000"));
    expect(tampered).not.toBe(original);
  });

  it("always produces 64 lowercase hex characters", () => {
    expect(sha256(encode("anything"))).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("isSha256Hex", () => {
  it("accepts a valid digest", () => {
    expect(isSha256Hex("a".repeat(64))).toBe(true);
  });

  it("rejects wrong lengths, uppercase and non-hex", () => {
    expect(isSha256Hex("a".repeat(63))).toBe(false);
    expect(isSha256Hex("A".repeat(64))).toBe(false);
    expect(isSha256Hex("z".repeat(64))).toBe(false);
  });
});

describe("toBytes32", () => {
  it("prefixes a valid digest for on-chain use", () => {
    expect(toBytes32("a".repeat(64))).toBe(`0x${"a".repeat(64)}`);
  });

  it("refuses anything that is not a digest", () => {
    expect(() => toBytes32("not-a-hash")).toThrow();
  });
});
