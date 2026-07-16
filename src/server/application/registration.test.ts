import { describe, expect, it, vi } from "vitest";
import { registerUser, type RegistrationDeps } from "./registration";
import type { PerformerRepository } from "@/server/domain/performer";
import type { SettingsRepository } from "@/server/domain/settings";

const VALID = {
  email: "novy@ucinkujici.cz",
  username: "Nový Účinkující",
  password: "tajneheslo1",
  confirmPassword: "tajneheslo1",
  phoneNumber: "777123456",
  description: "Krátké představení.",
  image: {
    imageUrl: "https://cdn/performer/a.jpg",
    imageKey: "performer/a.jpg",
  },
};

function makeDeps(overrides?: {
  registrationOpen?: boolean;
  findByEmail?: PerformerRepository["findByEmail"];
  existsByUsername?: PerformerRepository["existsByUsername"];
}): {
  deps: RegistrationDeps;
  create: ReturnType<typeof vi.fn>;
  hashPassword: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn(async () => "new-id");
  const hashPassword = vi.fn(async () => ({ salt: "s".repeat(64), hash: "h" }));

  const performers: PerformerRepository = {
    list: vi.fn(),
    search: vi.fn(),
    getById: vi.fn(),
    searchForAdmin: vi.fn(),
    listAllForAdmin: vi.fn(),
    create,
    findByEmail: overrides?.findByEmail ?? vi.fn(async () => null),
    existsByUsername: overrides?.existsByUsername ?? vi.fn(async () => false),
    getAccountById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    setRequest: vi.fn(),
  };
  const settings: SettingsRepository = {
    get: vi.fn(async () => ({
      registrationOpen: overrides?.registrationOpen ?? true,
    })),
    setRegistrationOpen: vi.fn(),
  };

  return { deps: { performers, settings, hashPassword }, create, hashPassword };
}

describe("registerUser", () => {
  it("rejects when registration is closed (server-enforced)", async () => {
    const { deps, create, hashPassword } = makeDeps({
      registrationOpen: false,
    });

    const result = await registerUser(deps, VALID);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("validation");
    expect(create).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
  });

  it("rejects a duplicate email without hashing or persisting", async () => {
    const { deps, create, hashPassword } = makeDeps({
      findByEmail: vi.fn(async () => ({ id: "existing" })),
    });

    const result = await registerUser(deps, VALID);

    expect(result.ok).toBe(false);
    if (!result.ok && result.error.kind === "validation") {
      expect(result.error.fieldErrors?.email).toBeDefined();
    }
    expect(hashPassword).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects a duplicate username", async () => {
    const { deps, create } = makeDeps({
      existsByUsername: vi.fn(async () => true),
    });

    const result = await registerUser(deps, VALID);

    expect(result.ok).toBe(false);
    if (!result.ok && result.error.kind === "validation") {
      expect(result.error.fieldErrors?.username).toBeDefined();
    }
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    ["short password", { password: "short", confirmPassword: "short" }],
    ["password mismatch", { confirmPassword: "different1" }],
    ["short phone", { phoneNumber: "123" }],
    ["invalid email", { email: "not-an-email" }],
  ])("rejects invalid input: %s", async (_label, patch) => {
    const { deps, create } = makeDeps();

    const result = await registerUser(deps, { ...VALID, ...patch });

    expect(result.ok).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("succeeds: hashes the password and persists without any client role/request", async () => {
    const { deps, create, hashPassword } = makeDeps();

    const result = await registerUser(deps, VALID);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.id).toBe("new-id");

    expect(hashPassword).toHaveBeenCalledWith(VALID.password);

    // The record handed to the repo carries the derived hash/salt and NEVER a
    // client-supplied role/request (those are set inside the repository).
    expect(create).toHaveBeenCalledTimes(1);
    const record = create.mock.calls[0][0];
    expect(record).toMatchObject({
      email: VALID.email,
      username: VALID.username,
      hash: "h",
      salt: "s".repeat(64),
      phoneNumber: VALID.phoneNumber,
      image: VALID.image,
    });
    expect(record).not.toHaveProperty("role");
    expect(record).not.toHaveProperty("request");
    expect(record).not.toHaveProperty("password");
  });

  it("accepts an empty description (optional)", async () => {
    const { deps, create } = makeDeps();

    const result = await registerUser(deps, { ...VALID, description: "" });

    expect(result.ok).toBe(true);
    expect(create.mock.calls[0][0].description).toBe("");
  });
});
