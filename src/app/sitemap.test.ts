import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/container", () => ({
  container: {
    newsRepository: {
      list: async () => [
        { id: "n1", updatedAt: "2026-01-01T00:00:00.000Z" },
        { id: "n2", updatedAt: "2026-02-01T00:00:00.000Z" },
      ],
      listDistinctYears: async () => [2026, 2025],
    },
    galleryRepository: {
      list: async () => [{ id: "g1", updatedAt: "2026-01-01T00:00:00.000Z" }],
    },
    performerRepository: {
      list: async () => [{ id: "p1" }, { id: "p2" }, { id: "p3" }],
    },
  },
}));

describe("sitemap", () => {
  it("includes the static routes and every dynamic content id", async () => {
    const { default: sitemap } = await import("./sitemap");
    const entries = await sitemap();
    const locs = entries.map((entry) => entry.url);

    // Static routes.
    expect(locs.some((url) => url.endsWith("/"))).toBe(true);
    expect(locs.some((url) => url.endsWith("/aktuality"))).toBe(true);
    expect(locs.some((url) => url.endsWith("/aktuality/archiv"))).toBe(true);
    expect(locs.some((url) => url.endsWith("/galerie"))).toBe(true);
    expect(locs.some((url) => url.endsWith("/ucinkujici"))).toBe(true);
    expect(locs.some((url) => url.endsWith("/ucinkujici/vsichni"))).toBe(true);
    expect(locs.some((url) => url.endsWith("/kontakt"))).toBe(true);

    // Dynamic news items + archive years.
    expect(locs.some((url) => url.endsWith("/aktuality/n1"))).toBe(true);
    expect(locs.some((url) => url.endsWith("/aktuality/n2"))).toBe(true);
    expect(locs.some((url) => url.endsWith("/aktuality/archiv/2026"))).toBe(
      true,
    );
    expect(locs.some((url) => url.endsWith("/aktuality/archiv/2025"))).toBe(
      true,
    );

    // Dynamic galleries + performers.
    expect(locs.some((url) => url.endsWith("/galerie/g1"))).toBe(true);
    expect(locs.some((url) => url.endsWith("/ucinkujici/p1"))).toBe(true);
    expect(locs.some((url) => url.endsWith("/ucinkujici/p2"))).toBe(true);
    expect(locs.some((url) => url.endsWith("/ucinkujici/p3"))).toBe(true);
  });

  it("uses the same origin for every entry", async () => {
    const { default: sitemap } = await import("./sitemap");
    const entries = await sitemap();
    const origins = new Set(entries.map((entry) => new URL(entry.url).origin));
    expect(origins.size).toBe(1);
  });
});
