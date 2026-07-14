import "server-only";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "../connection";
import { UserModel, type UserDocument } from "../models/user.model";
import type {
  ParticipationStatus,
  PerformerAccountDto,
  PerformerDto,
  PerformerRepository,
} from "@/server/domain/performer";
import { toImageDto } from "./mappers";

function toPerformerDto(doc: UserDocument): PerformerDto {
  return {
    id: doc._id.toString(),
    username: doc.username,
    description: doc.description,
    image: toImageDto(doc.image),
  };
}

const PARTICIPATION_STATUSES: readonly ParticipationStatus[] = [
  "notsend",
  "pending",
  "rejected",
  "approved",
];

// Legacy `request` is a free String — normalise anything unexpected to the safe
// default so the domain only ever sees the four known statuses.
function toParticipationStatus(value: string | undefined): ParticipationStatus {
  return PARTICIPATION_STATUSES.includes(value as ParticipationStatus)
    ? (value as ParticipationStatus)
    : "notsend";
}

function toPerformerAccountDto(doc: UserDocument): PerformerAccountDto {
  return {
    id: doc._id.toString(),
    email: doc.email,
    username: doc.username,
    phoneNumber: doc.phoneNumber,
    description: doc.description,
    request: toParticipationStatus(doc.request),
    image: toImageDto(doc.image),
  };
}

export function createPerformerRepository(): PerformerRepository {
  return {
    async list() {
      await connectToDatabase();
      const docs = await UserModel.find({ role: "user" })
        .sort({ username: 1 })
        .lean<UserDocument[]>();
      return docs.map(toPerformerDto);
    },
    async getById(id) {
      if (!isValidObjectId(id)) return null;
      await connectToDatabase();
      const doc = await UserModel.findOne({
        _id: id,
        role: "user",
      }).lean<UserDocument | null>();
      return doc ? toPerformerDto(doc) : null;
    },
    async listForAdmin() {
      await connectToDatabase();
      const docs = await UserModel.find({ role: "user" })
        .sort({ username: 1 })
        .lean<UserDocument[]>();
      return docs.map(toPerformerAccountDto);
    },
    async create(input) {
      await connectToDatabase();
      const doc = await UserModel.create({
        email: input.email,
        username: input.username,
        hash: input.hash,
        salt: input.salt,
        phoneNumber: input.phoneNumber,
        description: input.description,
        image: input.image,
        // Server-set, never from the client (gotcha #3). The schema also defaults
        // these, but we set them explicitly so intent is unmistakable.
        role: "user",
        request: "notsend",
      });
      return doc._id.toString();
    },
    async findByEmail(email) {
      await connectToDatabase();
      const doc = await UserModel.findOne({ email })
        .select("_id")
        .lean<{ _id: UserDocument["_id"] } | null>();
      return doc ? { id: doc._id.toString() } : null;
    },
    async existsByUsername(username) {
      await connectToDatabase();
      const count = await UserModel.countDocuments({ username }).limit(1);
      return count > 0;
    },
    async getAccountById(id) {
      if (!isValidObjectId(id)) return null;
      await connectToDatabase();
      const doc = await UserModel.findOne({
        _id: id,
        role: "user",
      }).lean<UserDocument | null>();
      return doc ? toPerformerAccountDto(doc) : null;
    },
    async update(id, input) {
      if (!isValidObjectId(id)) return null;
      await connectToDatabase();
      // Replace `image` only when a new one is supplied (mirrors news). `role`
      // and `request` are never in the update set — a performer can't change them.
      const set: Record<string, unknown> = {
        username: input.username,
        phoneNumber: input.phoneNumber,
        description: input.description,
      };
      if (input.image) set.image = input.image;
      const doc = await UserModel.findOneAndUpdate(
        { _id: id, role: "user" },
        { $set: set },
        { returnDocument: "after" },
      ).lean<UserDocument | null>();
      return doc ? toPerformerDto(doc) : null;
    },
    async delete(id) {
      if (!isValidObjectId(id)) return null;
      await connectToDatabase();
      // Scoped to role:"user" so this path can never delete an admin account.
      const doc = await UserModel.findOneAndDelete({
        _id: id,
        role: "user",
      }).lean<UserDocument | null>();
      return doc ? toPerformerDto(doc) : null;
    },
    async setRequest(id, status) {
      if (!isValidObjectId(id)) return false;
      await connectToDatabase();
      const res = await UserModel.updateOne(
        { _id: id, role: "user" },
        { $set: { request: status } },
      );
      return res.matchedCount > 0;
    },
  };
}
