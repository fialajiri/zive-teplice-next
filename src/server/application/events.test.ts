import { describe, expect, it } from "vitest";
import {
  getCurrentEvent,
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  addProgram,
  updateProgram,
  type EventWriteDeps,
} from "./events";
import type { EventDto, EventRepository } from "@/server/domain/event";
import type { StoragePort } from "@/server/domain/storage";

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
    getById: async () => null,
    createCurrent: async () => "new-id",
    update: async () => null,
    delete: async () => null,
    addProgram: async () => null,
    updateProgram: async () => null,
    ...overrides,
  };
}

function storageWith(overrides: Partial<StoragePort> = {}): StoragePort {
  return {
    presignUpload: async () => ({
      uploadUrl: "",
      key: "",
      publicUrl: "",
      requiredHeaders: {},
    }),
    deleteObject: async () => {},
    ...overrides,
  };
}

function depsWith(
  repo: Partial<EventRepository>,
  storage: Partial<StoragePort> = {},
): EventWriteDeps {
  return { events: repoWith(repo), storage: storageWith(storage) };
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

// ── Write path ───────────────────────────────────────────────────────────────

describe("createEvent", () => {
  it("delegates the atomic current-flip to the repository transaction", async () => {
    let called = false;
    const result = await createEvent(
      depsWith({
        createCurrent: async () => {
          called = true;
          return "abc";
        },
      }),
      { title: "Dostatečně dlouhý název", year: 2027 },
    );
    expect(result).toEqual({ ok: true, value: { id: "abc" } });
    expect(called).toBe(true);
  });

  it("rejects a too-short title", async () => {
    const result = await createEvent(depsWith({}), {
      title: "Krátký",
      year: 2027,
    });
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.kind === "validation") {
      expect(result.error.fieldErrors?.title).toBeDefined();
    }
  });

  it("rejects a non-4-digit year", async () => {
    const result = await createEvent(depsWith({}), {
      title: "Dostatečně dlouhý název",
      year: 42,
    });
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.kind === "validation") {
      expect(result.error.fieldErrors?.year).toBeDefined();
    }
  });
});

describe("updateEvent", () => {
  it("returns not_found for an unknown id", async () => {
    const result = await updateEvent(
      depsWith({ update: async () => null }),
      "1",
      { title: "Dostatečně dlouhý název", year: 2027 },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_found");
  });
});

describe("deleteEvent", () => {
  it("deletes the program image when the event had a program", async () => {
    let deletedKey: string | null = null;
    const withProgram: EventDto = {
      ...event,
      program: {
        id: "p1",
        title: "Program",
        message: "<p>a</p>",
        image: {
          imageUrl: "https://cdn/program/x.jpg",
          imageKey: "program/x.jpg",
        },
      },
    };
    const result = await deleteEvent(
      depsWith(
        { delete: async () => withProgram },
        {
          deleteObject: async (key) => {
            deletedKey = key;
          },
        },
      ),
      "1",
    );
    expect(result.ok).toBe(true);
    expect(deletedKey).toBe("program/x.jpg");
  });

  it("returns not_found when the event does not exist", async () => {
    const result = await deleteEvent(
      depsWith({ delete: async () => null }),
      "1",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_found");
  });
});

const validProgram = {
  title: "Program ročníku",
  message: "<p>Ahoj</p>",
  image: { imageUrl: "https://cdn/program/a.jpg", imageKey: "program/a.jpg" },
};

describe("addProgram", () => {
  it("adds a program when the event has none", async () => {
    let added = false;
    const result = await addProgram(
      depsWith({
        getById: async () => event,
        addProgram: async () => {
          added = true;
          return event;
        },
      }),
      "1",
      validProgram,
    );
    expect(result.ok).toBe(true);
    expect(added).toBe(true);
  });

  it("refuses to add when a program already exists (add-vs-update guard)", async () => {
    const withProgram: EventDto = {
      ...event,
      program: { id: "p1", title: "P", message: null, image: null },
    };
    const result = await addProgram(
      depsWith({ getById: async () => withProgram }),
      "1",
      validProgram,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("validation");
  });

  it("requires an image on add", async () => {
    const result = await addProgram(
      depsWith({ getById: async () => event }),
      "1",
      { title: validProgram.title, message: validProgram.message },
    );
    expect(result.ok).toBe(false);
  });
});

describe("updateProgram", () => {
  it("deletes the old image when a new one replaces it", async () => {
    let deletedKey: string | null = null;
    const result = await updateProgram(
      depsWith(
        {
          updateProgram: async () => ({
            event,
            replacedImageKey: "program/old.jpg",
          }),
        },
        {
          deleteObject: async (key) => {
            deletedKey = key;
          },
        },
      ),
      "1",
      {
        title: validProgram.title,
        message: validProgram.message,
        image: {
          imageUrl: "https://cdn/program/new.jpg",
          imageKey: "program/new.jpg",
        },
      },
    );
    expect(result.ok).toBe(true);
    expect(deletedKey).toBe("program/old.jpg");
  });

  it("does not touch storage when no image is replaced", async () => {
    let called = false;
    const result = await updateProgram(
      depsWith(
        { updateProgram: async () => ({ event, replacedImageKey: null }) },
        {
          deleteObject: async () => {
            called = true;
          },
        },
      ),
      "1",
      { title: validProgram.title, message: validProgram.message },
    );
    expect(result.ok).toBe(true);
    expect(called).toBe(false);
  });

  it("returns not_found when the program is missing", async () => {
    const result = await updateProgram(
      depsWith({ updateProgram: async () => null }),
      "1",
      { title: validProgram.title, message: validProgram.message },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_found");
  });
});
