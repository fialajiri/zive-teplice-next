export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
};

// Abuse-prevention port for login/registration/password-reset. This is
// defense-in-depth, not the primary auth control — an unconfigured or
// unreachable store fails open (see infrastructure/rate-limit/upstash.ts) so
// it never locks out real users.
export type RateLimiter = {
  check(key: string): Promise<RateLimitDecision>;
};
