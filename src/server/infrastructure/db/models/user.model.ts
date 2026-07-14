import "server-only";
import { Schema, model, models, type Model, type Types } from "mongoose";

// Mirrors the legacy passport-local-mongoose user document. Field names/types are
// kept identical so existing Atlas rows load unchanged. `hash`/`salt` were added at
// runtime by passport-local-mongoose in the old app; we declare them (select:false)
// so Phase 2 auth can read them. See docs/05-data-and-auth-migration.md.

export type UserDocument = {
  _id: Types.ObjectId;
  email: string;
  username: string;
  authStrategy: string;
  hash?: string;
  salt?: string;
  phoneNumber: string;
  description: string;
  type?: string; // legacy 'prodejce' | 'umělec' — retired on the web, kept for existing rows; new users omit it
  role: string; // 'user' | 'admin'
  event?: Types.ObjectId | null;
  request: string; // notsend | pending | rejected | approved
  image: { imageUrl: string; imageKey: string };
  reset?: { token?: string; tokenExpiration?: Date };
  createdAt: Date;
  updatedAt: Date;
};

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true },
    username: { type: String, required: true },
    authStrategy: { type: String, default: "local" },
    hash: { type: String, select: false },
    salt: { type: String, select: false },
    phoneNumber: { type: String, required: true },
    // Optional at registration (decided Phase 5 §0) — default "" so a new user
    // may omit it. Existing legacy rows already carry a value; unaffected.
    description: { type: String, default: "" },
    type: { type: String }, // legacy/retired — no longer required or used
    role: { type: String, default: "user" },
    event: { type: Schema.Types.ObjectId, ref: "Event", default: null },
    request: { type: String, default: "notsend" },
    image: {
      imageUrl: { type: String, required: true },
      imageKey: { type: String, required: true },
    },
    reset: {
      token: { type: String },
      tokenExpiration: { type: Date },
    },
    // Legacy passport refreshToken[] is dead (Auth.js owns sessions). Left undeclared
    // so existing subdocs are simply ignored; never read or written.
  },
  { timestamps: true },
);

export const UserModel: Model<UserDocument> =
  (models.User as Model<UserDocument>) ??
  model<UserDocument>("User", userSchema, "users");
