import type { ImageDto } from "./news";

// Public-facing performer (legacy user with role "user"). Deliberately excludes
// email/phone/auth fields — public pages only need the profile. Contact/admin data
// arrives in later phases behind auth.
//
// Note: the legacy `type` ("prodejce" | "umělec") is intentionally NOT surfaced — the
// distinction is retired on the web. The field is left in the DB but unused.
export type PerformerDto = {
  id: string;
  username: string;
  description: string;
  image: ImageDto | null;
};

// The already-validated record the registration use case hands the repository.
// `hash`/`salt` are derived in the use case (never the raw password); `role` and
// `request` are set by the repository, never accepted from the caller (gotcha #3).
export type CreatePerformerInput = {
  email: string;
  username: string;
  hash: string;
  salt: string;
  phoneNumber: string;
  description: string;
  image: ImageDto;
};

export type PerformerRepository = {
  list(): Promise<PerformerDto[]>;
  getById(id: string): Promise<PerformerDto | null>;
  // ── Write path ──────────────────────────────────────────────────────────────
  /** Persist a new performer (`role:"user"`, `request:"notsend"`); returns its id. */
  create(input: CreatePerformerInput): Promise<string>;
  /** Uniqueness checks for registration. Email is the login credential. */
  findByEmail(email: string): Promise<{ id: string } | null>;
  existsByUsername(username: string): Promise<boolean>;
};
