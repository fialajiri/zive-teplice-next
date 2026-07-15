import "server-only";
import { Schema, model, models, type Model, type Types } from "mongoose";

export type NewsDocument = {
  _id: Types.ObjectId;
  title: string;
  message?: string;
  image?: { imageUrl?: string; imageKey?: string };
  secondaryImage?: {
    imageUrl?: string;
    imageKey?: string;
    width?: number;
    height?: number;
  };
  createdAt: Date;
  updatedAt: Date;
};

const newsSchema = new Schema<NewsDocument>(
  {
    title: { type: String, required: true },
    message: { type: String },
    image: {
      imageUrl: { type: String },
      imageKey: { type: String },
    },
    secondaryImage: {
      imageUrl: { type: String },
      imageKey: { type: String },
      width: { type: Number },
      height: { type: Number },
    },
  },
  { timestamps: true },
);

// 'news' is uncountable — pin it so Mongoose doesn't invent a different collection.
export const NewsModel: Model<NewsDocument> =
  (models.News as Model<NewsDocument>) ??
  model<NewsDocument>("News", newsSchema, "news");
