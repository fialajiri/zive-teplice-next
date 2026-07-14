// App-wide settings (a single config document). New in Phase 5 — the legacy app
// had no settings collection. Currently just the admin-controlled registration
// gate; more flags can join this shape later.

export type AppSettingsDto = {
  registrationOpen: boolean;
};

export type SettingsRepository = {
  /** Current settings; an absent document means the safe default (all closed). */
  get(): Promise<AppSettingsDto>;
  /** Upsert the single settings doc's registration flag; returns the new state. */
  setRegistrationOpen(open: boolean): Promise<AppSettingsDto>;
};
