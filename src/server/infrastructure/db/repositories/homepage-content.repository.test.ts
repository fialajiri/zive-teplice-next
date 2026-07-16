// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectToDatabase } from "../connection";
import { createHomepageContentRepository } from "./homepage-content.repository";
import { HomepageContentModel } from "../models/homepage-content.model";
import { DEFAULT_HOMEPAGE_CONTENT } from "@/server/domain/homepage-content";

let mem: MongoMemoryServer;
const repo = createHomepageContentRepository();

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mem.getUri();
  await connectToDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mem.stop();
});

describe("homepage content repository (integration)", () => {
  it("reads the default content when no document exists", async () => {
    const content = await repo.get();
    expect(content).toEqual(DEFAULT_HOMEPAGE_CONTENT);
  });

  it("set() upserts a single document and persists the new content", async () => {
    const next = {
      heroImage: {
        imageUrl: "https://cdn.example.com/homepageHero/photo.jpg",
        imageKey: "homepageHero/photo.jpg",
        alt: "Nová úvodní fotka",
      },
      aboutText: "Nový text o festivalu, dostatečně dlouhý na splnění limitu.",
      aboutImage: {
        imageUrl: "https://cdn.example.com/homepageAbout/photo.jpg",
        imageKey: "homepageAbout/photo.jpg",
        alt: "Nová fotka k textu",
      },
      highlights: [
        { title: "A", description: "Popis A dostatečně dlouhý." },
        { title: "B", description: "Popis B dostatečně dlouhý." },
        { title: "C", description: "Popis C dostatečně dlouhý." },
        { title: "D", description: "Popis D dostatečně dlouhý." },
      ],
    } as const;

    const updated = await repo.set(next);
    expect(updated).toEqual(next);
    expect(await repo.get()).toEqual(next);

    // Never more than one config row, no matter how many writes.
    expect(await HomepageContentModel.countDocuments({})).toBe(1);
  });
});
