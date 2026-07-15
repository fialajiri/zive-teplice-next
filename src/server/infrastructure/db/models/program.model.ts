import "server-only";
import { Schema, model, models, type Model, type Types } from "mongoose";

export type ProgramDocument = {
  _id: Types.ObjectId;
  title: string;
  message?: string;
  image?: {
    imageUrl?: string;
    imageKey?: string;
    width?: number;
    height?: number;
  };
};

const programSchema = new Schema<ProgramDocument>({
  title: { type: String, required: true },
  message: { type: String },
  image: {
    imageUrl: { type: String },
    imageKey: { type: String },
    width: { type: Number },
    height: { type: Number },
  },
});

export const ProgramModel: Model<ProgramDocument> =
  (models.Program as Model<ProgramDocument>) ??
  model<ProgramDocument>("Program", programSchema, "programs");
