import "server-only";
import { Schema, model, models, type Model, type Types } from "mongoose";

// A single-document config collection (new in Phase 5). There is intentionally
// never more than one row: reads take the first document, writes upsert with an
// empty filter. `registrationOpen` defaults to false so a brand-new database
// (no document yet) is treated as "registration closed".

export type SettingsDocument = {
  _id: Types.ObjectId;
  registrationOpen: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const settingsSchema = new Schema<SettingsDocument>(
  {
    registrationOpen: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Pin the collection name explicitly (as every model does) so Mongoose does not
// invent a pluralized one.
export const SettingsModel: Model<SettingsDocument> =
  (models.Settings as Model<SettingsDocument>) ??
  model<SettingsDocument>("Settings", settingsSchema, "settings");
