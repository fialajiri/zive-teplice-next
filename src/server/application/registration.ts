import { z } from "zod";
import type { PerformerRepository } from "@/server/domain/performer";
import type { ImageDto } from "@/server/domain/news";
import type { PasswordHash } from "@/server/infrastructure/auth/password";
import type { SettingsRepository } from "@/server/domain/settings";
import type { EventRepository } from "@/server/domain/event";
import {
  err,
  ok,
  unexpected,
  validation,
  type FieldErrors,
  type Result,
} from "@/server/domain/result";

// The registration use case is pure and framework-free: it enforces the
// registration gate, validates input, guarantees uniqueness, hashes the
// password, and persists. Auth (auto sign-in) and revalidation live in the
// action. `hashPassword` is injected so this stays testable without crypto/db.
export type RegistrationDeps = {
  performers: PerformerRepository;
  settings: SettingsRepository;
  events: EventRepository;
  hashPassword: (password: string) => Promise<PasswordHash>;
};

// The raw form shape (still holds the plaintext password + confirm). Never
// persisted as-is: `role`/`request` are set server-side, the password is hashed.
export type RegisterPerformerCommand = {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  description: string;
  image: ImageDto;
};

const imageInputSchema = z.object({
  imageUrl: z.url(),
  imageKey: z.string().trim().min(1),
});

const registerSchema = z
  .object({
    email: z.email({ error: "Zadejte platný e-mail." }).trim(),
    username: z
      .string()
      .trim()
      .min(3, { error: "Jméno musí mít alespoň 3 znaky." })
      .max(50, { error: "Jméno může mít nejvýše 50 znaků." }),
    password: z.string().min(8, { error: "Heslo musí mít alespoň 8 znaků." }),
    confirmPassword: z.string(),
    phoneNumber: z
      .string()
      .trim()
      .min(9, { error: "Zadejte platné telefonní číslo." }),
    description: z
      .string()
      .trim()
      .min(50, { error: "Popis musí mít alespoň 50 znaků." })
      .max(500, { error: "Popis může mít nejvýše 500 znaků." }),
    image: imageInputSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Hesla se neshodují.",
    path: ["confirmPassword"],
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

const INVALID_INPUT = "Zkontrolujte prosím zadané údaje.";
const REGISTRATION_CLOSED = "Registrace účinkujících je momentálně uzavřená.";

export async function registerUser(
  deps: RegistrationDeps,
  input: RegisterPerformerCommand,
): Promise<Result<{ id: string }>> {
  // Server-enforced gate FIRST — hiding the form is only UX (gotcha #2). Reads
  // fail safe (closed) inside getRegistrationOpen's repo, but we call the repo
  // directly here to keep the dependency explicit.
  let open: boolean;
  try {
    open = (await deps.settings.get()).registrationOpen;
  } catch {
    return err(unexpected("Registraci se nepodařilo ověřit."));
  }
  if (!open) return err(validation(REGISTRATION_CLOSED));

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation(INVALID_INPUT, toFieldErrors(parsed.error)));
  }
  const data = parsed.data;

  try {
    // Uniqueness — email is the login credential; username is displayed publicly.
    if (await deps.performers.findByEmail(data.email)) {
      return err(
        validation(INVALID_INPUT, {
          email: ["Tento e-mail je již zaregistrovaný."],
        }),
      );
    }
    if (await deps.performers.existsByUsername(data.username)) {
      return err(
        validation(INVALID_INPUT, {
          username: ["Toto jméno je již obsazené."],
        }),
      );
    }

    const { salt, hash } = await deps.hashPassword(data.password);

    const id = await deps.performers.create({
      email: data.email,
      username: data.username,
      hash,
      salt,
      phoneNumber: data.phoneNumber,
      description: data.description,
      image: data.image,
    });

    // Auto-request participation in the current ročník (decided: registering
    // implies wanting to take part). Best-effort — a failure here shouldn't
    // fail the whole registration; the performer just stays "notsend" and can
    // request participation manually from their account.
    try {
      const currentEvent = await deps.events.getCurrent();
      if (currentEvent) {
        await deps.performers.setRequest(id, "pending");
      }
    } catch {
      // Ignored — see comment above.
    }

    return ok({ id });
  } catch {
    return err(unexpected("Registraci se nepodařilo dokončit."));
  }
}
