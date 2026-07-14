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

// Participation lifecycle for the current ročník (legacy `user.request`).
export type ParticipationStatus =
  "notsend" | "pending" | "rejected" | "approved";

// The performer's own (or an admin's) view of an account — includes the contact
// and participation fields the public `PerformerDto` deliberately omits.
export type PerformerAccountDto = {
  id: string;
  email: string;
  username: string;
  phoneNumber: string;
  description: string;
  request: ParticipationStatus;
  image: ImageDto | null;
};

// Self-editable profile fields. Deliberately EXCLUDES email/role/request — a
// performer can never change their own role or participation via this path
// (gotcha #3). Image is present only when replacing the existing one.
export type UpdatePerformerInput = {
  username: string;
  phoneNumber: string;
  description: string;
  image?: ImageDto;
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
  /** Admin view of all performers — includes email/phone/request. */
  listForAdmin(): Promise<PerformerAccountDto[]>;
  // ── Write path ──────────────────────────────────────────────────────────────
  /** Persist a new performer (`role:"user"`, `request:"notsend"`); returns its id. */
  create(input: CreatePerformerInput): Promise<string>;
  /** Uniqueness checks for registration. Email is the login credential. */
  findByEmail(email: string): Promise<{ id: string } | null>;
  existsByUsername(username: string): Promise<boolean>;
  /** The full account record (contact + participation), or null if unknown. */
  getAccountById(id: string): Promise<PerformerAccountDto | null>;
  /** Update profile fields (image only when supplied); null if id is unknown. */
  update(id: string, input: UpdatePerformerInput): Promise<PerformerDto | null>;
  /** Remove the performer; returns the deleted row (for its image key) or null. */
  delete(id: string): Promise<PerformerDto | null>;
  /** Set the participation status; false if the id is unknown. */
  setRequest(id: string, status: ParticipationStatus): Promise<boolean>;
};
