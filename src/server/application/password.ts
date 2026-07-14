import { z } from "zod";
import type { AuthUserRepository } from "@/server/domain/auth";
import type { Mailer } from "@/server/domain/mailer";
import type { PasswordHash } from "@/server/infrastructure/auth/password";
import { passwordResetEmail } from "@/server/infrastructure/email/templates";
import {
  err,
  notFound,
  ok,
  unexpected,
  validation,
  type FieldErrors,
  type Result,
} from "@/server/domain/result";

// The reset token lives for 1 hour, matching the legacy `reset.tokenExpiration`.
const RESET_TTL_MS = 60 * 60 * 1000;

// Everything the password flows need. Crypto / clock / URL building are injected
// so the use cases stay pure and testable (no real randomness, time, or env).
export type PasswordDeps = {
  users: AuthUserRepository;
  mailer: Mailer;
  hashPassword: (password: string) => Promise<PasswordHash>;
  verifyPassword: (
    password: string,
    salt: string,
    hash: string,
  ) => Promise<boolean>;
  generateToken: () => string;
  buildResetUrl: (token: string) => string;
  now: () => Date;
};

const newPasswordSchema = z
  .object({
    password: z.string().min(8, { error: "Heslo musí mít alespoň 8 znaků." }),
    confirmPassword: z.string(),
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
// One generic message for every invalid/expired/unknown token — never reveals
// which of those it was.
const INVALID_TOKEN = "Odkaz pro obnovení hesla je neplatný nebo vypršel.";

// ── Request a reset link ─────────────────────────────────────────────────────
// Returns the SAME generic OK whether or not the email matches a user (no
// account enumeration, gotcha #4). The token and recipient are never logged.
export async function requestPasswordReset(
  deps: PasswordDeps,
  email: string,
): Promise<Result<{ requested: true }>> {
  const parsed = z.email().safeParse(email?.trim());
  // A malformed address is an input-quality error, not an existence signal.
  if (!parsed.success) {
    return err(validation("Zadejte prosím platný e-mail."));
  }
  const normalizedEmail = parsed.data;

  try {
    const token = deps.generateToken();
    const expiresAt = new Date(deps.now().getTime() + RESET_TTL_MS);
    const matched = await deps.users.setResetToken(
      normalizedEmail,
      token,
      expiresAt,
    );

    if (matched) {
      const content = passwordResetEmail(deps.buildResetUrl(token));
      const sent = await deps.mailer.send({ to: normalizedEmail, ...content });
      // A reset email failing DOES matter — the user is otherwise stuck
      // (gotcha #6). Surface a retryable error without specifics.
      if (!sent.ok) {
        return err(
          unexpected("E-mail se nepodařilo odeslat. Zkuste to prosím znovu."),
        );
      }
    }

    // Identical response whether or not a user matched.
    return ok({ requested: true });
  } catch {
    return err(unexpected("Požadavek se nepodařilo zpracovat."));
  }
}

// ── Reset a password by token ────────────────────────────────────────────────
export async function resetPassword(
  deps: PasswordDeps,
  token: string,
  input: { password: string; confirmPassword: string },
): Promise<Result<{ id: string }>> {
  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation(INVALID_INPUT, toFieldErrors(parsed.error)));
  }

  try {
    const match = await deps.users.findByResetToken(token);
    if (!match) return err(validation(INVALID_TOKEN));

    // Expired (or missing expiry) → consume the token and refuse.
    if (!match.expiresAt || match.expiresAt.getTime() < deps.now().getTime()) {
      await deps.users.clearReset(match.id);
      return err(validation(INVALID_TOKEN));
    }

    const { salt, hash } = await deps.hashPassword(parsed.data.password);
    const set = await deps.users.setPassword(match.id, { hash, salt });
    if (!set) return err(unexpected("Heslo se nepodařilo změnit."));

    // Single-use: consume the token now that the password is set.
    await deps.users.clearReset(match.id);
    return ok({ id: match.id });
  } catch {
    return err(unexpected("Heslo se nepodařilo změnit."));
  }
}

// ── Change a password while logged in ────────────────────────────────────────
export async function changePassword(
  deps: PasswordDeps,
  id: string,
  currentPassword: string,
  input: { password: string; confirmPassword: string },
): Promise<Result<{ id: string }>> {
  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation(INVALID_INPUT, toFieldErrors(parsed.error)));
  }

  try {
    const user = await deps.users.findByIdWithSecret(id);
    if (!user) return err(notFound("Účet nebyl nalezen."));

    const currentOk = await deps.verifyPassword(
      currentPassword,
      user.salt,
      user.hash,
    );
    if (!currentOk) {
      return err(
        validation(INVALID_INPUT, {
          currentPassword: ["Současné heslo není správné."],
        }),
      );
    }

    const { salt, hash } = await deps.hashPassword(parsed.data.password);
    const set = await deps.users.setPassword(id, { hash, salt });
    if (!set) return err(unexpected("Heslo se nepodařilo změnit."));

    return ok({ id });
  } catch {
    return err(unexpected("Heslo se nepodařilo změnit."));
  }
}
