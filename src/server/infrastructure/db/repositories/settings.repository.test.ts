// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectToDatabase } from "../connection";
import { createSettingsRepository } from "./settings.repository";
import { SettingsModel } from "../models/settings.model";

let mem: MongoMemoryServer;
const repo = createSettingsRepository();

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mem.getUri();
  await connectToDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mem.stop();
});

const FALLBACK_FACEBOOK_URL = "https://www.facebook.com/ZiveTeplice2023";
const FALLBACK_INSTAGRAM_URL = "https://www.instagram.com/zive_teplice/";

describe("settings repository (integration)", () => {
  it("reads safe defaults when no document exists", async () => {
    const settings = await repo.get();
    expect(settings.registrationOpen).toBe(false);
    expect(settings.facebookUrl).toBe(FALLBACK_FACEBOOK_URL);
    expect(settings.instagramUrl).toBe(FALLBACK_INSTAGRAM_URL);
  });

  it("setRegistrationOpen upserts a single document and toggles the flag, without touching social links", async () => {
    const opened = await repo.setRegistrationOpen(true);
    expect(opened.registrationOpen).toBe(true);
    // Untouched by a registrationOpen-only write ⇒ still the fallback (gotcha:
    // a schema-level default here would have locked these in as "" instead).
    expect(opened.facebookUrl).toBe(FALLBACK_FACEBOOK_URL);
    expect(opened.instagramUrl).toBe(FALLBACK_INSTAGRAM_URL);

    const closed = await repo.setRegistrationOpen(false);
    expect(closed.registrationOpen).toBe(false);
    expect(await repo.get()).toMatchObject({ registrationOpen: false });

    // Never more than one config row, no matter how many writes.
    expect(await SettingsModel.countDocuments({})).toBe(1);
  });

  it("setSocialLinks upserts the single document and persists explicit values, including empty (hidden)", async () => {
    const updated = await repo.setSocialLinks({
      facebookUrl: "https://www.facebook.com/custom",
      instagramUrl: "",
    });
    expect(updated.facebookUrl).toBe("https://www.facebook.com/custom");
    expect(updated.instagramUrl).toBe("");

    // An explicit "" must stay "" on the next read (not fall back).
    expect(await repo.get()).toMatchObject({
      facebookUrl: "https://www.facebook.com/custom",
      instagramUrl: "",
    });

    expect(await SettingsModel.countDocuments({})).toBe(1);
  });
});
