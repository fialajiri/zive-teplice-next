import "server-only";
import { connectToDatabase } from "../connection";
import { SettingsModel, type SettingsDocument } from "../models/settings.model";
import type {
  AppSettingsDto,
  SettingsRepository,
} from "@/server/domain/settings";

// Pre-migration fallback: the social links used to be hardcoded in the
// header/footer. Applied only when the settings document (or field) doesn't
// exist yet, so existing deployments keep showing the same links until an
// admin edits them via the new settings form.
const FALLBACK_FACEBOOK_URL = "https://www.facebook.com/ZiveTeplice2023";
const FALLBACK_INSTAGRAM_URL = "https://www.instagram.com/zive_teplice/";

function toSettingsDto(doc: SettingsDocument | null): AppSettingsDto {
  // Absent document ⇒ the safe default: registration closed (gotcha #2).
  return {
    registrationOpen: doc?.registrationOpen ?? false,
    // `??` (not `||`): an explicit "" from an admin clearing the field must
    // stay empty (hides the link), only a genuinely absent field falls back.
    facebookUrl: doc?.facebookUrl ?? FALLBACK_FACEBOOK_URL,
    instagramUrl: doc?.instagramUrl ?? FALLBACK_INSTAGRAM_URL,
  };
}

export function createSettingsRepository(): SettingsRepository {
  return {
    async get() {
      await connectToDatabase();
      const doc = await SettingsModel.findOne(
        {},
      ).lean<SettingsDocument | null>();
      return toSettingsDto(doc);
    },
    async setRegistrationOpen(open) {
      await connectToDatabase();
      // Upsert the lone config document (empty filter → the single row, created
      // lazily on first write).
      const doc = await SettingsModel.findOneAndUpdate(
        {},
        { $set: { registrationOpen: open } },
        { upsert: true, returnDocument: "after" },
      ).lean<SettingsDocument | null>();
      return toSettingsDto(doc);
    },
    async setSocialLinks({ facebookUrl, instagramUrl }) {
      await connectToDatabase();
      const doc = await SettingsModel.findOneAndUpdate(
        {},
        { $set: { facebookUrl, instagramUrl } },
        { upsert: true, returnDocument: "after" },
      ).lean<SettingsDocument | null>();
      return toSettingsDto(doc);
    },
  };
}
