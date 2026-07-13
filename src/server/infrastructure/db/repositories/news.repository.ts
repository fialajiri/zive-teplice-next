import "server-only";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "../connection";
import { NewsModel, type NewsDocument } from "../models/news.model";
import type { NewsDto, NewsRepository } from "@/server/domain/news";
import { toImageDto } from "./mappers";

function toNewsDto(doc: NewsDocument): NewsDto {
  return {
    id: doc._id.toString(),
    title: doc.title,
    message: doc.message ?? null,
    image: toImageDto(doc.image),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function createNewsRepository(): NewsRepository {
  return {
    async list() {
      await connectToDatabase();
      const docs = await NewsModel.find()
        .sort({ createdAt: -1 })
        .lean<NewsDocument[]>();
      return docs.map(toNewsDto);
    },
    async getById(id) {
      if (!isValidObjectId(id)) return null;
      await connectToDatabase();
      const doc = await NewsModel.findById(id).lean<NewsDocument | null>();
      return doc ? toNewsDto(doc) : null;
    },
  };
}
