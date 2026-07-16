// App-wide settings (a single config document). New in Phase 5 — the legacy app
// had no settings collection. Currently the admin-controlled registration gate
// and the header/footer social links; more flags can join this shape later.

export type AppSettingsDto = {
  registrationOpen: boolean;
  facebookUrl: string;
  instagramUrl: string;
};

export type SocialLinksInput = {
  facebookUrl: string;
  instagramUrl: string;
};

export type SettingsRepository = {
  /** Current settings; an absent document means the safe defaults. */
  get(): Promise<AppSettingsDto>;
  /** Upsert the single settings doc's registration flag; returns the new state. */
  setRegistrationOpen(open: boolean): Promise<AppSettingsDto>;
  /** Upsert the single settings doc's social links; returns the new state. */
  setSocialLinks(input: SocialLinksInput): Promise<AppSettingsDto>;
};
