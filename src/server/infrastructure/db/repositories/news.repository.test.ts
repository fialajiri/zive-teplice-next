// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectToDatabase } from "../connection";
import { NewsModel } from "../models/news.model";
import { createNewsRepository } from "./news.repository";

let mem: MongoMemoryServer;
const repo = createNewsRepository();

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mem.getUri();
  await connectToDatabase();

  await NewsModel.create([
    {
      title: "Starší",
      message: "<p>Tělo</p>",
      image: { imageUrl: "https://cdn/x.jpg", imageKey: "x.jpg" },
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
      title: "Novější",
      // Partial image (missing key) must map to null.
      image: { imageUrl: "https://cdn/y.jpg" },
      createdAt: new Date("2026-02-01T00:00:00.000Z"),
    },
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mem.stop();
});

describe("news repository (integration)", () => {
  it("lists news newest-first as serializable DTOs", async () => {
    const news = await repo.list();
    expect(news).toHaveLength(2);
    expect(news[0].title).toBe("Novější");
    expect(typeof news[0].id).toBe("string");
    expect(news[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // Partial image pair is dropped.
    expect(news[0].image).toBeNull();
    // Complete image pair is preserved.
    expect(news[1].image).toEqual({
      imageUrl: "https://cdn/x.jpg",
      imageKey: "x.jpg",
    });
  });

  it("reads a single item by id", async () => {
    const all = await repo.list();
    const one = await repo.getById(all[0].id);
    expect(one?.title).toBe("Novější");
  });

  it("returns null for a malformed id without throwing", async () => {
    expect(await repo.getById("not-an-objectid")).toBeNull();
  });

  it("returns null for a valid but missing id", async () => {
    expect(
      await repo.getById(new mongoose.Types.ObjectId().toString()),
    ).toBeNull();
  });
});
