import "dotenv/config";

// Integration tests write to a dedicated database so a test run can never
// truncate development data.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL?.replace(/\/proofchain(\?|$)/, "/proofchain_test$1");

process.env.NEXTAUTH_SECRET ??= "test-secret-value-at-least-16-chars";
