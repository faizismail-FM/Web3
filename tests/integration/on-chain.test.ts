import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toHex,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { beforeAll, describe, expect, it } from "vitest";

import { PROOF_CHAIN_REGISTRY_ABI } from "@/lib/blockchain/abi";

/**
 * Exercises the real on-chain confirmation path against an actual EVM.
 *
 * Opt-in, because it needs a node: start one with
 *   cd contracts && npx hardhat node
 * then run
 *   LOCAL_CHAIN_RPC=http://127.0.0.1:8545 npm test
 *
 * Without it these cases are skipped rather than failing, so the default test
 * run stays self-contained.
 */
const RPC = process.env.LOCAL_CHAIN_RPC;

/** Hardhat's first two deterministic development accounts. */
const DEPLOYER_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const ISSUER_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

const ARTIFACT = path.join(
  process.cwd(),
  "contracts/artifacts/src/ProofChainRegistry.sol/ProofChainRegistry.json",
);

describe.skipIf(!RPC)("on-chain confirmation (live EVM)", () => {
  let contractAddress: Address;
  let confirmOnChainRegistration: typeof import("@/lib/blockchain/real-provider").confirmOnChainRegistration;

  // Accounts need no RPC URL, so they can be built here; the clients cannot,
  // because the describe body still evaluates when the suite is skipped and
  // viem refuses a transport without a URL.
  const deployerAccount = privateKeyToAccount(DEPLOYER_KEY);
  const issuerAccount = privateKeyToAccount(ISSUER_KEY);

  let publicClient: ReturnType<typeof createPublicClient>;
  let deployer: ReturnType<typeof createWalletClient>;
  let issuer: ReturnType<typeof createWalletClient>;

  const documentHash = keccak256(toHex("bill-of-lading-abc123"));
  const verificationId = "PC-8F29A2";

  beforeAll(async () => {
    const transport = http(RPC);
    publicClient = createPublicClient({ transport });
    deployer = createWalletClient({ account: deployerAccount, transport });
    issuer = createWalletClient({ account: issuerAccount, transport });

    const artifact = JSON.parse(await readFile(ARTIFACT, "utf8")) as {
      bytecode: `0x${string}`;
    };

    const deployTx = await deployer.deployContract({
      abi: PROOF_CHAIN_REGISTRY_ABI,
      bytecode: artifact.bytecode,
      args: [deployerAccount.address],
      account: deployerAccount,
      chain: null,
    });
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: deployTx,
    });
    contractAddress = receipt.contractAddress!;

    // Point the server-side verifier at this contract and node.
    process.env.BLOCKCHAIN_MODE = "real";
    process.env.BASE_SEPOLIA_RPC_URL = RPC!;
    process.env.CONTRACT_ADDRESS = contractAddress;

    ({ confirmOnChainRegistration } = await import(
      "@/lib/blockchain/real-provider"
    ));
  });

  async function register(args: {
    hash?: `0x${string}`;
    id?: string;
  }): Promise<`0x${string}`> {
    const hash = await issuer.writeContract({
      abi: PROOF_CHAIN_REGISTRY_ABI,
      address: contractAddress,
      functionName: "registerDocument",
      args: [args.hash ?? documentHash, args.id ?? verificationId],
      account: issuerAccount,
      chain: null,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  it("confirms a genuine registration and reads the issuer from the chain", async () => {
    const txHash = await register({});

    const result = await confirmOnChainRegistration({
      transactionHash: txHash,
      expectedDocumentHash: documentHash.slice(2),
      expectedVerificationId: verificationId,
    });

    expect(result.mode).toBe("REAL");
    expect(result.transactionHash).toBe(txHash);
    expect(result.issuerAddress.toLowerCase()).toBe(
      issuerAccount.address.toLowerCase(),
    );
    expect(result.blockNumber).toBeGreaterThan(0n);
    expect(result.registeredAt.getTime()).toBeGreaterThan(0);
  });

  it("rejects a transaction that registered a different document", async () => {
    const otherHash = keccak256(toHex("a-different-document"));
    const txHash = await register({ hash: otherHash, id: "PC-BBBBBB" });

    await expect(
      confirmOnChainRegistration({
        transactionHash: txHash,
        expectedDocumentHash: documentHash.slice(2),
        expectedVerificationId: verificationId,
      }),
    ).rejects.toThrow(/did not register this document/);
  });

  it("rejects a transaction that is not a registration at all", async () => {
    // A plain value transfer, which any user could send and then claim.
    const txHash = await issuer.sendTransaction({
      to: deployerAccount.address,
      value: 1n,
      account: issuerAccount,
      chain: null,
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    await expect(
      confirmOnChainRegistration({
        transactionHash: txHash,
        expectedDocumentHash: documentHash.slice(2),
        expectedVerificationId: verificationId,
      }),
    ).rejects.toThrow(/not sent to the ProofChain registry/);
  });

  it("reads back the proof through the contract's own view function", async () => {
    const [registered, onChainIssuer, timestamp, id] =
      (await publicClient.readContract({
        abi: PROOF_CHAIN_REGISTRY_ABI,
        address: contractAddress,
        functionName: "verifyDocument",
        args: [documentHash],
      })) as [boolean, Address, bigint, string];

    expect(registered).toBe(true);
    expect(onChainIssuer.toLowerCase()).toBe(
      issuerAccount.address.toLowerCase(),
    );
    expect(timestamp).toBeGreaterThan(0n);
    expect(id).toBe(verificationId);
  });

  it("rejects a duplicate registration by the same issuer, on chain", async () => {
    await expect(register({ id: "PC-CCCCCC" })).rejects.toThrow();
  });
});
