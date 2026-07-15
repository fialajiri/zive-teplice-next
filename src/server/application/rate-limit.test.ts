import { describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "./rate-limit";
import type { RateLimiter } from "@/server/domain/rate-limit";

function makeLimiter(
  decide: (key: string) => { allowed: boolean; retryAfterSeconds: number },
): RateLimiter {
  return { check: vi.fn(async (key: string) => decide(key)) };
}

describe("checkRateLimit", () => {
  it("allows when both the IP and identifier are under their limits", async () => {
    const limiter = makeLimiter(() => ({
      allowed: true,
      retryAfterSeconds: 0,
    }));

    const result = await checkRateLimit(limiter, {
      ip: "1.2.3.4",
      identifier: "user@example.com",
    });

    expect(result.allowed).toBe(true);
  });

  it("blocks when the IP scope is over its limit", async () => {
    const limiter = makeLimiter((key) => ({
      allowed: !key.startsWith("ip:"),
      retryAfterSeconds: key.startsWith("ip:") ? 30 : 0,
    }));

    const result = await checkRateLimit(limiter, {
      ip: "1.2.3.4",
      identifier: "user@example.com",
    });

    expect(result).toEqual({ allowed: false, retryAfterSeconds: 30 });
  });

  it("blocks when the identifier scope is over its limit", async () => {
    const limiter = makeLimiter((key) => ({
      allowed: !key.startsWith("id:"),
      retryAfterSeconds: key.startsWith("id:") ? 45 : 0,
    }));

    const result = await checkRateLimit(limiter, {
      ip: "1.2.3.4",
      identifier: "user@example.com",
    });

    expect(result).toEqual({ allowed: false, retryAfterSeconds: 45 });
  });

  it("normalizes the identifier key (trim + lowercase) so callers can't bypass it with casing", async () => {
    const limiter = makeLimiter(() => ({
      allowed: true,
      retryAfterSeconds: 0,
    }));

    await checkRateLimit(limiter, {
      ip: "1.2.3.4",
      identifier: "  User@Example.com  ",
    });

    expect(limiter.check).toHaveBeenCalledWith("id:user@example.com");
  });
});
