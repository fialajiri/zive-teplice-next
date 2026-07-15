import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type {
  RateLimitDecision,
  RateLimiter,
} from "@/server/domain/rate-limit";

const ALWAYS_ALLOW: RateLimiter = {
  async check() {
    return { allowed: true, retryAfterSeconds: 0 };
  },
};

export type RateLimiterOptions = {
  limit: number;
  window: `${number} ${"s" | "m" | "h"}`;
  prefix: string;
};

// Construction never throws: `container` is built eagerly at module load, so a
// missing Upstash config must not crash the app. An unconfigured store (or one
// that errors at request time) fails OPEN — see the port doc comment for why.
export function createUpstashRateLimiter(
  options: RateLimiterOptions,
): RateLimiter {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.error(
      "Rate limiter is not configured (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN missing) — failing open.",
    );
    return ALWAYS_ALLOW;
  }

  const redis = new Redis({ url, token });
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(options.limit, options.window),
    prefix: options.prefix,
    analytics: false,
  });

  return {
    async check(key): Promise<RateLimitDecision> {
      try {
        const result = await ratelimit.limit(key);
        const retryAfterSeconds = Math.max(
          0,
          Math.ceil((result.reset - Date.now()) / 1000),
        );
        return { allowed: result.success, retryAfterSeconds };
      } catch {
        console.error("Rate limiter check failed — failing open.");
        return { allowed: true, retryAfterSeconds: 0 };
      }
    },
  };
}
