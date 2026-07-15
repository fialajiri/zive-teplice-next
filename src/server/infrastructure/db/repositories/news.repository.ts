import "server-only";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "../connection";
import { NewsModel, type NewsDocument } from "../models/news.model";
import type { NewsDto, NewsRepository } from "@/server/domain/news";
import { toImageDto, toUncroppedImageDto } from "./mappers";

function toNewsDto(doc: NewsDocument): NewsDto {
  return {
    id: doc._id.toString(),
    title: doc.title,
    message: doc.message ?? null,
    image: toImageDto(doc.image),
    secondaryImage: toUncroppedImageDto(doc.secondaryImage),
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
    async listPage({ page, pageSize }) {
      await connectToDatabase();
      const [docs, total] = await Promise.all([
        // `_id` is a tiebreaker: createdAt alone isn't unique enough to keep
        // .skip/.limit deterministic across two same-millisecond inserts.
        NewsModel.find()
          .sort({ createdAt: -1, _id: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .lean<NewsDocument[]>(),
        NewsModel.countDocuments(),
      ]);
      return { items: docs.map(toNewsDto), total };
    },
    async listByDateRange(start, end) {
      await connectToDatabase();
      const docs = await NewsModel.find({
        createdAt: { $gte: new Date(start), $lt: new Date(end) },
      })
        .sort({ createdAt: -1 })
        .lean<NewsDocument[]>();
      return docs.map(toNewsDto);
    },
    async listDistinctYears() {
      await connectToDatabase();
      const rows = await NewsModel.aggregate<{ _id: number }>([
        { $group: { _id: { $year: "$createdAt" } } },
        { $sort: { _id: -1 } },
      ]);
      return rows.map((row) => row._id);
    },
    async getById(id) {
      if (!isValidObjectId(id)) return null;
      await connectToDatabase();
      const doc = await NewsModel.findById(id).lean<NewsDocument | null>();
      return doc ? toNewsDto(doc) : null;
    },
    async create(input) {
      await connectToDatabase();
      const doc = await NewsModel.create({
        title: input.title,
        message: input.message,
        image: input.image,
        secondaryImage: input.secondaryImage,
      });
      return doc._id.toString();
    },
    async update(id, input) {
      if (!isValidObjectId(id)) return null;
      await connectToDatabase();
      // Replace `image` only when a new one is supplied — otherwise the existing
      // image (and its S3 key) is left untouched. `secondaryImage` is tri-state:
      // undefined = leave alone, an object = set/replace, null = explicitly remove.
      const set: Record<string, unknown> = {
        title: input.title,
        message: input.message,
      };
      const unset: Record<string, unknown> = {};
      if (input.image) set.image = input.image;
      if (input.secondaryImage !== undefined) {
        if (input.secondaryImage === null) unset.secondaryImage = "";
        else set.secondaryImage = input.secondaryImage;
      }
      const updateOp: Record<string, unknown> = { $set: set };
      if (Object.keys(unset).length > 0) updateOp.$unset = unset;
      const doc = await NewsModel.findByIdAndUpdate(id, updateOp, {
        returnDocument: "after",
      }).lean<NewsDocument | null>();
      return doc ? toNewsDto(doc) : null;
    },
    async delete(id) {
      if (!isValidObjectId(id)) return null;
      await connectToDatabase();
      const doc = await NewsModel.findByIdAndDelete(
        id,
      ).lean<NewsDocument | null>();
      return doc ? toNewsDto(doc) : null;
    },
  };
}
