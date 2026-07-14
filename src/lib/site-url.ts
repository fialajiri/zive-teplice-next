// Canonical site origin for metadata/sitemap — from env, never a hard-coded host.
export function getSiteUrl(): string {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}
