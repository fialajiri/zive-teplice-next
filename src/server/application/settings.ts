import { z } from "zod";
import type {
  AppSettingsDto,
  SettingsRepository,
  SocialLinksInput,
} from "@/server/domain/settings";
import {
  err,
  ok,
  unexpected,
  validation,
  type FieldErrors,
  type Result,
} from "@/server/domain/result";

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

// Read the header/footer social links. Like the registration gate, this fails
// safe: a database hiccup hides the links rather than surfacing an error.
export async function getSocialLinks(
  repo: SettingsRepository,
): Promise<SocialLinksInput> {
  try {
    const settings = await repo.get();
    return {
      facebookUrl: settings.facebookUrl,
      instagramUrl: settings.instagramUrl,
    };
  } catch {
    return { facebookUrl: "", instagramUrl: "" };
  }
}

// Empty is allowed (hides the link); anything non-empty must be a valid URL.
const socialUrlSchema = z
  .string()
  .trim()
  .max(300)
  .refine((value) => value === "" || z.url().safeParse(value).success, {
    error: "Zadejte platnou URL adresu, nebo pole nechte prázdné.",
  });

const socialLinksSchema = z.object({
  facebookUrl: socialUrlSchema,
  instagramUrl: socialUrlSchema,
});

function toFieldErrors(error: z.ZodError): FieldErrors {
  const flat = z.flattenError(error);
  const out: FieldErrors = {};
  for (const [field, messages] of Object.entries(flat.fieldErrors)) {
    if (Array.isArray(messages) && messages.length > 0) {
      out[field] = messages as string[];
    }
  }
  return out;
}

// Admin write. Empty strings are valid (hide the corresponding link).
export async function setSocialLinks(
  repo: SettingsRepository,
  input: SocialLinksInput,
): Promise<Result<AppSettingsDto>> {
  const parsed = socialLinksSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      validation(
        "Zkontrolujte prosím zadané odkazy.",
        toFieldErrors(parsed.error),
      ),
    );
  }
  try {
    return ok(await repo.setSocialLinks(parsed.data));
  } catch {
    return err(unexpected("Nepodařilo se uložit odkazy na sociální sítě."));
  }
}
