/**
 * Applies migrations to the integration-test database before a test run.
 *
 * Without this, adding a migration makes every database-backed test fail with
 * "table does not exist" — a confusing failure that has nothing to do with the
 * code under test.
 */
import { execFileSync } from "node:child_process";

import "dotenv/config";

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL?.replace(/\/proofchain(\?|$)/, "/proofchain_test$1");

if (!testDatabaseUrl) {
  console.error(
    "Set DATABASE_URL (or TEST_DATABASE_URL) before running the test suite.",
  );
  process.exit(1);
}

try {
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (error) {
  console.error("Could not prepare the test database.");
  console.error(error.stderr?.toString() ?? error.message);
  console.error(
    "\nCreate it once with:  createdb proofchain_test",
  );
  process.exit(1);
}
