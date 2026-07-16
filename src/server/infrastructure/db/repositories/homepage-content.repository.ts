import "server-only";
import { connectToDatabase } from "../connection";
import {
  HomepageContentModel,
  type HomepageContentDocument,
} from "../models/homepage-content.model";
import {
  DEFAULT_HOMEPAGE_CONTENT,
  type HomepageContentDto,
  type HomepageContentRepository,
} from "@/server/domain/homepage-content";

function toDto(doc: HomepageContentDocument | null): HomepageContentDto {
  return {
    heroImage: doc?.heroImage ?? DEFAULT_HOMEPAGE_CONTENT.heroImage,
    aboutText: doc?.aboutText ?? DEFAULT_HOMEPAGE_CONTENT.aboutText,
    aboutImage: doc?.aboutImage ?? DEFAULT_HOMEPAGE_CONTENT.aboutImage,
    // Highlights fall back as a WHOLE 4-tuple, unlike the scalar `??` fallback
    // above: a partial/malformed array can't be merged element-by-element, and
    // anything other than exactly 4 items would break the fixed 2x2 grid.
    highlights:
      doc?.highlights?.length === 4
        ? (doc.highlights as unknown as HomepageContentDto["highlights"])
        : DEFAULT_HOMEPAGE_CONTENT.highlights,
  };
}

export function createHomepageContentRepository(): HomepageContentRepository {
  return {
    async get() {
      await connectToDatabase();
      const doc = await HomepageContentModel.findOne(
        {},
      ).lean<HomepageContentDocument | null>();
      return toDto(doc);
    },
    async set(input) {
      await connectToDatabase();
      // Upsert the lone content document (empty filter → the single row,
      // created lazily on first write). The whole document is always
      // round-tripped together (never a per-field $set) — the admin form edits
      // everything as one unit, so there's no "untouched field" case to guard.
      const doc = await HomepageContentModel.findOneAndUpdate(
        {},
        { $set: input },
        { upsert: true, returnDocument: "after" },
      ).lean<HomepageContentDocument | null>();
      return toDto(doc);
    },
  };
}
