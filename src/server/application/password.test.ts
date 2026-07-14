import { describe, expect, it, vi } from "vitest";
import {
  requestPasswordReset,
  resetPassword,
  changePassword,
  type PasswordDeps,
} from "./password";
import type { AuthUserRepository, UserWithSecret } from "@/server/domain/auth";
import type { Mailer } from "@/server/domain/mailer";
import { ok, err, unexpected, type Result } from "@/server/domain/result";

const NOW = new Date("2026-07-14T12:00:00.000Z");
const KNOWN_USER: UserWithSecret = {
  id: "u1",
  username: "Uživatel",
  role: "user",
  hash: "oldhash",
  salt: "oldsalt",
};

function makeDeps(over?: {
  users?: Partial<AuthUserRepository>;
  mailerResult?: Result<void>;
  verify?: boolean;
}): {
  deps: PasswordDeps;
  users: { [K in keyof AuthUserRepository]: ReturnType<typeof vi.fn> };
  send: ReturnType<typeof vi.fn>;
} {
  const users = {
    findByEmailWithSecret: vi.fn(),
    findByIdWithSecret: vi.fn(async () => KNOWN_USER),
    setResetToken: vi.fn(async () => true),
    findByResetToken: vi.fn(async () => ({
      id: "u1",
      expiresAt: new Date(NOW.getTime() + 60_000),
    })),
    setPassword: vi.fn(async () => true),
    clearReset: vi.fn(async () => undefined),
    ...over?.users,
  } as unknown as { [K in keyof AuthUserRepository]: ReturnType<typeof vi.fn> };

  const send = vi.fn(async () => over?.mailerResult ?? ok(undefined));
  const mailer: Mailer = { send };

  const deps: PasswordDeps = {
    users: users as unknown as AuthUserRepository,
    mailer,
    hashPassword: vi.fn(async () => ({ salt: "newsalt", hash: "newhash" })),
    verifyPassword: vi.fn(async () => over?.verify ?? true),
    generateToken: () => "reset-token",
    buildResetUrl: (t) => `https://app.test/obnova-hesla/${t}`,
    now: () => NOW,
  };
  return { deps, users, send };
}

describe("requestPasswordReset", () => {
  it("returns a generic OK for a MISSING email (no enumeration, no send)", async () => {
    const { deps, send } = makeDeps({
      users: { setResetToken: vi.fn(async () => false) },
    });

    const result = await requestPasswordReset(deps, "nikdo@nikde.cz");

    expect(result.ok).toBe(true);
    expect(send).not.toHaveBeenCalled();
  });

  it("returns the SAME generic OK for a real email (and sends the link)", async () => {
    const { deps, send } = makeDeps();

    const result = await requestPasswordReset(deps, "user@ex.cz");

    expect(result.ok).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].to).toBe("user@ex.cz");
  });

  it("surfaces a retryable error when the reset email fails (gotcha #6)", async () => {
    const { deps } = makeDeps({ mailerResult: err(unexpected("smtp down")) });

    const result = await requestPasswordReset(deps, "user@ex.cz");

    expect(result.ok).toBe(false);
  });

  it("rejects a malformed email as input error", async () => {
    const { deps, send } = makeDeps();

    const result = await requestPasswordReset(deps, "not-an-email");

    expect(result.ok).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
});

describe("resetPassword", () => {
  const good = { password: "noveheslo1", confirmPassword: "noveheslo1" };

  it("rejects an unknown token", async () => {
    const { deps } = makeDeps({
      users: { findByResetToken: vi.fn(async () => null) },
    });

    const result = await resetPassword(deps, "bad", good);

    expect(result.ok).toBe(false);
  });

  it("rejects (and clears) an expired token without setting a password", async () => {
    const { deps, users } = makeDeps({
      users: {
        findByResetToken: vi.fn(async () => ({
          id: "u1",
          expiresAt: new Date(NOW.getTime() - 1),
        })),
      },
    });

    const result = await resetPassword(deps, "expired", good);

    expect(result.ok).toBe(false);
    expect(users.clearReset).toHaveBeenCalledWith("u1");
    expect(users.setPassword).not.toHaveBeenCalled();
  });

  it("sets the password and clears the token for a valid reset", async () => {
    const { deps, users } = makeDeps();

    const result = await resetPassword(deps, "reset-token", good);

    expect(result.ok).toBe(true);
    expect(users.setPassword).toHaveBeenCalledWith("u1", {
      hash: "newhash",
      salt: "newsalt",
    });
    expect(users.clearReset).toHaveBeenCalledWith("u1");
  });

  it("rejects a password mismatch", async () => {
    const { deps, users } = makeDeps();

    const result = await resetPassword(deps, "reset-token", {
      password: "noveheslo1",
      confirmPassword: "jineheslo1",
    });

    expect(result.ok).toBe(false);
    expect(users.setPassword).not.toHaveBeenCalled();
  });
});

describe("changePassword", () => {
  const good = { password: "noveheslo1", confirmPassword: "noveheslo1" };

  it("rejects a wrong current password", async () => {
    const { deps, users } = makeDeps({ verify: false });

    const result = await changePassword(deps, "u1", "wrong", good);

    expect(result.ok).toBe(false);
    if (!result.ok && result.error.kind === "validation") {
      expect(result.error.fieldErrors?.currentPassword).toBeDefined();
    }
    expect(users.setPassword).not.toHaveBeenCalled();
  });

  it("changes the password when the current one verifies", async () => {
    const { deps, users } = makeDeps();

    const result = await changePassword(deps, "u1", "correct", good);

    expect(result.ok).toBe(true);
    expect(users.setPassword).toHaveBeenCalledWith("u1", {
      hash: "newhash",
      salt: "newsalt",
    });
  });

  it("returns not_found for an unknown account", async () => {
    const { deps } = makeDeps({
      users: { findByIdWithSecret: vi.fn(async () => null) },
    });

    const result = await changePassword(deps, "missing", "x", good);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_found");
  });
});
