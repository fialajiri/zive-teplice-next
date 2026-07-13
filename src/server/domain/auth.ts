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

export type AuthUserRepository = {
  /**
   * Load a user by email including the `select:false` `hash`/`salt` fields.
   * Returns null when no such user exists. Secrets are returned ONLY here and
   * consumed by the use case — they are never exposed in a DTO or the session.
   */
  findByEmailWithSecret(email: string): Promise<UserWithSecret | null>;
};
