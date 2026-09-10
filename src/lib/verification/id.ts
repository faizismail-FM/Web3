import { randomInt } from "node:crypto";

/**
 * Verification IDs are read aloud, typed from paper, and printed under QR
 * codes, so the alphabet excludes characters that are easily confused:
 * 0/O, 1/I/L. What remains is 31 symbols, giving 31^6 ≈ 887 million
 * combinations.
 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const LENGTH = 6;
const PREFIX = "PC";

export const VERIFICATION_ID_PATTERN = new RegExp(
  `^${PREFIX}-[${ALPHABET}]{${LENGTH}}$`,
);

/**
 * Generates a candidate ID such as `PC-8F29A2`.
 *
 * Uses `randomInt` rather than `Math.random`: a guessable verification ID would
 * let someone enumerate other organizations' proofs.
 */
export function generateVerificationId(): string {
  let body = "";
  for (let index = 0; index < LENGTH; index += 1) {
    body += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `${PREFIX}-${body}`;
}

export function isVerificationId(value: string): boolean {
  return VERIFICATION_ID_PATTERN.test(value);
}

/**
 * Accepts what a person actually types: lowercase, a missing hyphen, stray
 * whitespace. Returns the canonical form, or null if it cannot be one.
 */
export function normalizeVerificationId(input: string): string | null {
  const compact = input.trim().toUpperCase().replace(/[\s-]/g, "");

  const body = compact.startsWith(PREFIX)
    ? compact.slice(PREFIX.length)
    : compact;

  const candidate = `${PREFIX}-${body}`;
  return isVerificationId(candidate) ? candidate : null;
}
