/**
 * Pre-deployment configuration check.
 *
 * Catches the misconfigurations that are silent but serious — a default secret,
 * a localhost URL baked into printed QR codes, real mode without a contract —
 * before they reach customers rather than after.
 *
 * Usage: node scripts/preflight.mjs
 */
import "dotenv/config";

const problems = [];
const warnings = [];

function require_(key) {
  if (!process.env[key]) problems.push(`${key} is not set.`);
  return process.env[key];
}

const databaseUrl = require_("DATABASE_URL");
const secret = require_("NEXTAUTH_SECRET");
const appUrl = require_("NEXT_PUBLIC_APP_URL");
const mode = process.env.BLOCKCHAIN_MODE ?? "mock";

if (secret) {
  if (secret.includes("replace-me")) {
    problems.push("NEXTAUTH_SECRET is still the placeholder from .env.example.");
  } else if (secret.length < 32) {
    problems.push(
      "NEXTAUTH_SECRET is shorter than 32 characters. Generate one with: openssl rand -base64 32",
    );
  }
}

for (const [key, value] of [
  ["NEXT_PUBLIC_APP_URL", appUrl],
  ["NEXTAUTH_URL", process.env.NEXTAUTH_URL],
]) {
  if (!value) continue;
  if (/localhost|127\.0\.0\.1/.test(value)) {
    // Verification URLs are printed onto documents and encoded into QR codes.
    // A localhost value there produces codes nobody else can ever scan.
    problems.push(`${key} points at localhost (${value}).`);
  } else if (!value.startsWith("https://")) {
    problems.push(`${key} is not https (${value}). Session cookies need TLS.`);
  }
}

if (databaseUrl && /:(postgres|password|proofchain)@/.test(databaseUrl)) {
  warnings.push("DATABASE_URL appears to use a development password.");
}

if (mode === "real") {
  if (!process.env.CONTRACT_ADDRESS) {
    problems.push("BLOCKCHAIN_MODE=real but CONTRACT_ADDRESS is not set.");
  }
  if (!process.env.BASE_SEPOLIA_RPC_URL) {
    problems.push("BLOCKCHAIN_MODE=real but BASE_SEPOLIA_RPC_URL is not set.");
  }
  if (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS !== process.env.CONTRACT_ADDRESS) {
    problems.push(
      "CONTRACT_ADDRESS and NEXT_PUBLIC_CONTRACT_ADDRESS differ. The browser would build transactions for a different contract than the server verifies against.",
    );
  }
  if (process.env.NEXT_PUBLIC_BLOCKCHAIN_MODE !== "real") {
    problems.push(
      "BLOCKCHAIN_MODE=real but NEXT_PUBLIC_BLOCKCHAIN_MODE is not. The interface would offer simulated proofs.",
    );
  }
} else {
  warnings.push(
    "BLOCKCHAIN_MODE is not 'real'. Proofs will be simulated and labelled as such — fine for a demo, not for customers.",
  );
}

if (process.env.DEPLOYER_PRIVATE_KEY) {
  warnings.push(
    "DEPLOYER_PRIVATE_KEY is set. The application never reads it; leave it out of the runtime environment.",
  );
}

for (const warning of warnings) console.warn(`warning: ${warning}`);
for (const problem of problems) console.error(`problem: ${problem}`);

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s) must be fixed before deploying.`);
  process.exit(1);
}

console.log(
  warnings.length > 0
    ? `\nNo blocking problems. ${warnings.length} warning(s) above.`
    : "\nConfiguration looks ready for production.",
);
