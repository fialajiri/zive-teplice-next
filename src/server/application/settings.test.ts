import { describe, expect, it, vi } from "vitest";
import { getSocialLinks, setSocialLinks } from "@/server/application/settings";
import type {
  AppSettingsDto,
  SettingsRepository,
} from "@/server/domain/settings";

function makeRepo(overrides?: {
  get?: SettingsRepository["get"];
  setSocialLinks?: SettingsRepository["setSocialLinks"];
}): SettingsRepository {
  return {
    get:
      overrides?.get ??
      vi.fn(async () => ({
        registrationOpen: false,
        facebookUrl: "https://www.facebook.com/ZiveTeplice2023",
        instagramUrl: "https://www.instagram.com/zive_teplice/",
      })),
    setRegistrationOpen: vi.fn(),
    setSocialLinks:
      overrides?.setSocialLinks ??
      vi.fn(async (input): Promise<AppSettingsDto> => ({
        registrationOpen: false,
        ...input,
      })),
  };
}

describe("getSocialLinks", () => {
  it("returns the repository's links", async () => {
    const repo = makeRepo();
    const links = await getSocialLinks(repo);
    expect(links).toEqual({
      facebookUrl: "https://www.facebook.com/ZiveTeplice2023",
      instagramUrl: "https://www.instagram.com/zive_teplice/",
    });
  });

  it("fails safe (hides both links) if the repository throws", async () => {
    const repo = makeRepo({
      get: vi.fn(async () => {
        throw new Error("db down");
      }),
    });
    const links = await getSocialLinks(repo);
    expect(links).toEqual({ facebookUrl: "", instagramUrl: "" });
  });
});

describe("setSocialLinks", () => {
  it("persists valid URLs", async () => {
    const setSocialLinksMock = vi.fn(async (input) => ({
      registrationOpen: false,
      ...input,
    }));
    const repo = makeRepo({ setSocialLinks: setSocialLinksMock });

    const result = await setSocialLinks(repo, {
      facebookUrl: "https://www.facebook.com/custom",
      instagramUrl: "https://www.instagram.com/custom",
    });

    expect(result.ok).toBe(true);
    expect(setSocialLinksMock).toHaveBeenCalledWith({
      facebookUrl: "https://www.facebook.com/custom",
      instagramUrl: "https://www.instagram.com/custom",
    });
  });

  it("allows clearing a link with an empty string (hides it)", async () => {
    const setSocialLinksMock = vi.fn(async (input) => ({
      registrationOpen: false,
      ...input,
    }));
    const repo = makeRepo({ setSocialLinks: setSocialLinksMock });

    const result = await setSocialLinks(repo, {
      facebookUrl: "",
      instagramUrl: "https://www.instagram.com/custom",
    });

    expect(result.ok).toBe(true);
    expect(setSocialLinksMock).toHaveBeenCalledWith({
      facebookUrl: "",
      instagramUrl: "https://www.instagram.com/custom",
    });
  });

  it("rejects an invalid (non-empty, non-URL) value without persisting", async () => {
    const setSocialLinksMock = vi.fn();
    const repo = makeRepo({ setSocialLinks: setSocialLinksMock });

    const result = await setSocialLinks(repo, {
      facebookUrl: "not-a-url",
      instagramUrl: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("validation");
      if (result.error.kind === "validation") {
        expect(result.error.fieldErrors?.facebookUrl).toBeDefined();
      }
    }
    expect(setSocialLinksMock).not.toHaveBeenCalled();
  });

  it("surfaces a repository failure as an unexpected error", async () => {
    const repo = makeRepo({
      setSocialLinks: vi.fn(async () => {
        throw new Error("db down");
      }),
    });

    const result = await setSocialLinks(repo, {
      facebookUrl: "",
      instagramUrl: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("unexpected");
  });
});
