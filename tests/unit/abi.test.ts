import { describe, expect, it } from "vitest";
import {
  decodeEventLog,
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionData,
} from "viem";

import { PROOF_CHAIN_REGISTRY_ABI } from "@/lib/blockchain/abi";

/**
 * The ABI is generated from the compiled contract. These tests exist to catch a
 * regeneration that silently changed the shape the application encodes against.
 */
describe("ProofChainRegistry ABI", () => {
  it("exposes registerDocument with the expected signature", () => {
    const entry = PROOF_CHAIN_REGISTRY_ABI.find(
      (item) => item.type === "function" && item.name === "registerDocument",
    );

    expect(entry).toBeDefined();
    expect(entry && "inputs" in entry ? entry.inputs.map((i) => i.type) : []).toEqual([
      "bytes32",
      "string",
    ]);
  });

  it("exposes the DocumentRegistered event with indexed hash and issuer", () => {
    const entry = PROOF_CHAIN_REGISTRY_ABI.find(
      (item) => item.type === "event" && item.name === "DocumentRegistered",
    );

    expect(entry).toBeDefined();
    if (!entry || !("inputs" in entry)) return;

    expect(entry.inputs.map((i) => i.name)).toEqual([
      "documentHash",
      "issuer",
      "verificationId",
      "timestamp",
    ]);
    // Indexed so a proof can be found by document or by issuer without
    // scanning every log.
    expect(entry.inputs.filter((i) => "indexed" in i && i.indexed).map((i) => i.name))
      .toEqual(["documentHash", "issuer"]);
  });

  it("encodes a registration call", () => {
    const data = encodeFunctionData({
      abi: PROOF_CHAIN_REGISTRY_ABI,
      functionName: "registerDocument",
      args: [`0x${"a".repeat(64)}`, "PC-8F29A2"],
    });
    expect(data.startsWith("0x")).toBe(true);
    expect(data.length).toBeGreaterThan(10);
  });

  it("round-trips a DocumentRegistered event", () => {
    const documentHash = `0x${"b".repeat(64)}` as const;
    const issuer = "0x82F1e4a90D3b2C1A5e6f7890aBcdEF1234567891" as const;

    const topics = encodeEventTopics({
      abi: PROOF_CHAIN_REGISTRY_ABI,
      eventName: "DocumentRegistered",
      args: { documentHash, issuer },
    });

    expect(topics).toHaveLength(3);
    expect(topics[1]).toBe(documentHash);
  });

  it("exposes read-only lookups that do not require a wallet", () => {
    const views = PROOF_CHAIN_REGISTRY_ABI.filter(
      (item) => item.type === "function" && item.stateMutability === "view",
    ).map((item) => ("name" in item ? item.name : ""));

    expect(views).toContain("verifyDocument");
    expect(views).toContain("getProof");
    expect(views).toContain("isRegisteredByIssuer");
  });

  it("has no function that could alter or delete a recorded proof", () => {
    const mutating = PROOF_CHAIN_REGISTRY_ABI.filter(
      (item) => item.type === "function" && item.stateMutability === "nonpayable",
    ).map((item) => ("name" in item ? item.name : ""));

    // Registration, pause controls and ownership only. Nothing that rewrites
    // history, which is the entire value of the registry.
    expect(mutating.sort()).toEqual([
      "pause",
      "registerDocument",
      "renounceOwnership",
      "transferOwnership",
      "unpause",
    ]);
  });
});

describe("event decoding", () => {
  it("decodes an emitted registration back to its arguments", () => {
    const documentHash = `0x${"c".repeat(64)}` as const;
    const issuer = "0x82F1e4a90D3b2C1A5e6f7890aBcdEF1234567891" as const;
    const verificationId = "PC-8F29A2";
    const timestamp = 1789000000n;

    const topics = encodeEventTopics({
      abi: PROOF_CHAIN_REGISTRY_ABI,
      eventName: "DocumentRegistered",
      args: { documentHash, issuer },
    });

    // Non-indexed arguments live in the data payload.
    const data = encodeAbiParameters(
      [{ type: "string" }, { type: "uint256" }],
      [verificationId, timestamp],
    );

    const decoded = decodeEventLog({
      abi: PROOF_CHAIN_REGISTRY_ABI,
      topics: topics as [`0x${string}`, ...`0x${string}`[]],
      data,
    });

    expect(decoded.eventName).toBe("DocumentRegistered");
    if (decoded.eventName !== "DocumentRegistered") return;
    expect(decoded.args.documentHash).toBe(documentHash);
    expect(decoded.args.verificationId).toBe(verificationId);
    expect(decoded.args.timestamp).toBe(timestamp);
  });
});
