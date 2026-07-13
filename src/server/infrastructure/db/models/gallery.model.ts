import "server-only";
import { Schema, model, models, type Model, type Types } from "mongoose";

export type GalleryDocument = {
  _id: Types.ObjectId;
  name?: string;
  featuredImage?: { imageUrl?: string; imageKey?: string };
  images: { imageUrl?: string; imageKey?: string; _id?: Types.ObjectId }[];
  createdAt: Date;
  updatedAt: Date;
};

const gallerySchema = new Schema<GalleryDocument>(
  {
    name: { type: String },
    featuredImage: {
      imageUrl: { type: String },
      imageKey: { type: String },
    },
    images: [
      {
        imageUrl: { type: String },
        imageKey: { type: String },
      },
    ],
  },
  { timestamps: true },
);

export const GalleryModel: Model<GalleryDocument> =
  (models.Gallery as Model<GalleryDocument>) ??
  model<GalleryDocument>("Gallery", gallerySchema, "galleries");
