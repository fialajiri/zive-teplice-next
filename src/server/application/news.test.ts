import { describe, expect, it } from "vitest";
import {
  listNews,
  getNews,
  createNews,
  updateNews,
  deleteNews,
  listCurrentYearNews,
  listArchiveYears,
  listNewsForYear,
  type NewsWriteDeps,
  type CreateNewsCommand,
} from "./news";
import type { NewsDto, NewsRepository } from "@/server/domain/news";
import type { EventDto, EventRepository } from "@/server/domain/event";
import type { StoragePort } from "@/server/domain/storage";

const sample: NewsDto = {
  id: "1",
  title: "Ahoj",
  message: null,
  image: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function repoWith(overrides: Partial<NewsRepository>): NewsRepository {
  return {
    list: async () => [],
    listByDateRange: async () => [],
    listDistinctYears: async () => [],
    getById: async () => null,
    create: async () => "new-id",
    update: async () => null,
    delete: async () => null,
    ...overrides,
  };
}

describe("listNews", () => {
  it("returns the repository items", async () => {
    const result = await listNews(repoWith({ list: async () => [sample] }));
    expect(result).toEqual({ ok: true, value: [sample] });
  });

  it("returns an unexpected error when the repository throws", async () => {
    const result = await listNews(
      repoWith({
        list: async () => {
          throw new Error("db down");
        },
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("unexpected");
  });
});

describe("getNews", () => {
  it("returns the item when found", async () => {
    const result = await getNews(
      repoWith({ getById: async () => sample }),
      "1",
    );
    expect(result).toEqual({ ok: true, value: sample });
  });

  it("returns not_found when the item is missing", async () => {
    const result = await getNews(repoWith({ getById: async () => null }), "x");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_found");
  });
});

function eventRepoWith(overrides: Partial<EventRepository>): EventRepository {
  return {
    list: async () => [],
    getCurrent: async () => null,
    getById: async () => null,
    createCurrent: async () => "new-id",
    update: async () => null,
    delete: async () => null,
    addProgram: async () => null,
    updateProgram: async () => null,
    ...overrides,
  };
}

const currentEvent: EventDto = {
  id: "e1",
  title: "Živé Teplice",
  year: 2026,
  current: true,
  program: null,
};

describe("listCurrentYearNews", () => {
  it("queries the date range for the current event's year", async () => {
    let seenRange: [string, string] | null = null;
    const result = await listCurrentYearNews(
      repoWith({
        listByDateRange: async (start, end) => {
          seenRange = [start, end];
          return [sample];
        },
      }),
      eventRepoWith({ getCurrent: async () => currentEvent }),
    );
    expect(result).toEqual({ ok: true, value: [sample] });
    expect(seenRange).toEqual([
      "2026-01-01T00:00:00.000Z",
      "2027-01-01T00:00:00.000Z",
    ]);
  });

  it("falls back to the real calendar year when no event is current", async () => {
    let seenRange: [string, string] | null = null;
    const thisYear = new Date().getFullYear();
    await listCurrentYearNews(
      repoWith({
        listByDateRange: async (start, end) => {
          seenRange = [start, end];
          return [];
        },
      }),
      eventRepoWith({ getCurrent: async () => null }),
    );
    expect(seenRange?.[0]).toBe(`${thisYear}-01-01T00:00:00.000Z`);
  });
});

describe("listArchiveYears", () => {
  it("excludes the current event's year from the archive list", async () => {
    const result = await listArchiveYears(
      repoWith({
        listDistinctYears: async () => [2026, 2025, 2024],
      }),
      eventRepoWith({ getCurrent: async () => currentEvent }),
    );
    expect(result).toEqual({ ok: true, value: [2025, 2024] });
  });

  it("returns an unexpected error when the repository throws", async () => {
    const result = await listArchiveYears(
      repoWith({
        listDistinctYears: async () => {
          throw new Error("db down");
        },
      }),
      eventRepoWith({}),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("unexpected");
  });
});

describe("listNewsForYear", () => {
  it("queries the [start, end) range for the given year", async () => {
    let seenRange: [string, string] | null = null;
    const result = await listNewsForYear(
      repoWith({
        listByDateRange: async (start, end) => {
          seenRange = [start, end];
          return [sample];
        },
      }),
      2019,
    );
    expect(result).toEqual({ ok: true, value: [sample] });
    expect(seenRange).toEqual([
      "2019-01-01T00:00:00.000Z",
      "2020-01-01T00:00:00.000Z",
    ]);
  });
});

// ── Write path ───────────────────────────────────────────────────────────────

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
  repo: Partial<NewsRepository>,
  storage: Partial<StoragePort> = {},
): NewsWriteDeps {
  return { news: repoWith(repo), storage: storageWith(storage) };
}

const validCreate: CreateNewsCommand = {
  title: "Dostatečně dlouhý titulek",
  message: "<p>Ahoj</p>",
  image: { imageUrl: "https://cdn/news/x.jpg", imageKey: "news/x.jpg" },
};

const withImage = (imageKey: string): NewsDto => ({
  ...sample,
  image: { imageUrl: `https://cdn/${imageKey}`, imageKey },
});

describe("createNews", () => {
  it("persists a valid item and returns the new id", async () => {
    const result = await createNews(
      depsWith({ create: async () => "abc" }),
      validCreate,
    );
    expect(result).toEqual({ ok: true, value: { id: "abc" } });
  });

  it("rejects a too-short title with a field error", async () => {
    const result = await createNews(depsWith({}), {
      ...validCreate,
      title: "Krátký",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("validation");
      if (result.error.kind === "validation") {
        expect(result.error.fieldErrors?.title).toBeDefined();
      }
    }
  });

  it("rejects an empty (tags-only) message", async () => {
    const result = await createNews(depsWith({}), {
      ...validCreate,
      message: "<p></p>",
    });
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.kind === "validation") {
      expect(result.error.fieldErrors?.message).toBeDefined();
    }
  });

  it("rejects a missing image on create", async () => {
    const result = await createNews(depsWith({}), {
      title: validCreate.title,
      message: validCreate.message,
    } as CreateNewsCommand);
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.kind === "validation") {
      expect(result.error.fieldErrors?.image).toBeDefined();
    }
  });
});

describe("updateNews", () => {
  it("deletes the old S3 object when the image is replaced", async () => {
    let deletedKey: string | null = null;
    const existing = withImage("news/old.jpg");
    const deps = depsWith(
      {
        getById: async () => existing,
        update: async () => withImage("news/new.jpg"),
      },
      {
        deleteObject: async (key) => {
          deletedKey = key;
        },
      },
    );
    const result = await updateNews(deps, "1", {
      title: validCreate.title,
      message: "<p>x</p>",
      image: { imageUrl: "https://cdn/news/new.jpg", imageKey: "news/new.jpg" },
    });
    expect(result.ok).toBe(true);
    expect(deletedKey).toBe("news/old.jpg");
  });

  it("does not touch storage when no new image is supplied", async () => {
    let called = false;
    const deps = depsWith(
      {
        getById: async () => withImage("news/keep.jpg"),
        update: async () => withImage("news/keep.jpg"),
      },
      {
        deleteObject: async () => {
          called = true;
        },
      },
    );
    const result = await updateNews(deps, "1", {
      title: validCreate.title,
      message: "<p>x</p>",
    });
    expect(result.ok).toBe(true);
    expect(called).toBe(false);
  });

  it("returns not_found for an unknown id", async () => {
    const result = await updateNews(
      depsWith({ getById: async () => null }),
      "1",
      {
        title: validCreate.title,
        message: "<p>x</p>",
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_found");
  });
});

describe("deleteNews", () => {
  it("removes the document and its S3 image", async () => {
    let deletedKey: string | null = null;
    const deps = depsWith(
      { delete: async () => withImage("news/gone.jpg") },
      {
        deleteObject: async (key) => {
          deletedKey = key;
        },
      },
    );
    const result = await deleteNews(deps, "1");
    expect(result.ok).toBe(true);
    expect(deletedKey).toBe("news/gone.jpg");
  });

  it("returns not_found when the item does not exist", async () => {
    const result = await deleteNews(
      depsWith({ delete: async () => null }),
      "1",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_found");
  });
});
