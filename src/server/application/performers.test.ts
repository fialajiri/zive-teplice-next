import { describe, expect, it, vi } from "vitest";
import {
  updatePerformer,
  deletePerformer,
  searchPerformers,
  type PerformerWriteDeps,
} from "./performers";
import type {
  PerformerAccountDto,
  PerformerDto,
  PerformerRepository,
  PerformerSearchParams,
} from "@/server/domain/performer";

const EXISTING: PerformerAccountDto = {
  id: "p1",
  email: "a@b.cz",
  username: "Původní",
  phoneNumber: "777123456",
  description: "Popis.",
  request: "notsend",
  image: {
    imageUrl: "https://cdn/performer/old.jpg",
    imageKey: "performer/old.jpg",
  },
};

function makeDeps(overrides?: Partial<PerformerRepository>): {
  deps: PerformerWriteDeps;
  update: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  deleteObject: ReturnType<typeof vi.fn>;
} {
  const update = vi.fn(async (): Promise<PerformerDto> => ({
    id: EXISTING.id,
    username: "Nové",
    description: "",
    image: null,
  }));
  const del = vi.fn(async (): Promise<PerformerDto | null> => ({
    id: EXISTING.id,
    username: EXISTING.username,
    description: EXISTING.description,
    image: EXISTING.image,
  }));
  const deleteObject = vi.fn(async () => undefined);

  const performers: PerformerRepository = {
    list: vi.fn(),
    search: vi.fn(),
    getById: vi.fn(),
    listForAdmin: vi.fn(),
    create: vi.fn(),
    findByEmail: vi.fn(),
    existsByUsername: vi.fn(async () => false),
    getAccountById: vi.fn(async () => EXISTING),
    update,
    delete: del,
    setRequest: vi.fn(async () => true),
    ...overrides,
  };

  return {
    deps: { performers, storage: { presignUpload: vi.fn(), deleteObject } },
    update,
    del,
    deleteObject,
  };
}

const VALID_INPUT = {
  username: "Původní",
  phoneNumber: "777123456",
  description: "Popis.",
};

describe("updatePerformer", () => {
  it("deletes the old S3 object when the image is replaced", async () => {
    const { deps, deleteObject } = makeDeps();

    const result = await updatePerformer(deps, "p1", {
      ...VALID_INPUT,
      image: {
        imageUrl: "https://cdn/performer/new.jpg",
        imageKey: "performer/new.jpg",
      },
    });

    expect(result.ok).toBe(true);
    expect(deleteObject).toHaveBeenCalledWith("performer/old.jpg");
  });

  it("does not touch S3 when no new image is supplied", async () => {
    const { deps, deleteObject } = makeDeps();

    const result = await updatePerformer(deps, "p1", VALID_INPUT);

    expect(result.ok).toBe(true);
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it("rejects a username already taken by someone else", async () => {
    const { deps, update } = makeDeps({
      existsByUsername: vi.fn(async () => true),
    });

    const result = await updatePerformer(deps, "p1", {
      ...VALID_INPUT,
      username: "Obsazené",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && result.error.kind === "validation") {
      expect(result.error.fieldErrors?.username).toBeDefined();
    }
    expect(update).not.toHaveBeenCalled();
  });

  it("returns not_found when the account does not exist", async () => {
    const { deps } = makeDeps({ getAccountById: vi.fn(async () => null) });

    const result = await updatePerformer(deps, "missing", VALID_INPUT);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_found");
  });
});

function searchRepoWith(
  overrides: Partial<PerformerRepository> = {},
): PerformerRepository {
  return {
    list: vi.fn(),
    search: vi.fn(async () => ({ items: [], total: 0 })),
    getById: vi.fn(),
    listForAdmin: vi.fn(),
    create: vi.fn(),
    findByEmail: vi.fn(),
    existsByUsername: vi.fn(),
    getAccountById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    setRequest: vi.fn(),
    ...overrides,
  };
}

describe("searchPerformers", () => {
  it("defaults to page 1 / pageSize 12 and passes the query through", async () => {
    const captured: { params?: PerformerSearchParams } = {};
    const repo = searchRepoWith({
      search: vi.fn(async (params: PerformerSearchParams) => {
        captured.params = params;
        return { items: [], total: 0 };
      }),
    });

    const result = await searchPerformers(repo, { query: "  Bread  " });

    expect(result.ok).toBe(true);
    expect(captured.params).toEqual({
      query: "Bread",
      onlyApproved: undefined,
      page: 1,
      pageSize: 12,
    });
  });

  it("clamps an oversized pageSize to the max", async () => {
    const captured: { params?: PerformerSearchParams } = {};
    const repo = searchRepoWith({
      search: vi.fn(async (params: PerformerSearchParams) => {
        captured.params = params;
        return { items: [], total: 0 };
      }),
    });

    await searchPerformers(repo, { pageSize: 500 });

    expect(captured.params?.pageSize).toBe(50);
  });

  it("passes onlyApproved through to the repository", async () => {
    const captured: { params?: PerformerSearchParams } = {};
    const repo = searchRepoWith({
      search: vi.fn(async (params: PerformerSearchParams) => {
        captured.params = params;
        return { items: [], total: 0 };
      }),
    });

    await searchPerformers(repo, { onlyApproved: true });

    expect(captured.params?.onlyApproved).toBe(true);
  });

  it("returns an unexpected error when the repository throws", async () => {
    const repo = searchRepoWith({
      search: vi.fn(async () => {
        throw new Error("db down");
      }),
    });

    const result = await searchPerformers(repo, {});

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("unexpected");
  });
});

describe("deletePerformer", () => {
  it("removes the document and its S3 image", async () => {
    const { deps, deleteObject } = makeDeps();

    const result = await deletePerformer(deps, "p1");

    expect(result.ok).toBe(true);
    expect(deleteObject).toHaveBeenCalledWith("performer/old.jpg");
  });

  it("returns not_found when nothing was deleted", async () => {
    const { deps, deleteObject } = makeDeps({
      delete: vi.fn(async () => null),
    });

    const result = await deletePerformer(deps, "missing");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_found");
    expect(deleteObject).not.toHaveBeenCalled();
  });
});
