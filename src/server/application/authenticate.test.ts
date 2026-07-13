import { describe, expect, it, vi } from "vitest";
import { authenticateUser, type AuthenticateDeps } from "./authenticate";
import type { UserWithSecret } from "@/server/domain/auth";

const KNOWN_USER: UserWithSecret = {
  id: "507f1f77bcf86cd799439011",
  username: "Admin",
  role: "admin",
  hash: "deadbeef",
  salt: "cafe",
};

function makeDeps(overrides: Partial<AuthenticateDeps> = {}): AuthenticateDeps {
  return {
    users: {
      findByEmailWithSecret: vi.fn().mockResolvedValue(KNOWN_USER),
    },
    verifyPassword: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("authenticateUser", () => {
  it("returns the session user (no secrets) on valid credentials", async () => {
    const result = await authenticateUser(makeDeps(), {
      email: "admin@zive-teplice.cz",
      password: "correct",
    });

    expect(result).toEqual({
      ok: true,
      value: { id: KNOWN_USER.id, username: "Admin", role: "admin" },
    });
    // The result must never carry hash/salt.
    if (result.ok) {
      expect(result.value).not.toHaveProperty("hash");
      expect(result.value).not.toHaveProperty("salt");
    }
  });

  it("normalises and forwards the email to the repository", async () => {
    const deps = makeDeps();
    await authenticateUser(deps, {
      email: "  Admin@Zive-Teplice.CZ ",
      password: "correct",
    });
    expect(deps.users.findByEmailWithSecret).toHaveBeenCalledWith(
      "admin@zive-teplice.cz",
    );
  });

  it("yields invalid_credentials for a wrong password", async () => {
    const result = await authenticateUser(
      makeDeps({ verifyPassword: vi.fn().mockResolvedValue(false) }),
      { email: "admin@zive-teplice.cz", password: "wrong" },
    );
    expect(result).toEqual({
      ok: false,
      error: { kind: "invalid_credentials" },
    });
  });

  it("yields the SAME invalid_credentials for an unknown email", async () => {
    const result = await authenticateUser(
      makeDeps({
        users: { findByEmailWithSecret: vi.fn().mockResolvedValue(null) },
      }),
      { email: "ghost@zive-teplice.cz", password: "whatever" },
    );
    expect(result).toEqual({
      ok: false,
      error: { kind: "invalid_credentials" },
    });
  });

  it("does not run password verification for an unknown email", async () => {
    const verifyPassword = vi.fn().mockResolvedValue(true);
    await authenticateUser(
      makeDeps({
        users: { findByEmailWithSecret: vi.fn().mockResolvedValue(null) },
        verifyPassword,
      }),
      { email: "ghost@zive-teplice.cz", password: "whatever" },
    );
    expect(verifyPassword).not.toHaveBeenCalled();
  });

  it("rejects malformed input as invalid_credentials without hitting the repo", async () => {
    const deps = makeDeps();
    const result = await authenticateUser(deps, {
      email: "not-an-email",
      password: "",
    });
    expect(result).toEqual({
      ok: false,
      error: { kind: "invalid_credentials" },
    });
    expect(deps.users.findByEmailWithSecret).not.toHaveBeenCalled();
  });
});
