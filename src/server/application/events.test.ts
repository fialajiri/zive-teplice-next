import { describe, expect, it } from "vitest";
import { getCurrentEvent, listEvents } from "./events";
import type { EventDto, EventRepository } from "@/server/domain/event";

const event: EventDto = {
  id: "1",
  title: "Živé Teplice",
  year: 2026,
  current: true,
  program: null,
};

function repoWith(overrides: Partial<EventRepository>): EventRepository {
  return {
    list: async () => [],
    getCurrent: async () => null,
    ...overrides,
  };
}

describe("getCurrentEvent", () => {
  it("returns the current event when present", async () => {
    const result = await getCurrentEvent(
      repoWith({ getCurrent: async () => event }),
    );
    expect(result).toEqual({ ok: true, value: event });
  });

  it("returns not_found when there is no current event", async () => {
    const result = await getCurrentEvent(repoWith({}));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_found");
  });
});

describe("listEvents", () => {
  it("passes through the repository list", async () => {
    const result = await listEvents(repoWith({ list: async () => [event] }));
    expect(result).toEqual({ ok: true, value: [event] });
  });
});
