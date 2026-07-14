import { describe, expect, it, vi } from "vitest";
import { requestParticipation } from "./participation";
import type {
  ParticipationStatus,
  PerformerAccountDto,
  PerformerRepository,
} from "@/server/domain/performer";

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
    getById: vi.fn(),
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
