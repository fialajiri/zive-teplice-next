import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { container } from "@/server/container";
import { authenticateUser } from "@/server/application/authenticate";
import { verifyLegacyPassword } from "@/server/infrastructure/auth/password";
import type { Role } from "@/server/domain/auth";

// 30 days. Legacy stored expiry as an eval()'d expression; we parse a plain
// integer of seconds instead (docs/plans/phase-2-auth.md §6).
const DEFAULT_MAX_AGE = 60 * 60 * 24 * 30;

function sessionMaxAge(): number {
  const parsed = Number(process.env.SESSION_MAX_AGE);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_AGE;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Credentials requires a stateless JWT session (no DB adapter). id/role are
  // copied onto the token in the jwt callback and exposed on session.user.
  session: { strategy: "jwt", maxAge: sessionMaxAge() },
  pages: { signIn: "/prihlaseni" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Heslo", type: "password" },
      },
      // Thin: all "who is this user" logic lives in the use case. Returns the
      // user object on success or null (→ generic CredentialsSignin) on failure.
      authorize: async (credentials) => {
        const result = await authenticateUser(
          {
            users: container.authUserRepository,
            verifyPassword: verifyLegacyPassword,
          },
          { email: credentials.email, password: credentials.password },
        );
        if (!result.ok) return null;

        return {
          id: result.value.id,
          name: result.value.username,
          role: result.value.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      // `user` is only present on the initial sign-in.
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      // Custom JWT claims read back as `unknown` across next-auth's re-export
      // boundary; narrow them to the shapes we set in the jwt callback.
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      return session;
    },
  },
});
