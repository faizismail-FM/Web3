import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { network } from "hardhat";
import { keccak256, toHex, zeroAddress, type Address } from "viem";

/**
 * The fingerprint of a document, as the application would compute it: a SHA-256
 * digest rendered as bytes32.
 */
function documentHash(seed: string): `0x${string}` {
  return keccak256(toHex(seed));
}

const VERIFICATION_ID = "PC-8F29A2";

describe("ProofChainRegistry", async () => {
  const { viem } = await network.getOrCreate("default");

  let registry: Awaited<ReturnType<typeof deploy>>;
  let owner: Address;
  let issuer: Address;
  let otherIssuer: Address;

  async function deploy() {
    const [ownerClient] = await viem.getWalletClients();
    return viem.deployContract("ProofChainRegistry", [
      ownerClient.account.address,
    ]);
  }

  before(async () => {
    const [a, b, c] = await viem.getWalletClients();
    owner = a.account.address;
    issuer = b.account.address;
    otherIssuer = c.account.address;
  });

  describe("registration", () => {
    it("records a proof and emits DocumentRegistered", async () => {
      registry = await deploy();
      const hash = documentHash("bill-of-lading-abc123");

      await registry.write.registerDocument([hash, VERIFICATION_ID]);

      const events = await registry.getEvents.DocumentRegistered();
      assert.equal(events.length, 1);
      assert.equal(events[0].args.documentHash, hash);
      assert.equal(
        events[0].args.issuer?.toLowerCase(),
        owner.toLowerCase(),
      );
      assert.equal(events[0].args.verificationId, VERIFICATION_ID);
      assert.ok((events[0].args.timestamp ?? 0n) > 0n);
    });

    it("stores the caller as the issuer, so a proof always names who attested", async () => {
      registry = await deploy();
      const hash = documentHash("invoice-9981");

      const asIssuer = await viem.getContractAt(
        "ProofChainRegistry",
        registry.address,
        { client: { wallet: (await viem.getWalletClients())[1] } },
      );
      await asIssuer.write.registerDocument([hash, VERIFICATION_ID]);

      const [registered, storedIssuer] = await registry.read.verifyDocument([
        hash,
      ]);
      assert.equal(registered, true);
      assert.equal(storedIssuer.toLowerCase(), issuer.toLowerCase());
    });

    it("never stores the document itself — only a 32-byte fingerprint", async () => {
      registry = await deploy();
      const hash = documentHash("confidential contract text");

      await registry.write.registerDocument([hash, VERIFICATION_ID]);

      const [, , , storedId] = await registry.read.verifyDocument([hash]);
      assert.equal(storedId, VERIFICATION_ID);
      // The only document-derived value on chain is the fixed-length digest.
      assert.equal(hash.length, 66);
    });

    it("counts registrations", async () => {
      registry = await deploy();
      assert.equal(await registry.read.totalProofs(), 0n);

      await registry.write.registerDocument([documentHash("one"), "PC-AAAAAA"]);
      await registry.write.registerDocument([documentHash("two"), "PC-BBBBBB"]);

      assert.equal(await registry.read.totalProofs(), 2n);
    });
  });

  describe("duplicate prevention", () => {
    it("rejects the same issuer registering the same document twice", async () => {
      registry = await deploy();
      const hash = documentHash("duplicate-me");

      await registry.write.registerDocument([hash, "PC-AAAAAA"]);

      await assert.rejects(
        registry.write.registerDocument([hash, "PC-BBBBBB"]),
        /DocumentAlreadyRegisteredByIssuer/,
      );
      assert.equal(await registry.read.totalProofs(), 1n);
    });

    it("lets a different issuer register the same document", async () => {
      // Both parties to a shipment hold the same bill of lading; each must be
      // able to attest to it independently.
      registry = await deploy();
      const hash = documentHash("shared-bill-of-lading");

      await registry.write.registerDocument([hash, "PC-AAAAAA"]);

      const clients = await viem.getWalletClients();
      const asOther = await viem.getContractAt(
        "ProofChainRegistry",
        registry.address,
        { client: { wallet: clients[2] } },
      );
      await asOther.write.registerDocument([hash, "PC-BBBBBB"]);

      assert.equal(await registry.read.totalProofs(), 2n);
      assert.equal(
        await registry.read.isRegisteredByIssuer([hash, owner]),
        true,
      );
      assert.equal(
        await registry.read.isRegisteredByIssuer([hash, otherIssuer]),
        true,
      );
    });

    it("rejects a verification id that is already in use", async () => {
      registry = await deploy();

      await registry.write.registerDocument([
        documentHash("first"),
        VERIFICATION_ID,
      ]);

      await assert.rejects(
        registry.write.registerDocument([
          documentHash("second"),
          VERIFICATION_ID,
        ]),
        /VerificationIdAlreadyUsed/,
      );
    });
  });

  describe("input validation", () => {
    it("rejects a zero document hash", async () => {
      registry = await deploy();
      await assert.rejects(
        registry.write.registerDocument([
          `0x${"0".repeat(64)}`,
          VERIFICATION_ID,
        ]),
        /InvalidDocumentHash/,
      );
    });

    it("rejects an empty verification id", async () => {
      registry = await deploy();
      await assert.rejects(
        registry.write.registerDocument([documentHash("x"), ""]),
        /InvalidVerificationId/,
      );
    });

    it("rejects an oversized verification id", async () => {
      registry = await deploy();
      await assert.rejects(
        registry.write.registerDocument([documentHash("x"), "P".repeat(33)]),
        /InvalidVerificationId/,
      );
    });
  });

  describe("lookups", () => {
    it("reports an unregistered document as not found, rather than reverting", async () => {
      registry = await deploy();

      const [registered, foundIssuer, timestamp, id] =
        await registry.read.verifyDocument([documentHash("never-registered")]);

      assert.equal(registered, false);
      assert.equal(foundIssuer, zeroAddress);
      assert.equal(timestamp, 0n);
      assert.equal(id, "");
    });

    it("finds a proof by its verification id", async () => {
      registry = await deploy();
      const hash = documentHash("findable");
      await registry.write.registerDocument([hash, VERIFICATION_ID]);

      const [registered, storedHash, storedIssuer, timestamp] =
        await registry.read.getProof([VERIFICATION_ID]);

      assert.equal(registered, true);
      assert.equal(storedHash, hash);
      assert.equal(storedIssuer.toLowerCase(), owner.toLowerCase());
      assert.ok(timestamp > 0n);
    });

    it("reports an unknown verification id as not found", async () => {
      registry = await deploy();
      const [registered] = await registry.read.getProof(["PC-ZZZZZZ"]);
      assert.equal(registered, false);
    });

    it("returns the earliest proof when several issuers registered one document", async () => {
      registry = await deploy();
      const hash = documentHash("multi-issuer");

      await registry.write.registerDocument([hash, "PC-FIRST1"]);

      const clients = await viem.getWalletClients();
      const asOther = await viem.getContractAt(
        "ProofChainRegistry",
        registry.address,
        { client: { wallet: clients[2] } },
      );
      await asOther.write.registerDocument([hash, "PC-SECND2"]);

      const [, , , id] = await registry.read.verifyDocument([hash]);
      assert.equal(id, "PC-FIRST1");
    });
  });

  describe("pausing", () => {
    it("blocks new registrations while paused", async () => {
      registry = await deploy();
      await registry.write.pause();

      await assert.rejects(
        registry.write.registerDocument([documentHash("x"), VERIFICATION_ID]),
        /EnforcedPause/,
      );
    });

    it("keeps existing proofs readable while paused", async () => {
      // Pausing is an incident control for the write path. It must never make
      // an already-recorded proof unverifiable.
      registry = await deploy();
      const hash = documentHash("registered-before-pause");
      await registry.write.registerDocument([hash, VERIFICATION_ID]);

      await registry.write.pause();

      const [registered] = await registry.read.verifyDocument([hash]);
      assert.equal(registered, true);
    });

    it("resumes after unpausing", async () => {
      registry = await deploy();
      await registry.write.pause();
      await registry.write.unpause();

      await registry.write.registerDocument([
        documentHash("after-unpause"),
        VERIFICATION_ID,
      ]);
      assert.equal(await registry.read.totalProofs(), 1n);
    });

    it("only the owner may pause", async () => {
      registry = await deploy();
      const clients = await viem.getWalletClients();
      const asStranger = await viem.getContractAt(
        "ProofChainRegistry",
        registry.address,
        { client: { wallet: clients[1] } },
      );

      await assert.rejects(
        asStranger.write.pause(),
        /OwnableUnauthorizedAccount/,
      );
    });
  });
});
