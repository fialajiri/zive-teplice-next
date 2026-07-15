import { describe, expect, it, vi } from "vitest";
import {
  requestParticipation,
  decideParticipation,
  searchPerformersForAdmin,
} from "./participation";
import type {
  ParticipationStatus,
  PerformerAccountDto,
  PerformerRepository,
} from "@/server/domain/performer";
import type { Mailer, MailMessage } from "@/server/domain/mailer";
import { ok, err, unexpected, type Result } from "@/server/domain/result";

function accountWith(request: ParticipationStatus): PerformerAccountDto {
  return {
    id: "p1",
    email: "a@b.cz",
    username: "Účinkující",
    phoneNumber: "777123456",
    description: "",
    request,
    image: null,
  };
}

function makeRepo(request: ParticipationStatus): {
  repo: PerformerRepository;
  setRequest: ReturnType<typeof vi.fn>;
} {
  const setRequest = vi.fn(async () => true);
  const repo: PerformerRepository = {
    list: vi.fn(),
    search: vi.fn(),
    getById: vi.fn(),
    searchForAdmin: vi.fn(),
    create: vi.fn(),
    findByEmail: vi.fn(),
    existsByUsername: vi.fn(),
    getAccountById: vi.fn(async () => accountWith(request)),
    update: vi.fn(),
    delete: vi.fn(),
    setRequest,
  };
  return { repo, setRequest };
}

describe("requestParticipation", () => {
  it.each(["notsend", "rejected"] as const)(
    "sets pending from %s",
    async (from) => {
      const { repo, setRequest } = makeRepo(from);

      const result = await requestParticipation(repo, "p1");

      expect(result.ok).toBe(true);
      expect(setRequest).toHaveBeenCalledWith("p1", "pending");
    },
  );

  it.each(["pending", "approved"] as const)(
    "refuses to re-request from %s",
    async (from) => {
      const { repo, setRequest } = makeRepo(from);

      const result = await requestParticipation(repo, "p1");

      expect(result.ok).toBe(false);
      expect(setRequest).not.toHaveBeenCalled();
    },
  );

  it("returns not_found for an unknown account", async () => {
    const { repo } = makeRepo("notsend");
    repo.getAccountById = vi.fn(async () => null);

    const result = await requestParticipation(repo, "missing");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_found");
  });
});

describe("decideParticipation", () => {
  function makeDeps(mailerResult: Result<void> = ok(undefined)) {
    const { repo, setRequest } = makeRepo("pending");
    const send = vi.fn<(message: MailMessage) => Promise<Result<void>>>(
      async () => mailerResult,
    );
    const mailer: Mailer = { send };
    return { deps: { performers: repo, mailer }, setRequest, send };
  }

  it.each(["approved", "rejected"] as const)(
    "sets status to %s and emails the performer",
    async (decision) => {
      const { deps, setRequest, send } = makeDeps();

      const result = await decideParticipation(deps, "p1", decision);

      expect(result.ok).toBe(true);
      expect(setRequest).toHaveBeenCalledWith("p1", decision);
      expect(send).toHaveBeenCalledTimes(1);
      expect(send.mock.calls[0][0].to).toBe("a@b.cz");
    },
  );

  it("still succeeds when the decision email fails (best-effort, gotcha #6)", async () => {
    const { deps, setRequest } = makeDeps(err(unexpected("smtp down")));

    const result = await decideParticipation(deps, "p1", "approved");

    // Email failed, but the status change is NOT rolled back.
    expect(result.ok).toBe(true);
    expect(setRequest).toHaveBeenCalledWith("p1", "approved");
  });

  it("returns not_found for an unknown performer (no email sent)", async () => {
    const { deps, send } = makeDeps();
    deps.performers.getAccountById = vi.fn(async () => null);

    const result = await decideParticipation(deps, "missing", "approved");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_found");
    expect(send).not.toHaveBeenCalled();
  });
});

describe("searchPerformersForAdmin", () => {
  it("clamps an invalid page to 1 and trims the query", async () => {
    const { repo } = makeRepo("pending");
    const searchForAdmin = vi.fn(async () => ({
      items: [accountWith("pending")],
      total: 1,
    }));
    repo.searchForAdmin = searchForAdmin;

    const result = await searchPerformersForAdmin(repo, {
      query: "  jana  ",
      page: -5,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        items: [accountWith("pending")],
        total: 1,
        page: 1,
        pageSize: 20,
      },
    });
    expect(searchForAdmin).toHaveBeenCalledWith({
      query: "jana",
      page: 1,
      pageSize: 20,
    });
  });

  it("passes an undefined query when the input is blank", async () => {
    const { repo } = makeRepo("pending");
    const searchForAdmin = vi.fn(async () => ({ items: [], total: 0 }));
    repo.searchForAdmin = searchForAdmin;

    await searchPerformersForAdmin(repo, { query: "   " });

    expect(searchForAdmin).toHaveBeenCalledWith({
      query: undefined,
      page: 1,
      pageSize: 20,
    });
  });

  it("returns unexpected on a repository failure", async () => {
    const { repo } = makeRepo("pending");
    repo.searchForAdmin = vi.fn(async () => {
      throw new Error("db down");
    });

    const result = await searchPerformersForAdmin(repo, {});

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("unexpected");
  });
});
