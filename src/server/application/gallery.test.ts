import { describe, expect, it } from "vitest";
import {
  listGalleries,
  getGallery,
  createGallery,
  renameGallery,
  appendGalleryImages,
  removeGalleryImage,
  deleteGallery,
  type GalleryWriteDeps,
} from "./gallery";
import type { GalleryDto, GalleryRepository } from "@/server/domain/gallery";
import type { StoragePort } from "@/server/domain/storage";

const sample: GalleryDto = {
  id: "1",
  name: "Léto 2026",
  featuredImage: {
    imageUrl: "https://cdn/gallery/f.jpg",
    imageKey: "gallery/f.jpg",
  },
  images: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function repoWith(overrides: Partial<GalleryRepository>): GalleryRepository {
  return {
    list: async () => [],
    listPage: async () => ({ items: [], total: 0 }),
    getById: async () => null,
    create: async () => "new-id",
    update: async () => null,
    appendImages: async () => null,
    removeImage: async () => null,
    delete: async () => null,
    ...overrides,
  };
}

function storageWith(overrides: Partial<StoragePort> = {}): StoragePort {
  return {
    presignUpload: async () => ({
      uploadUrl: "",
      key: "",
      publicUrl: "",
      requiredHeaders: {},
    }),
    deleteObject: async () => {},
    ...overrides,
  };
}

function depsWith(
  repo: Partial<GalleryRepository>,
  storage: Partial<StoragePort> = {},
): GalleryWriteDeps {
  return { gallery: repoWith(repo), storage: storageWith(storage) };
}

describe("listGalleries", () => {
  it("returns the repository items", async () => {
    const result = await listGalleries(
      repoWith({ list: async () => [sample] }),
    );
    expect(result).toEqual({ ok: true, value: [sample] });
  });
});

describe("getGallery", () => {
  it("returns not_found when missing", async () => {
    const result = await getGallery(
      repoWith({ getById: async () => null }),
      "x",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_found");
  });
});

const validFeatured = {
  imageUrl: "https://cdn/gallery/f.jpg",
  imageKey: "gallery/f.jpg",
};

describe("createGallery", () => {
  it("persists a valid gallery", async () => {
    const result = await createGallery(
      depsWith({ create: async () => "abc" }),
      {
        name: "Léto",
        featuredImage: validFeatured,
      },
    );
    expect(result).toEqual({ ok: true, value: { id: "abc" } });
  });

  it("rejects a too-short name (< 4)", async () => {
    const result = await createGallery(depsWith({}), {
      name: "Ab",
      featuredImage: validFeatured,
    });
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.kind === "validation") {
      expect(result.error.fieldErrors?.name).toBeDefined();
    }
  });

  it("rejects a too-long name (> 30)", async () => {
    const result = await createGallery(depsWith({}), {
      name: "Příliš dlouhý název galerie, který přesahuje limit",
      featuredImage: validFeatured,
    });
    expect(result.ok).toBe(false);
  });
});

describe("renameGallery", () => {
  it("renames a valid gallery", async () => {
    const result = await renameGallery(
      depsWith({ update: async () => sample }),
      "1",
      "Nový název",
    );
    expect(result).toEqual({ ok: true, value: { id: "1" } });
  });

  it("rejects a too-short name (< 4)", async () => {
    const result = await renameGallery(depsWith({}), "1", "Ab");
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.kind === "validation") {
      expect(result.error.fieldErrors?.name).toBeDefined();
    }
  });

  it("returns not_found when the gallery doesn't exist", async () => {
    const result = await renameGallery(
      depsWith({ update: async () => null }),
      "missing",
      "Nový název",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_found");
  });
});

describe("appendGalleryImages", () => {
  it("ignores empty/partial pairs and is a no-op when nothing remains", async () => {
    let called = false;
    const result = await appendGalleryImages(
      depsWith({
        appendImages: async () => {
          called = true;
          return sample;
        },
      }),
      "1",
      [{ imageUrl: "", imageKey: "" }],
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.added).toBe(0);
    expect(called).toBe(false);
  });

  it("persists valid images", async () => {
    const result = await appendGalleryImages(
      depsWith({ appendImages: async () => sample }),
      "1",
      [
        { imageUrl: "https://cdn/gallery/a.jpg", imageKey: "gallery/a.jpg" },
        { imageUrl: "https://cdn/gallery/b.jpg", imageKey: "gallery/b.jpg" },
      ],
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.added).toBe(2);
  });

  it("returns not_found when the gallery is unknown", async () => {
    const result = await appendGalleryImages(
      depsWith({ appendImages: async () => null }),
      "1",
      [{ imageUrl: "https://cdn/gallery/a.jpg", imageKey: "gallery/a.jpg" }],
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_found");
  });
});

describe("removeGalleryImage", () => {
  it("deletes the S3 object for the removed photo", async () => {
    let deletedKey: string | null = null;
    const withPhoto: GalleryDto = {
      ...sample,
      images: [
        {
          id: "img1",
          imageUrl: "https://cdn/gallery/x.jpg",
          imageKey: "gallery/x.jpg",
        },
      ],
    };
    const result = await removeGalleryImage(
      depsWith(
        {
          getById: async () => withPhoto,
          removeImage: async () => sample,
        },
        {
          deleteObject: async (key) => {
            deletedKey = key;
          },
        },
      ),
      "1",
      "img1",
    );
    expect(result.ok).toBe(true);
    expect(deletedKey).toBe("gallery/x.jpg");
  });

  it("returns not_found when the photo id is unknown", async () => {
    const result = await removeGalleryImage(
      depsWith({ getById: async () => sample }),
      "1",
      "missing",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_found");
  });
});

describe("deleteGallery", () => {
  it("deletes the featured image and every photo key", async () => {
    const deletedKeys: string[] = [];
    const full: GalleryDto = {
      ...sample,
      featuredImage: {
        imageUrl: "https://cdn/gallery/f.jpg",
        imageKey: "gallery/f.jpg",
      },
      images: [
        {
          id: "a",
          imageUrl: "https://cdn/gallery/a.jpg",
          imageKey: "gallery/a.jpg",
        },
        {
          id: "b",
          imageUrl: "https://cdn/gallery/b.jpg",
          imageKey: "gallery/b.jpg",
        },
      ],
    };
    const result = await deleteGallery(
      depsWith(
        { delete: async () => full },
        {
          deleteObject: async (key) => {
            deletedKeys.push(key);
          },
        },
      ),
      "1",
    );
    expect(result.ok).toBe(true);
    expect(deletedKeys.sort()).toEqual([
      "gallery/a.jpg",
      "gallery/b.jpg",
      "gallery/f.jpg",
    ]);
  });

  it("returns not_found when the gallery is unknown", async () => {
    const result = await deleteGallery(
      depsWith({ delete: async () => null }),
      "1",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_found");
  });
});
