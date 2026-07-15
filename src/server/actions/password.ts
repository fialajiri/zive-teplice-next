"use server";

import { auth } from "@/auth";
import { container } from "@/server/container";
import {
  requestPasswordReset,
  resetPassword,
  changePassword,
  type PasswordDeps,
} from "@/server/application/password";
import {
  hashPassword,
  verifyLegacyPassword,
  generateResetToken,
} from "@/server/infrastructure/auth/password";
import type { DomainError, FieldErrors } from "@/server/domain/result";
import { checkRateLimit } from "@/server/application/rate-limit";
import { getClientIp } from "@/server/infrastructure/rate-limit/client-ip";

export type PasswordActionResult =
  { ok: true } | { ok: false; error: string; fieldErrors?: FieldErrors };

const TOO_MANY_ATTEMPTS: PasswordActionResult = {
  ok: false,
  error:
    "Příliš mnoho žádostí o obnovu hesla. Zkuste to prosím za chvíli znovu.",
};

// Build the reset link against THIS app's origin (env), never a hard-coded host.
function buildResetUrl(token: string): string {
  const base = (process.env.AUTH_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
  return `${base}/obnova-hesla/${token}`;
}

function passwordDeps(): PasswordDeps {
  return {
    users: container.authUserRepository,
    mailer: container.mailer,
    hashPassword,
    verifyPassword: verifyLegacyPassword,
    generateToken: generateResetToken,
    buildResetUrl,
    now: () => new Date(),
  };
}

function mapError(error: DomainError): PasswordActionResult {
  if (error.kind === "validation") {
    return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
  }
  return { ok: false, error: error.message };
}

export async function requestPasswordResetAction(
  email: string,
): Promise<PasswordActionResult> {
  const normalizedEmail = String(email ?? "");

  const { allowed } = await checkRateLimit(container.passwordResetRateLimiter, {
    ip: await getClientIp(),
    identifier: normalizedEmail,
  });
  if (!allowed) return TOO_MANY_ATTEMPTS;

  const result = await requestPasswordReset(passwordDeps(), normalizedEmail);
  if (!result.ok) return mapError(result.error);
  return { ok: true };
}

export async function resetPasswordAction(
  token: string,
  password: string,
  confirmPassword: string,
): Promise<PasswordActionResult> {
  const result = await resetPassword(passwordDeps(), String(token ?? ""), {
    password: String(password ?? ""),
    confirmPassword: String(confirmPassword ?? ""),
  });
  if (!result.ok) return mapError(result.error);
  return { ok: true };
}

export async function changePasswordAction(input: {
  currentPassword: string;
  password: string;
  confirmPassword: string;
}): Promise<PasswordActionResult> {
  // Always the logged-in user's own password — derive the id from the session,
  // never from a client field.
  const session = await auth();
  if (!session) return { ok: false, error: "Nedostatečná oprávnění." };

  const result = await changePassword(
    passwordDeps(),
    session.user.id,
    String(input?.currentPassword ?? ""),
    {
      password: String(input?.password ?? ""),
      confirmPassword: String(input?.confirmPassword ?? ""),
    },
  );
  if (!result.ok) return mapError(result.error);
  return { ok: true };
}
