import { describe, expect, it, vi } from "vitest";
import {
  updatePerformer,
  deletePerformer,
  type PerformerWriteDeps,
} from "./performers";
import type {
  PerformerAccountDto,
  PerformerDto,
  PerformerRepository,
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
