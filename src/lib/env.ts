import { z } from "zod";

/**
 * Server-side environment contract.
 *
 * Parsed lazily so that build-time tooling (linting, type generation) does not
 * require a fully populated environment, but any runtime code path that needs a
 * value fails loudly and early rather than silently reading `undefined`.
 */
const serverSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    NEXTAUTH_SECRET: z
      .string()
      .min(16, "NEXTAUTH_SECRET must be at least 16 characters"),
    NEXTAUTH_URL: z.string().url().optional(),
    BLOCKCHAIN_MODE: z.enum(["mock", "real"]).default("mock"),
    BASE_SEPOLIA_RPC_URL: z.string().url().optional(),
    CONTRACT_ADDRESS: z.string().optional(),
    STORAGE_DIR: z.string().default("./storage"),
    MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(10_485_760),
  })
  .superRefine((value, ctx) => {
    if (value.BLOCKCHAIN_MODE !== "real") return;

    if (!value.BASE_SEPOLIA_RPC_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["BASE_SEPOLIA_RPC_URL"],
        message: "BASE_SEPOLIA_RPC_URL is required when BLOCKCHAIN_MODE=real",
      });
    }
    if (!value.CONTRACT_ADDRESS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CONTRACT_ADDRESS"],
        message: "CONTRACT_ADDRESS is required when BLOCKCHAIN_MODE=real",
      });
    }
  });

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  cached = parsed.data;
  return cached;
}

/**
 * Values that are safe to read from the browser. Next.js inlines `NEXT_PUBLIC_*`
 * at build time, so these must be referenced statically.
 */
export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  blockchainMode:
    process.env.NEXT_PUBLIC_BLOCKCHAIN_MODE === "real" ? "real" : "mock",
  contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "",
} as const;
