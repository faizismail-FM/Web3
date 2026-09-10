import bcrypt from "bcryptjs";

/**
 * Cost factor for password hashing. 12 keeps a single hash in the ~200ms range
 * on commodity hardware, which is the usual balance between login latency and
 * offline-cracking resistance.
 */
const SALT_ROUNDS = 12;

export function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

export function verifyPassword(
  plaintext: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plaintext, passwordHash);
}
