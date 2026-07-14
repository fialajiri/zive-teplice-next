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

describe("settings repository (integration)", () => {
  it("reads a safe default (registration closed) when no document exists", async () => {
    const settings = await repo.get();
    expect(settings.registrationOpen).toBe(false);
  });

  it("setRegistrationOpen upserts a single document and toggles the flag", async () => {
    const opened = await repo.setRegistrationOpen(true);
    expect(opened.registrationOpen).toBe(true);
    expect(await repo.get()).toEqual({ registrationOpen: true });

    const closed = await repo.setRegistrationOpen(false);
    expect(closed.registrationOpen).toBe(false);
    expect(await repo.get()).toEqual({ registrationOpen: false });

    // Never more than one config row, no matter how many writes.
    expect(await SettingsModel.countDocuments({})).toBe(1);
  });
});
