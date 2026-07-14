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

  it("getAccountById exposes contact + participation fields", async () => {
    const id = await repo.create({
      ...input,
      email: "ucet@ucinkujici.cz",
      username: "Účet Test",
    });
    const account = await repo.getAccountById(id);
    expect(account).toMatchObject({
      email: "ucet@ucinkujici.cz",
      username: "Účet Test",
      phoneNumber: input.phoneNumber,
      request: "notsend",
    });
  });

  it("update changes profile fields and replaces the image", async () => {
    const id = await repo.create({
      ...input,
      email: "edit@ucinkujici.cz",
      username: "K úpravě",
    });
    const updated = await repo.update(id, {
      username: "Upraveno",
      phoneNumber: "608999888",
      description: "Nový popis.",
      image: {
        imageUrl: "https://cdn/performer/new.jpg",
        imageKey: "performer/new.jpg",
      },
    });
    expect(updated?.username).toBe("Upraveno");
    expect(updated?.image?.imageKey).toBe("performer/new.jpg");

    const account = await repo.getAccountById(id);
    expect(account?.phoneNumber).toBe("608999888");
  });

  it("update never touches role/request", async () => {
    const id = await repo.create({
      ...input,
      email: "role@ucinkujici.cz",
      username: "Role Test",
    });
    await repo.update(id, {
      username: "Role Test 2",
      phoneNumber: input.phoneNumber,
      description: "",
    });
    const doc = await UserModel.findById(id).lean();
    expect(doc?.role).toBe("user");
    expect(doc?.request).toBe("notsend");
  });

  it("delete removes the document and returns it with its image key", async () => {
    const id = await repo.create({
      ...input,
      email: "smazat@ucinkujici.cz",
      username: "Ke smazání",
    });
    const deleted = await repo.delete(id);
    expect(deleted?.image?.imageKey).toBe(input.image.imageKey);
    expect(await repo.getById(id)).toBeNull();
  });

  it("returns null when updating or deleting an unknown id", async () => {
    const missing = new mongoose.Types.ObjectId().toString();
    expect(
      await repo.update(missing, {
        username: "Nikdo",
        phoneNumber: "777000111",
        description: "",
      }),
    ).toBeNull();
    expect(await repo.delete(missing)).toBeNull();
  });
});
