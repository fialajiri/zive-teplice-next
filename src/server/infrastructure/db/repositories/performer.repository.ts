import "server-only";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "../connection";
import { UserModel, type UserDocument } from "../models/user.model";
import type {
  PerformerDto,
  PerformerRepository,
  PerformerType,
} from "@/server/domain/performer";
import { toImageDto } from "./mappers";

function normalizeType(value: string): PerformerType {
  return value === "prodejce" ? "prodejce" : "umělec";
}

function toPerformerDto(doc: UserDocument): PerformerDto {
  return {
    id: doc._id.toString(),
    username: doc.username,
    description: doc.description,
    type: normalizeType(doc.type),
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
  };
}
