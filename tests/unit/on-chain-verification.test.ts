import { encodeAbiParameters, encodeEventTopics, type Hash } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PROOF_CHAIN_REGISTRY_ABI } from "@/lib/blockchain/abi";

const CONTRACT = "0x1ab1588fae974e37ee90b6fd0e2a92ffebcf5579";
const OTHER_CONTRACT = "0x00000000000000000000000000000000deadbeef";
const ISSUER = "0x82F1e4a90D3b2C1A5e6f7890aBcdEF1234567891";
const DOCUMENT_HASH = "a".repeat(64);
const VERIFICATION_ID = "PC-8F29A2";
const TX: Hash = `0x${"f".repeat(64)}`;

/**
 * Builds a log exactly as the contract would emit it, so the verifier is tested
 * against real encoding rather than a hand-shaped object.
 */
function registeredLog(overrides: {
  address?: string;
  documentHash?: string;
  issuer?: string;
  verificationId?: string;
}) {
  const documentHash = `0x${overrides.documentHash ?? DOCUMENT_HASH}` as const;
  const topics = encodeEventTopics({
    abi: PROOF_CHAIN_REGISTRY_ABI,
    eventName: "DocumentRegistered",
    args: {
      documentHash,
      issuer: (overrides.issuer ?? ISSUER) as `0x${string}`,
    },
  });

  return {
    address: overrides.address ?? CONTRACT,
    topics,
    data: encodeAbiParameters(
      [{ type: "string" }, { type: "uint256" }],
      [overrides.verificationId ?? VERIFICATION_ID, 1789000000n],
    ),
  };
}

const getTransactionReceipt = vi.fn();
const getBlock = vi.fn();

vi.mock("@/lib/blockchain/client", () => ({
  getPublicClient: () => ({ getTransactionReceipt, getBlock }),
  getContractAddress: () => CONTRACT,
}));

const { confirmOnChainRegistration, OnChainVerificationError } = await import(
  "@/lib/blockchain/real-provider"
);

function confirm(overrides: Partial<Parameters<typeof confirmOnChainRegistration>[0]> = {}) {
  return confirmOnChainRegistration({
    transactionHash: TX,
    expectedDocumentHash: DOCUMENT_HASH,
    expectedVerificationId: VERIFICATION_ID,
    ...overrides,
  });
}

beforeEach(() => {
  getTransactionReceipt.mockReset();
  getBlock.mockReset();
  getBlock.mockResolvedValue({ timestamp: 1789000000n });
});

afterEach(() => vi.clearAllMocks());

describe("confirmOnChainRegistration", () => {
  it("accepts a transaction that registered exactly this document", async () => {
    getTransactionReceipt.mockResolvedValue({
      status: "success",
      to: CONTRACT,
      transactionHash: TX,
      blockNumber: 29_355_023n,
      logs: [registeredLog({})],
    });

    const result = await confirm();

    expect(result.mode).toBe("REAL");
    expect(result.transactionHash).toBe(TX);
    expect(result.blockNumber).toBe(29_355_023n);
    expect(result.chainId).toBe(84532);
    // The issuer comes from the emitted event, never from the caller.
    expect(result.issuerAddress.toLowerCase()).toBe(ISSUER.toLowerCase());
  });

  it("rejects a transaction that reverted", async () => {
    getTransactionReceipt.mockResolvedValue({
      status: "reverted",
      to: CONTRACT,
      transactionHash: TX,
      blockNumber: 1n,
      logs: [],
    });

    await expect(confirm()).rejects.toThrow(/failed on the blockchain/);
  });

  it("rejects a transaction sent to a different contract", async () => {
    // Someone could deploy a look-alike contract that emits the same event.
    getTransactionReceipt.mockResolvedValue({
      status: "success",
      to: OTHER_CONTRACT,
      transactionHash: TX,
      blockNumber: 1n,
      logs: [registeredLog({ address: OTHER_CONTRACT })],
    });

    await expect(confirm()).rejects.toThrow(/not sent to the ProofChain/);
  });

  it("rejects a transaction that registered a different document", async () => {
    getTransactionReceipt.mockResolvedValue({
      status: "success",
      to: CONTRACT,
      transactionHash: TX,
      blockNumber: 1n,
      logs: [registeredLog({ documentHash: "b".repeat(64) })],
    });

    await expect(confirm()).rejects.toThrow(/did not register this document/);
  });

  it("rejects a transaction carrying a different verification id", async () => {
    getTransactionReceipt.mockResolvedValue({
      status: "success",
      to: CONTRACT,
      transactionHash: TX,
      blockNumber: 1n,
      logs: [registeredLog({ verificationId: "PC-ZZZZZZ" })],
    });

    await expect(confirm()).rejects.toThrow(/did not register this document/);
  });

  it("ignores a matching event emitted by another contract in the same transaction", async () => {
    // A forged log from an unrelated address must not be able to mint a proof.
    getTransactionReceipt.mockResolvedValue({
      status: "success",
      to: CONTRACT,
      transactionHash: TX,
      blockNumber: 1n,
      logs: [registeredLog({ address: OTHER_CONTRACT })],
    });

    await expect(confirm()).rejects.toThrow(/did not register this document/);
  });

  it("accepts the correct event even when unrelated logs are present", async () => {
    getTransactionReceipt.mockResolvedValue({
      status: "success",
      to: CONTRACT,
      transactionHash: TX,
      blockNumber: 42n,
      logs: [
        { address: OTHER_CONTRACT, topics: [`0x${"1".repeat(64)}`], data: "0x" },
        registeredLog({}),
      ],
    });

    await expect(confirm()).resolves.toMatchObject({ blockNumber: 42n });
  });

  it("rejects a transaction that cannot be found", async () => {
    getTransactionReceipt.mockRejectedValue(new Error("not found"));
    await expect(confirm()).rejects.toThrow(OnChainVerificationError);
  });

  it("rejects a transaction with no registry logs at all", async () => {
    getTransactionReceipt.mockResolvedValue({
      status: "success",
      to: CONTRACT,
      transactionHash: TX,
      blockNumber: 1n,
      logs: [],
    });

    await expect(confirm()).rejects.toThrow(/did not register this document/);
  });

  it("takes the timestamp from the block, not from the request", async () => {
    getBlock.mockResolvedValue({ timestamp: 1800000000n });
    getTransactionReceipt.mockResolvedValue({
      status: "success",
      to: CONTRACT,
      transactionHash: TX,
      blockNumber: 7n,
      logs: [registeredLog({})],
    });

    const result = await confirm();
    expect(result.registeredAt.getTime()).toBe(1800000000 * 1000);
  });
});
