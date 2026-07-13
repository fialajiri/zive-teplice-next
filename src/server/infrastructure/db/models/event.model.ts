import "server-only";
import { Schema, model, models, type Model, type Types } from "mongoose";

// Legacy event.js: a single `program` ObjectId ref (not an array).
export type EventDocument = {
  _id: Types.ObjectId;
  title: string;
  year: number;
  current: boolean;
  program?: Types.ObjectId | null;
};

const eventSchema = new Schema<EventDocument>({
  title: { type: String, required: true },
  year: { type: Number, required: true },
  current: { type: Boolean, required: true },
  program: { type: Schema.Types.ObjectId, ref: "Program", default: null },
});

export const EventModel: Model<EventDocument> =
  (models.Event as Model<EventDocument>) ??
  model<EventDocument>("Event", eventSchema, "events");
