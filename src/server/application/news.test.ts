import { describe, expect, it } from "vitest";
import { listNews, getNews } from "./news";
import type { NewsDto, NewsRepository } from "@/server/domain/news";

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
    getById: async () => null,
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
