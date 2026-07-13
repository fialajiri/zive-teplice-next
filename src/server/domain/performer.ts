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

export type PerformerRepository = {
  list(): Promise<PerformerDto[]>;
  getById(id: string): Promise<PerformerDto | null>;
};
