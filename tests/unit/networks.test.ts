import { describe, expect, it } from "vitest";

import {
  BASE_SEPOLIA,
  addressUrl,
  networkForChainId,
  transactionUrl,
} from "@/lib/blockchain/networks";

describe("network lookup", () => {
  it("resolves Base Sepolia by chain id", () => {
    expect(networkForChainId(84532)).toEqual(BASE_SEPOLIA);
  });

  it("returns null for an unknown or absent chain", () => {
    expect(networkForChainId(1)).toBeNull();
    expect(networkForChainId(null)).toBeNull();
    expect(networkForChainId(undefined)).toBeNull();
  });
});

describe("explorer links", () => {
  it("builds a transaction URL", () => {
    expect(transactionUrl(84532, "0xabc")).toBe(
      "https://sepolia.basescan.org/tx/0xabc",
    );
  });

  it("builds an address URL", () => {
    expect(addressUrl(84532, "0xdef")).toBe(
      "https://sepolia.basescan.org/address/0xdef",
    );
  });

  it("returns null when the chain is unknown, rather than a broken link", () => {
    expect(transactionUrl(999, "0xabc")).toBeNull();
    expect(addressUrl(null, "0xdef")).toBeNull();
  });
});
