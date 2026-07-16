import "server-only";
import { Schema, model, models, type Model, type Types } from "mongoose";

// A single-document config collection (same idiom as `settings.model.ts`),
// separate from `Settings` — this holds CMS content, not app-wide flags. There
// is intentionally never more than one row: reads take the first document,
// writes upsert with an empty filter.

export type HomepageImageSubdocument = {
  imageUrl: string;
  imageKey: string;
  alt: string;
};

export type HomepageHighlightSubdocument = {
  title: string;
  description: string;
};

export type HomepageContentDocument = {
  _id: Types.ObjectId;
  heroImage?: HomepageImageSubdocument;
  aboutText?: string;
  aboutImage?: HomepageImageSubdocument;
  highlights?: HomepageHighlightSubdocument[];
  createdAt: Date;
  updatedAt: Date;
};

const imageSchema = new Schema<HomepageImageSubdocument>(
  {
    imageUrl: { type: String, required: true },
    imageKey: { type: String, required: true },
    alt: { type: String, required: true },
  },
  { _id: false },
);

const highlightSchema = new Schema<HomepageHighlightSubdocument>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
  },
  { _id: false },
);

// No schema-level defaults (same gotcha as `settings.model.ts`): the repository
// falls back to `DEFAULT_HOMEPAGE_CONTENT` only when a document/field is
// genuinely absent, so an upsert never silently locks in empty content.
const homepageContentSchema = new Schema<HomepageContentDocument>(
  {
    heroImage: { type: imageSchema },
    aboutText: { type: String },
    aboutImage: { type: imageSchema },
    highlights: { type: [highlightSchema] },
  },
  { timestamps: true },
);

// Pin the collection name explicitly (as every model does) so Mongoose does not
// invent a pluralized one.
export const HomepageContentModel: Model<HomepageContentDocument> =
  (models.HomepageContent as Model<HomepageContentDocument>) ??
  model<HomepageContentDocument>(
    "HomepageContent",
    homepageContentSchema,
    "homepagecontent",
  );
