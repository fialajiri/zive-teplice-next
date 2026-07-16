import { describe, expect, it, vi } from "vitest";
import {
  getHomepageContent,
  setHomepageContent,
  type HomepageContentWriteDeps,
} from "@/server/application/homepage-content";
import {
  DEFAULT_HOMEPAGE_CONTENT,
  type HomepageContentDto,
  type HomepageContentRepository,
} from "@/server/domain/homepage-content";
import type { StoragePort } from "@/server/domain/storage";

const VALID_CONTENT: HomepageContentDto = {
  heroImage: {
    imageUrl: "https://cdn.example.com/homepageHero/photo.jpg",
    imageKey: "homepageHero/photo.jpg",
    alt: "Popisek úvodní fotky",
  },
  aboutText:
    "Sousedská slavnost, dostatečně dlouhý text splňující minimální limit znaků.",
  aboutImage: {
    imageUrl: "https://cdn.example.com/homepageAbout/photo.jpg",
    imageKey: "homepageAbout/photo.jpg",
    alt: "Popisek fotky k textu",
  },
  highlights: [
    { title: "Hudba naživo", description: "Vystoupení kapel po celý den." },
    { title: "Občerstvení", description: "Dobroty od místních stánkařů." },
    { title: "Tvorba a trh", description: "Výstava obrazů a autorský trh." },
    { title: "Pro rodinu", description: "Divadlo, jóga a program pro děti." },
  ],
};

function makeRepo(overrides?: {
  get?: HomepageContentRepository["get"];
  set?: HomepageContentRepository["set"];
}): HomepageContentRepository {
  return {
    get: overrides?.get ?? vi.fn(async () => DEFAULT_HOMEPAGE_CONTENT),
    set: overrides?.set ?? vi.fn(async (input) => input),
  };
}

function makeDeps(overrides?: {
  repo?: HomepageContentRepository;
  storage?: Partial<StoragePort>;
}): HomepageContentWriteDeps {
  return {
    homepageContent: overrides?.repo ?? makeRepo(),
    storage: {
      presignUpload: vi.fn(),
      deleteObject: vi.fn(async () => {}),
      ...overrides?.storage,
    } as StoragePort,
  };
}

describe("getHomepageContent", () => {
  it("returns the repository's content", async () => {
    const repo = makeRepo({ get: vi.fn(async () => VALID_CONTENT) });
    expect(await getHomepageContent(repo)).toEqual(VALID_CONTENT);
  });

  it("fails safe to the default content if the repository throws", async () => {
    const repo = makeRepo({
      get: vi.fn(async () => {
        throw new Error("db down");
      }),
    });
    expect(await getHomepageContent(repo)).toEqual(DEFAULT_HOMEPAGE_CONTENT);
  });
});

describe("setHomepageContent", () => {
  it("persists valid content", async () => {
    const setMock = vi.fn(async (input) => input);
    const deps = makeDeps({ repo: makeRepo({ set: setMock }) });

    const result = await setHomepageContent(deps, VALID_CONTENT);

    expect(result.ok).toBe(true);
    expect(setMock).toHaveBeenCalledWith(VALID_CONTENT);
  });

  it("deletes the previous S3 image when replaced, but not when unchanged", async () => {
    const deleteObject = vi.fn(async () => {});
    const existing = {
      ...VALID_CONTENT,
      heroImage: {
        imageUrl: "https://cdn.example.com/homepageHero/old.jpg",
        imageKey: "homepageHero/old.jpg",
        alt: "Stará fotka",
      },
    };
    const deps = makeDeps({
      repo: makeRepo({
        get: vi.fn(async () => existing),
        set: vi.fn(async (input) => input),
      }),
      storage: { deleteObject },
    });

    await setHomepageContent(deps, VALID_CONTENT);

    expect(deleteObject).toHaveBeenCalledWith("homepageHero/old.jpg");
    expect(deleteObject).not.toHaveBeenCalledWith("homepageAbout/photo.jpg");
  });

  it("does not delete when the built-in default image (empty key) is replaced", async () => {
    const deleteObject = vi.fn(async () => {});
    const deps = makeDeps({
      repo: makeRepo({ get: vi.fn(async () => DEFAULT_HOMEPAGE_CONTENT) }),
      storage: { deleteObject },
    });

    await setHomepageContent(deps, VALID_CONTENT);

    expect(deleteObject).not.toHaveBeenCalled();
  });

  it("rejects an about text that is too short", async () => {
    const setMock = vi.fn();
    const deps = makeDeps({ repo: makeRepo({ set: setMock }) });

    const result = await setHomepageContent(deps, {
      ...VALID_CONTENT,
      aboutText: "Krátký text.",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("validation");
      if (result.error.kind === "validation") {
        expect(result.error.fieldErrors?.aboutText).toBeDefined();
      }
    }
    expect(setMock).not.toHaveBeenCalled();
  });

  it("rejects a highlight title that is too long", async () => {
    const setMock = vi.fn();
    const deps = makeDeps({ repo: makeRepo({ set: setMock }) });

    const result = await setHomepageContent(deps, {
      ...VALID_CONTENT,
      highlights: [
        { title: "X".repeat(33), description: "Popis dostatečně dlouhý." },
        VALID_CONTENT.highlights[1],
        VALID_CONTENT.highlights[2],
        VALID_CONTENT.highlights[3],
      ],
    });

    expect(result.ok).toBe(false);
    expect(setMock).not.toHaveBeenCalled();
  });

  it("rejects an empty image alt text", async () => {
    const setMock = vi.fn();
    const deps = makeDeps({ repo: makeRepo({ set: setMock }) });

    const result = await setHomepageContent(deps, {
      ...VALID_CONTENT,
      heroImage: { ...VALID_CONTENT.heroImage, alt: "" },
    });

    expect(result.ok).toBe(false);
    expect(setMock).not.toHaveBeenCalled();
  });

  it("surfaces a repository failure as an unexpected error", async () => {
    const deps = makeDeps({
      repo: makeRepo({
        set: vi.fn(async () => {
          throw new Error("db down");
        }),
      }),
    });

    const result = await setHomepageContent(deps, VALID_CONTENT);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("unexpected");
  });
});
