import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("never stores the plaintext password", async () => {
    const hash = await hashPassword("ProofChain123");
    expect(hash).not.toContain("ProofChain123");
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("accepts the correct password", async () => {
    const hash = await hashPassword("ProofChain123");
    await expect(verifyPassword("ProofChain123", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("ProofChain123");
    await expect(verifyPassword("proofchain123", hash)).resolves.toBe(false);
  });

  it("salts each hash, so identical passwords differ", async () => {
    const [first, second] = await Promise.all([
      hashPassword("ProofChain123"),
      hashPassword("ProofChain123"),
    ]);
    expect(first).not.toEqual(second);
  });
});
