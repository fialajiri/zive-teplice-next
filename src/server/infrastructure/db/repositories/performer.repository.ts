import "server-only";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "../connection";
import { UserModel, type UserDocument } from "../models/user.model";
import type {
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
  };
}
