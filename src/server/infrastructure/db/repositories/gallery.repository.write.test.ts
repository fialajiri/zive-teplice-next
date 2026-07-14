// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectToDatabase } from "../connection";
import { createGalleryRepository } from "./gallery.repository";

let mem: MongoMemoryServer;
const repo = createGalleryRepository();

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mem.getUri();
  await connectToDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mem.stop();
});

describe("gallery repository (write, integration)", () => {
  it("create persists a document with its featured image", async () => {
    const id = await repo.create({
      name: "Léto 2026",
      featuredImage: {
        imageUrl: "https://cdn/gallery/f.jpg",
        imageKey: "gallery/f.jpg",
      },
    });
    expect(typeof id).toBe("string");

    const doc = await repo.getById(id);
    expect(doc?.name).toBe("Léto 2026");
    expect(doc?.featuredImage?.imageKey).toBe("gallery/f.jpg");
    expect(doc?.images).toHaveLength(0);
  });

  it("appendImages pushes photos onto the gallery", async () => {
    const id = await repo.create({
      name: "Fotky",
      featuredImage: {
        imageUrl: "https://cdn/gallery/f.jpg",
        imageKey: "gallery/f.jpg",
      },
    });
    const after = await repo.appendImages(id, [
      { imageUrl: "https://cdn/gallery/a.jpg", imageKey: "gallery/a.jpg" },
      { imageUrl: "https://cdn/gallery/b.jpg", imageKey: "gallery/b.jpg" },
    ]);
    expect(after?.images).toHaveLength(2);
    expect(after?.images.map((i) => i.imageKey).sort()).toEqual([
      "gallery/a.jpg",
      "gallery/b.jpg",
    ]);
  });

  it("removeImage pulls a single photo by its subdocument id", async () => {
    const id = await repo.create({
      name: "Ke smazání",
      featuredImage: {
        imageUrl: "https://cdn/gallery/f.jpg",
        imageKey: "gallery/f.jpg",
      },
    });
    const withPhotos = await repo.appendImages(id, [
      { imageUrl: "https://cdn/gallery/a.jpg", imageKey: "gallery/a.jpg" },
      { imageUrl: "https://cdn/gallery/b.jpg", imageKey: "gallery/b.jpg" },
    ]);
    const toRemove = withPhotos?.images[0];
    expect(toRemove?.id).toBeTruthy();

    const after = await repo.removeImage(id, toRemove?.id as string);
    expect(after?.images).toHaveLength(1);
    expect(after?.images[0].imageKey).toBe("gallery/b.jpg");
  });

  it("delete removes the document and returns it with its keys", async () => {
    const id = await repo.create({
      name: "Smazat",
      featuredImage: {
        imageUrl: "https://cdn/gallery/f.jpg",
        imageKey: "gallery/f.jpg",
      },
    });
    await repo.appendImages(id, [
      { imageUrl: "https://cdn/gallery/a.jpg", imageKey: "gallery/a.jpg" },
    ]);
    const deleted = await repo.delete(id);
    expect(deleted?.featuredImage?.imageKey).toBe("gallery/f.jpg");
    expect(deleted?.images.map((i) => i.imageKey)).toEqual(["gallery/a.jpg"]);
    expect(await repo.getById(id)).toBeNull();
  });
});
