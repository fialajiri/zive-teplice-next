"use server";

import { AuthError } from "next-auth";
import { auth, signIn, signOut } from "@/auth";

// Generic message for every failure mode — no unknown-email vs wrong-password
// distinction (docs/plans/phase-2-auth.md §6).
const INVALID_CREDENTIALS = "Neplatný e-mail nebo heslo.";

export type LoginResult =
  { ok: true; redirectTo: string } | { ok: false; error: string };

// Only allow same-origin absolute paths as a post-login destination; reject
// protocol-relative (`//host`) and backslash tricks to avoid open redirects.
function safeCallbackUrl(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/")) return null;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null;
  return raw;
}

// Returns a destination instead of redirecting: the caller navigates with a
// FULL page load so the client SessionProvider re-reads the new session (a
// server-side redirect() is a soft nav and would leave the header stale).
export async function login(formData: FormData): Promise<LoginResult> {
  const email = formData.get("email");
  const password = formData.get("password");
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));

  try {
    await signIn("credentials", {
      email: typeof email === "string" ? email : "",
      password: typeof password === "string" ? password : "",
      redirect: false,
    });
  } catch (error) {
    // Invalid credentials surface as AuthError; anything else must propagate.
    if (error instanceof AuthError)
      return { ok: false, error: INVALID_CREDENTIALS };
    throw error;
  }

  // signIn set the session cookie above; auth() reads it back within this same
  // action so admins land on /admin and everyone else on /ucet. Falls back to
  // /ucet (open to any role) if the destination can't be resolved.
  const session = await auth();
  const redirectTo =
    callbackUrl ?? (session?.user.role === "admin" ? "/admin" : "/ucet");
  return { ok: true, redirectTo };
}

// Clears the session cookie only; the caller navigates with a full page load so
// the SessionProvider drops the stale authenticated state.
export async function logout(): Promise<void> {
  await signOut({ redirect: false });
}
