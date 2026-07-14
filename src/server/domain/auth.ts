// Auth domain: the shape of an authenticated user the session carries, and the
// port the authenticate use case depends on. Zero framework imports.
//
// `type` is deliberately absent — the prodejce/umělec distinction is retired
// (Phase 1). Sessions carry only `id` and `role`. See docs/plans/phase-2-auth.md.

export type Role = "user" | "admin";

/** What ends up in the session/JWT after a successful sign-in. */
export type SessionUser = {
  id: string;
  username: string;
  role: Role;
};

/** A user row loaded with its secrets, for verification only. Never leaves the auth layer. */
export type UserWithSecret = {
  id: string;
  username: string;
  role: Role;
  hash: string;
  salt: string;
};

/** A reset-token lookup result — the owning user id and the token's expiry. */
export type ResetTokenMatch = { id: string; expiresAt: Date | null };

/** A `{ hash, salt }` secret pair (hex strings), as stored on the user row. */
export type PasswordSecret = { hash: string; salt: string };

export type AuthUserRepository = {
  /**
   * Load a user by email including the `select:false` `hash`/`salt` fields.
   * Returns null when no such user exists. Secrets are returned ONLY here (and
   * `findByIdWithSecret`) and consumed by the use case — never in a DTO/session.
   */
  findByEmailWithSecret(email: string): Promise<UserWithSecret | null>;
  /** Same as above but keyed by id (for the logged-in change-password flow). */
  findByIdWithSecret(id: string): Promise<UserWithSecret | null>;
  /**
   * Store a single-use reset token + expiry for the user with this email.
   * Returns whether a user matched — but callers MUST NOT reveal that to the
   * client (no account enumeration, gotcha #4).
   */
  setResetToken(
    email: string,
    token: string,
    expiresAt: Date,
  ): Promise<boolean>;
  /** Resolve a reset token to its owner + expiry; null if no token matches. */
  findByResetToken(token: string): Promise<ResetTokenMatch | null>;
  /** Overwrite the `hash`/`salt`; false if the id is unknown. */
  setPassword(id: string, secret: PasswordSecret): Promise<boolean>;
  /** Clear the `reset` sub-document (single-use token consumed). */
  clearReset(id: string): Promise<void>;
};
