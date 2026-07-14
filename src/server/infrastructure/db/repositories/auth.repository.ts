import "server-only";
import { isValidObjectId } from "mongoose";
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

function toUserWithSecret(doc: UserWithSecretDoc): UserWithSecret | null {
  // A user without both secrets can never authenticate; treat as absent
  // rather than returning a half-populated record.
  if (!doc.hash || !doc.salt) return null;
  return {
    id: doc._id.toString(),
    username: doc.username,
    role: toRole(doc.role),
    hash: doc.hash,
    salt: doc.salt,
  };
}

export function createAuthUserRepository(): AuthUserRepository {
  return {
    async findByEmailWithSecret(email) {
      await connectToDatabase();
      const doc = await UserModel.findOne({ email })
        .select("+hash +salt")
        .lean<UserWithSecretDoc | null>();
      return doc ? toUserWithSecret(doc) : null;
    },
    async findByIdWithSecret(id) {
      if (!isValidObjectId(id)) return null;
      await connectToDatabase();
      const doc = await UserModel.findById(id)
        .select("+hash +salt")
        .lean<UserWithSecretDoc | null>();
      return doc ? toUserWithSecret(doc) : null;
    },
    async setResetToken(email, token, expiresAt) {
      await connectToDatabase();
      const res = await UserModel.updateOne(
        { email },
        { $set: { reset: { token, tokenExpiration: expiresAt } } },
      );
      return res.matchedCount > 0;
    },
    async findByResetToken(token) {
      await connectToDatabase();
      // An empty/missing token must never match a row with no reset set.
      if (!token) return null;
      const doc = await UserModel.findOne({ "reset.token": token }).lean<
        (UserDocument & { reset?: { tokenExpiration?: Date } }) | null
      >();
      if (!doc) return null;
      return {
        id: doc._id.toString(),
        expiresAt: doc.reset?.tokenExpiration ?? null,
      };
    },
    async setPassword(id, secret) {
      if (!isValidObjectId(id)) return false;
      await connectToDatabase();
      const res = await UserModel.updateOne(
        { _id: id },
        { $set: { hash: secret.hash, salt: secret.salt } },
      );
      return res.matchedCount > 0;
    },
    async clearReset(id) {
      if (!isValidObjectId(id)) return;
      await connectToDatabase();
      await UserModel.updateOne({ _id: id }, { $unset: { reset: "" } });
    },
  };
}
