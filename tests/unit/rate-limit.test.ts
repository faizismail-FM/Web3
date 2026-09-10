import { beforeEach, describe, expect, it } from "vitest";

import { clientKey, rateLimit, resetRateLimits } from "@/lib/api/rate-limit";

beforeEach(resetRateLimits);

describe("rateLimit", () => {
  const options = { limit: 3, windowMs: 60_000 };

  it("allows requests up to the limit", () => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      expect(rateLimit("caller", options).allowed).toBe(true);
    }
  });

  it("refuses the request after the limit", () => {
    for (let attempt = 0; attempt < 3; attempt += 1) rateLimit("caller", options);

    const blocked = rateLimit("caller", options);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("keeps separate budgets per key", () => {
    for (let attempt = 0; attempt < 3; attempt += 1) rateLimit("first", options);

    // One caller exhausting their budget must not lock everyone else out.
    expect(rateLimit("first", options).allowed).toBe(false);
    expect(rateLimit("second", options).allowed).toBe(true);
  });

  it("starts a fresh window once the old one has passed", () => {
    const brief = { limit: 1, windowMs: 1 };
    expect(rateLimit("caller", brief).allowed).toBe(true);
    expect(rateLimit("caller", brief).allowed).toBe(false);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(rateLimit("caller", brief).allowed).toBe(true);
        resolve();
      }, 5);
    });
  });

  it("reports the remaining budget", () => {
    expect(rateLimit("caller", options).remaining).toBe(2);
    expect(rateLimit("caller", options).remaining).toBe(1);
    expect(rateLimit("caller", options).remaining).toBe(0);
  });
});

describe("clientKey", () => {
  function request(headers: Record<string, string>) {
    return new Request("https://example.test/api/verify", { headers });
  }

  it("uses the first address in x-forwarded-for", () => {
    expect(
      clientKey(request({ "x-forwarded-for": "203.0.113.7, 198.51.100.2" })),
    ).toBe("203.0.113.7");
  });

  it("falls back to a shared bucket when the header is absent", () => {
    // Everyone unidentified shares one budget, which is the conservative
    // choice: unknown callers cannot get an unlimited number of buckets.
    expect(clientKey(request({}))).toBe("unknown");
  });

  it("trims whitespace", () => {
    expect(clientKey(request({ "x-forwarded-for": "  203.0.113.7  " }))).toBe(
      "203.0.113.7",
    );
  });
});
