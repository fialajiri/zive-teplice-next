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

  it("finds a user by id WITH hash/salt", async () => {
    const byEmail = await repo.findByEmailWithSecret("admin@zive-teplice.cz");
    const byId = await repo.findByIdWithSecret(byEmail!.id);
    expect(byId).toEqual(byEmail);
  });

  it("sets, finds, and clears a reset token (single-use lifecycle)", async () => {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const matched = await repo.setResetToken(
      "admin@zive-teplice.cz",
      "tok-123",
      expiresAt,
    );
    expect(matched).toBe(true);

    const found = await repo.findByResetToken("tok-123");
    expect(found?.id).toEqual(expect.any(String));
    expect(found?.expiresAt?.getTime()).toBe(expiresAt.getTime());

    await repo.clearReset(found!.id);
    expect(await repo.findByResetToken("tok-123")).toBeNull();
  });

  it("setResetToken returns false for an unknown email (no enumeration signal used)", async () => {
    expect(
      await repo.setResetToken("ghost@zive-teplice.cz", "x", new Date()),
    ).toBe(false);
  });

  it("never matches an empty reset token", async () => {
    expect(await repo.findByResetToken("")).toBeNull();
  });

  it("setPassword overwrites hash/salt", async () => {
    const before = await repo.findByEmailWithSecret("admin@zive-teplice.cz");
    const updated = await repo.setPassword(before!.id, {
      hash: "newhash",
      salt: "newsalt",
    });
    expect(updated).toBe(true);

    const after = await repo.findByIdWithSecret(before!.id);
    expect(after?.hash).toBe("newhash");
    expect(after?.salt).toBe("newsalt");
  });
});
