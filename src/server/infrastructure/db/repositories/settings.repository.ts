import "server-only";
import { connectToDatabase } from "../connection";
import { SettingsModel, type SettingsDocument } from "../models/settings.model";
import type {
  AppSettingsDto,
  SettingsRepository,
} from "@/server/domain/settings";

function toSettingsDto(doc: SettingsDocument | null): AppSettingsDto {
  // Absent document ⇒ the safe default: registration closed (gotcha #2).
  return { registrationOpen: doc?.registrationOpen ?? false };
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
  };
}
