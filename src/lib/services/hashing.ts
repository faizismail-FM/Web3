import { createHash } from "node:crypto";

/**
 * Computes the SHA-256 fingerprint of a document.
 *
 * This is the only place a document hash is ever produced. Hashes are never
 * accepted from the client: the whole guarantee of the product is that the
 * fingerprint corresponds to the bytes we actually stored, and a
 * client-supplied value would prove nothing.
 */
export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** A SHA-256 digest rendered as 64 lowercase hex characters. */
export function isSha256Hex(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

/** The `bytes32` form the smart contract expects. */
export function toBytes32(hash: string): `0x${string}` {
  if (!isSha256Hex(hash)) {
    throw new Error("Expected a 64-character lowercase hex SHA-256 digest");
  }
  return `0x${hash}`;
}
