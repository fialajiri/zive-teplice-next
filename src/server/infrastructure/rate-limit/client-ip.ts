import "server-only";
import { headers } from "next/headers";

// Vercel sets x-forwarded-for on every request; the first entry is the
// original client. Falls back to x-real-ip, then a constant so requests with
// neither header still share one rate-limit bucket instead of bypassing it.
export async function getClientIp(): Promise<string> {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  const firstForwarded = forwardedFor?.split(",")[0]?.trim();
  if (firstForwarded) return firstForwarded;
  return requestHeaders.get("x-real-ip") ?? "unknown";
}
