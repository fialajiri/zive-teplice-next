// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectToDatabase } from "../connection";
import { createNewsRepository } from "./news.repository";

let mem: MongoMemoryServer;
const repo = createNewsRepository();

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mem.getUri();
  await connectToDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mem.stop();
});

describe("news repository (write, integration)", () => {
  it("create persists a document and returns its id", async () => {
    const id = await repo.create({
      title: "Nová aktualita",
      message: "<p>Tělo</p>",
      image: { imageUrl: "https://cdn/news/a.jpg", imageKey: "news/a.jpg" },
    });
    expect(typeof id).toBe("string");

    const doc = await repo.getById(id);
    expect(doc?.title).toBe("Nová aktualita");
    expect(doc?.image).toEqual({
      imageUrl: "https://cdn/news/a.jpg",
      imageKey: "news/a.jpg",
    });
  });

  it("update replaces the image fields when a new image is supplied", async () => {
    const id = await repo.create({
      title: "K úpravě",
      message: "<p>a</p>",
      image: { imageUrl: "https://cdn/news/old.jpg", imageKey: "news/old.jpg" },
    });
    const updated = await repo.update(id, {
      title: "Upraveno",
      message: "<p>b</p>",
      image: { imageUrl: "https://cdn/news/new.jpg", imageKey: "news/new.jpg" },
    });
    expect(updated?.title).toBe("Upraveno");
    expect(updated?.image).toEqual({
      imageUrl: "https://cdn/news/new.jpg",
      imageKey: "news/new.jpg",
    });
  });

  it("update leaves the existing image untouched when none is supplied", async () => {
    const id = await repo.create({
      title: "Bez změny obrázku",
      message: "<p>a</p>",
      image: {
        imageUrl: "https://cdn/news/keep.jpg",
        imageKey: "news/keep.jpg",
      },
    });
    const updated = await repo.update(id, {
      title: "Jen nový titulek",
      message: "<p>b</p>",
    });
    expect(updated?.image).toEqual({
      imageUrl: "https://cdn/news/keep.jpg",
      imageKey: "news/keep.jpg",
    });
    expect(updated?.title).toBe("Jen nový titulek");
  });

  it("delete removes the document and returns it (with its image key)", async () => {
    const id = await repo.create({
      title: "Ke smazání",
      message: "<p>a</p>",
      image: { imageUrl: "https://cdn/news/del.jpg", imageKey: "news/del.jpg" },
    });
    const deleted = await repo.delete(id);
    expect(deleted?.image?.imageKey).toBe("news/del.jpg");
    expect(await repo.getById(id)).toBeNull();
  });

  it("returns null when updating or deleting an unknown id", async () => {
    const missing = new mongoose.Types.ObjectId().toString();
    expect(
      await repo.update(missing, {
        title: "Neexistující titulek",
        message: "<p>a</p>",
      }),
    ).toBeNull();
    expect(await repo.delete(missing)).toBeNull();
  });
});
