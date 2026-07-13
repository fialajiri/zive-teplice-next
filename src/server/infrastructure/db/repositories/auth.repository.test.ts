// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectToDatabase } from "../connection";
import { UserModel } from "../models/user.model";
import { createAuthUserRepository } from "./auth.repository";

let mem: MongoMemoryServer;
const repo = createAuthUserRepository();

const IMAGE = { imageUrl: "https://cdn/u.jpg", imageKey: "u.jpg" };

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mem.getUri();
  await connectToDatabase();

  await UserModel.create([
    {
      email: "admin@zive-teplice.cz",
      username: "Admin",
      phoneNumber: "123456789",
      description: "Správce",
      role: "admin",
      hash: "aa11",
      salt: "bb22",
      image: IMAGE,
    },
    {
      // A row missing secrets can't authenticate — repo must treat it as absent.
      email: "nosecret@zive-teplice.cz",
      username: "NoSecret",
      phoneNumber: "123456789",
      description: "Bez hesla",
      image: IMAGE,
    },
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mem.stop();
});

describe("auth repository (integration)", () => {
  it("finds a user by email WITH hash/salt (which are select:false)", async () => {
    const user = await repo.findByEmailWithSecret("admin@zive-teplice.cz");
    expect(user).toEqual({
      id: expect.any(String),
      username: "Admin",
      role: "admin",
      hash: "aa11",
      salt: "bb22",
    });
  });

  it("returns null for an unknown email", async () => {
    expect(
      await repo.findByEmailWithSecret("ghost@zive-teplice.cz"),
    ).toBeNull();
  });

  it("returns null when the row has no hash/salt", async () => {
    expect(
      await repo.findByEmailWithSecret("nosecret@zive-teplice.cz"),
    ).toBeNull();
  });

  it("never leaks hash/salt on the normal read path (select:false holds)", async () => {
    const doc = await UserModel.findOne({
      email: "admin@zive-teplice.cz",
    }).lean();
    expect(doc).not.toBeNull();
    expect(doc).not.toHaveProperty("hash");
    expect(doc).not.toHaveProperty("salt");
  });
});
