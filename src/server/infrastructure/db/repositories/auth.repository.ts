import "server-only";
import { connectToDatabase } from "../connection";
import { UserModel, type UserDocument } from "../models/user.model";
import type {
  AuthUserRepository,
  Role,
  UserWithSecret,
} from "@/server/domain/auth";

// Legacy rows store `role` as a free String; normalise anything that isn't the
// literal "admin" down to "user" so the domain only ever sees the two roles.
function toRole(role: string): Role {
  return role === "admin" ? "admin" : "user";
}

type UserWithSecretDoc = UserDocument & { hash?: string; salt?: string };

export function createAuthUserRepository(): AuthUserRepository {
  return {
    async findByEmailWithSecret(email) {
      await connectToDatabase();

      const doc = await UserModel.findOne({ email })
        .select("+hash +salt")
        .lean<UserWithSecretDoc | null>();

      // A user without both secrets can never authenticate; treat as absent
      // rather than returning a half-populated record.
      if (!doc || !doc.hash || !doc.salt) return null;

      const user: UserWithSecret = {
        id: doc._id.toString(),
        username: doc.username,
        role: toRole(doc.role),
        hash: doc.hash,
        salt: doc.salt,
      };
      return user;
    },
  };
}
