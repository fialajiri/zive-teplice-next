import "server-only";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "../connection";
import { GalleryModel, type GalleryDocument } from "../models/gallery.model";
import type { GalleryDto, GalleryRepository } from "@/server/domain/gallery";
import { toImageDto, toPublicUrl } from "./mappers";

function toGalleryDto(doc: GalleryDocument): GalleryDto {
  return {
    id: doc._id.toString(),
    name: doc.name ?? null,
    featuredImage: toImageDto(doc.featuredImage),
    images: (doc.images ?? [])
      .filter((img) => img.imageUrl && img.imageKey)
      .map((img) => ({
        id: img._id ? img._id.toString() : null,
        imageUrl: toPublicUrl(img.imageUrl as string),
        imageKey: img.imageKey as string,
      })),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function createGalleryRepository(): GalleryRepository {
  return {
    async list() {
      await connectToDatabase();
      const docs = await GalleryModel.find()
        .sort({ createdAt: -1 })
        .lean<GalleryDocument[]>();
      return docs.map(toGalleryDto);
    },
    async getById(id) {
      if (!isValidObjectId(id)) return null;
      await connectToDatabase();
      const doc = await GalleryModel.findById(
        id,
      ).lean<GalleryDocument | null>();
      return doc ? toGalleryDto(doc) : null;
    },
    async create(input) {
      await connectToDatabase();
      const doc = await GalleryModel.create({
        name: input.name,
        featuredImage: input.featuredImage,
      });
      return doc._id.toString();
    },
    async appendImages(id, images) {
      if (!isValidObjectId(id)) return null;
      await connectToDatabase();
      const doc = await GalleryModel.findByIdAndUpdate(
        id,
        { $push: { images: { $each: images } } },
        { returnDocument: "after" },
      ).lean<GalleryDocument | null>();
      return doc ? toGalleryDto(doc) : null;
    },
    async removeImage(id, imageId) {
      if (!isValidObjectId(id) || !isValidObjectId(imageId)) return null;
      await connectToDatabase();
      const doc = await GalleryModel.findByIdAndUpdate(
        id,
        { $pull: { images: { _id: imageId } } },
        { returnDocument: "after" },
      ).lean<GalleryDocument | null>();
      return doc ? toGalleryDto(doc) : null;
    },
    async delete(id) {
      if (!isValidObjectId(id)) return null;
      await connectToDatabase();
      const doc = await GalleryModel.findByIdAndDelete(
        id,
      ).lean<GalleryDocument | null>();
      return doc ? toGalleryDto(doc) : null;
    },
  };
}
