import type { ImageDto } from "./news";

// Public-facing performer (legacy user with role "user"). Deliberately excludes
// email/phone/auth fields — public pages only need the profile. Contact/admin data
// arrives in later phases behind auth.
export type PerformerType = "prodejce" | "umělec";

export type PerformerDto = {
  id: string;
  username: string;
  description: string;
  type: PerformerType;
  image: ImageDto | null;
};

export type PerformerRepository = {
  list(): Promise<PerformerDto[]>;
  getById(id: string): Promise<PerformerDto | null>;
};
