// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectToDatabase } from "../connection";
import { createPerformerRepository } from "./performer.repository";
import { UserModel } from "../models/user.model";

let mem: MongoMemoryServer;
const repo = createPerformerRepository();

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mem.getUri();
  await connectToDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mem.stop();
});

const input = {
  email: "pisnicka@ucinkujici.cz",
  username: "Písničkář",
  hash: "h".repeat(1024),
  salt: "s".repeat(64),
  phoneNumber: "777123456",
  description: "Zpěvák.",
  image: {
    imageUrl: "https://cdn/performer/p.jpg",
    imageKey: "performer/p.jpg",
  },
};

describe("performer repository (write, integration)", () => {
  it("create persists a user with role:user and request:notsend", async () => {
    const id = await repo.create(input);
    expect(typeof id).toBe("string");

    // Server-set fields, never from the caller (gotcha #3).
    const doc = await UserModel.findById(id).select("+hash +salt").lean();
    expect(doc?.role).toBe("user");
    expect(doc?.request).toBe("notsend");
    expect(doc?.email).toBe(input.email);
    expect(doc?.hash).toBe(input.hash);
    expect(doc?.salt).toBe(input.salt);

    // It surfaces on the public read side too.
    const dto = await repo.getById(id);
    expect(dto?.username).toBe(input.username);
  });

  it("findByEmail resolves an existing user and null for a stranger", async () => {
    expect(await repo.findByEmail(input.email)).not.toBeNull();
    expect(await repo.findByEmail("nikdo@nikde.cz")).toBeNull();
  });

  it("existsByUsername is case-sensitive-exact and false when absent", async () => {
    expect(await repo.existsByUsername(input.username)).toBe(true);
    expect(await repo.existsByUsername("Neexistuje")).toBe(false);
  });
});
