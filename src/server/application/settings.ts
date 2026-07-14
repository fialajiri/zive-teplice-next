import type {
  AppSettingsDto,
  SettingsRepository,
} from "@/server/domain/settings";
import { err, ok, unexpected, type Result } from "@/server/domain/result";

// Read the registration gate. This one deliberately does NOT return a Result:
// callers (the public RSC, the register action) only ever need the boolean, and
// any read failure must fail SAFE — closed — so a database hiccup can never open
// registration (gotcha #2).
export async function getRegistrationOpen(
  repo: SettingsRepository,
): Promise<boolean> {
  try {
    const settings = await repo.get();
    return settings.registrationOpen;
  } catch {
    return false;
  }
}

// Admin write. Returns a Result so the action can surface a failure to the UI.
export async function setRegistrationOpen(
  repo: SettingsRepository,
  open: boolean,
): Promise<Result<AppSettingsDto>> {
  try {
    return ok(await repo.setRegistrationOpen(open));
  } catch {
    return err(unexpected("Nepodařilo se změnit nastavení registrace."));
  }
}
