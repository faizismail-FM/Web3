/**
 * A fixed-window rate limiter held in process memory.
 *
 * Scope and limits: this protects a single instance. Behind more than one
 * server each gets its own budget, so a production deployment that scales
 * horizontally should move this to a shared store (Redis or similar). It is
 * still worth having — it turns an unauthenticated endpoint from "unbounded"
 * into "bounded per instance", which stops casual abuse and accidental loops.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Bounds memory if a burst of unique keys arrives. */
const MAX_TRACKED_KEYS = 20_000;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    // Opportunistic cleanup: expired entries are dropped as they are touched,
    // and the whole map is cleared if it ever grows unreasonably.
    if (buckets.size > MAX_TRACKED_KEYS) buckets.clear();

    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return {
      allowed: true,
      remaining: options.limit - 1,
      retryAfterSeconds: 0,
    };
  }

  existing.count += 1;
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((existing.resetAt - now) / 1000),
  );

  return {
    allowed: existing.count <= options.limit,
    remaining: Math.max(0, options.limit - existing.count),
    retryAfterSeconds,
  };
}

/** Test hook. Never called by application code. */
export function resetRateLimits(): void {
  buckets.clear();
}

/**
 * Best-effort client identity for rate limiting.
 *
 * `x-forwarded-for` is client-controlled unless a trusted proxy overwrites it,
 * so this is never used for authorization — only to spread limits across
 * callers. A spoofed value can at worst give the spoofer their own bucket.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return ip;
}
