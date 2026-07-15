import type {
  RateLimitDecision,
  RateLimiter,
} from "@/server/domain/rate-limit";

export type RateLimitKeys = {
  ip: string;
  identifier: string;
};

// Checks both scopes independently and blocks if either is exceeded: the IP
// key stops one attacker rotating identifiers, the identifier key stops
// credential stuffing / spam against one account from rotating IPs.
export async function checkRateLimit(
  limiter: RateLimiter,
  keys: RateLimitKeys,
): Promise<RateLimitDecision> {
  const [byIp, byIdentifier] = await Promise.all([
    limiter.check(`ip:${keys.ip}`),
    limiter.check(`id:${keys.identifier.trim().toLowerCase()}`),
  ]);
  if (!byIp.allowed) return byIp;
  if (!byIdentifier.allowed) return byIdentifier;
  return { allowed: true, retryAfterSeconds: 0 };
}
