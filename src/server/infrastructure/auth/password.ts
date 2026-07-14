import "server-only";
import { pbkdf2, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const pbkdf2Async = promisify(pbkdf2);

// A `{ salt, hash }` pair, both hex strings, in the exact legacy storage format.
export type PasswordHash = { salt: string; hash: string };

// Legacy passport-local-mongoose defaults. These MUST match exactly or every
// existing login fails. The salt is passed to pbkdf2 as the stored hex STRING
// directly (NOT decoded to bytes) — that is how passport-local-mongoose derived
// the original hashes. See docs/03-backend-plan.md §1 and docs/05-data-and-auth-migration.md.
const PBKDF2 = { iterations: 25_000, keylen: 512, digest: "sha256" as const };

/**
 * Verify a plaintext password against a legacy `{ salt, hash }` pair (both hex
 * strings from the `users` collection). Returns false — never throws — for
 * malformed input so callers can treat any failure as "invalid credentials".
 */
export async function verifyLegacyPassword(
  password: string,
  salt: string | undefined | null,
  hash: string | undefined | null,
): Promise<boolean> {
  if (!password || !salt || !hash) return false;

  const expected = Buffer.from(hash, "hex");
  // A hash that isn't valid hex (or is empty) yields a short/empty buffer;
  // bail before deriving so timingSafeEqual never sees mismatched lengths.
  if (expected.length !== PBKDF2.keylen) return false;

  const derived = await pbkdf2Async(
    password,
    salt,
    PBKDF2.iterations,
    PBKDF2.keylen,
    PBKDF2.digest,
  );

  return (
    derived.length === expected.length && timingSafeEqual(derived, expected)
  );
}

/**
 * Derive a fresh `{ salt, hash }` pair for a new or changed password, in the
 * IDENTICAL legacy format so the result verifies through `verifyLegacyPassword`
 * with zero special-casing — new users share the Phase 2 login path. A random
 * 32-byte salt is stored as its hex STRING and fed to pbkdf2 as that string
 * (not decoded to bytes), exactly as legacy passport-local-mongoose did.
 */
export async function hashPassword(password: string): Promise<PasswordHash> {
  const salt = randomBytes(32).toString("hex");

  const derived = await pbkdf2Async(
    password,
    salt,
    PBKDF2.iterations,
    PBKDF2.keylen,
    PBKDF2.digest,
  );

  return { salt, hash: derived.toString("hex") };
}
