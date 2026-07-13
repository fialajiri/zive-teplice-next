import type { DefaultSession } from "next-auth";
import type { Role } from "@/server/domain/auth";

// Module augmentation adding our `id`/`role` to the session and JWT. Auth.js v5
// keeps these on "next-auth" (Session/User) and "next-auth/jwt" (JWT).

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
