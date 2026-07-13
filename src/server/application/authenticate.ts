import { z } from "zod";
import type { AuthUserRepository, SessionUser } from "@/server/domain/auth";
import { err, ok, type Result } from "@/server/domain/result";

// A single opaque failure: unknown email and wrong password are indistinguishable
// to the caller so the UI can't be used to enumerate accounts.
export type AuthFailure = { kind: "invalid_credentials" };

export type AuthenticateDeps = {
  users: AuthUserRepository;
  verifyPassword: (
    password: string,
    salt: string,
    hash: string,
  ) => Promise<boolean>;
};

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
});

export type Credentials = { email: unknown; password: unknown };

const invalidCredentials = err<AuthFailure>({ kind: "invalid_credentials" });

/**
 * Verify credentials against the legacy user store. Returns the session user on
 * success, or a generic `invalid_credentials` failure for bad input, unknown
 * email, or wrong password alike. Never throws for the normal failure paths.
 */
export async function authenticateUser(
  deps: AuthenticateDeps,
  input: Credentials,
): Promise<Result<SessionUser, AuthFailure>> {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) return invalidCredentials;

  const { email, password } = parsed.data;

  const user = await deps.users.findByEmailWithSecret(email);
  if (!user) return invalidCredentials;

  const valid = await deps.verifyPassword(password, user.salt, user.hash);
  if (!valid) return invalidCredentials;

  const sessionUser: SessionUser = {
    id: user.id,
    username: user.username,
    role: user.role,
  };
  return ok(sessionUser);
}
