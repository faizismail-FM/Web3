import { describe, expect, it } from "vitest";

import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from "@/lib/validation/auth";

describe("registerSchema", () => {
  const valid = {
    name: "Faiz Ismail",
    email: "Faiz@Example.COM",
    password: "ProofChain123",
    organizationName: "FM Global Logistics",
  };

  it("normalises the email to lower case", () => {
    expect(registerSchema.parse(valid).email).toBe("faiz@example.com");
  });

  it("trims surrounding whitespace", () => {
    const parsed = registerSchema.parse({ ...valid, name: "  Faiz Ismail  " });
    expect(parsed.name).toBe("Faiz Ismail");
  });

  it.each([
    ["too short", "Short1"],
    ["no uppercase", "proofchain123"],
    ["no lowercase", "PROOFCHAIN123"],
    ["no digit", "ProofChainPass"],
  ])("rejects a password that is %s", (_label, password) => {
    expect(registerSchema.safeParse({ ...valid, password }).success).toBe(false);
  });

  it("rejects a malformed email", () => {
    expect(
      registerSchema.safeParse({ ...valid, email: "not-an-email" }).success,
    ).toBe(false);
  });

  it("requires an organization name", () => {
    expect(
      registerSchema.safeParse({ ...valid, organizationName: "" }).success,
    ).toBe(false);
  });
});

describe("loginSchema", () => {
  it("does not impose password complexity on sign-in", () => {
    const result = loginSchema.safeParse({
      email: "faiz@example.com",
      password: "x",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateProfileSchema", () => {
  it("accepts a well-formed wallet address", () => {
    const result = updateProfileSchema.safeParse({
      name: "Faiz Ismail",
      walletAddress: "0x82F1e4a90D3b2c1A5e6F7890aBcDeF1234567891",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty wallet address, meaning 'not connected'", () => {
    const result = updateProfileSchema.safeParse({
      name: "Faiz Ismail",
      walletAddress: "",
    });
    expect(result.success).toBe(true);
  });

  it.each(["0x123", "82F1e4a90D3b2c1A5e6F7890aBcDeF1234567891", "0xZZZZ"])(
    "rejects the malformed wallet address %s",
    (walletAddress) => {
      const result = updateProfileSchema.safeParse({
        name: "Faiz Ismail",
        walletAddress,
      });
      expect(result.success).toBe(false);
    },
  );
});
