"use server";

import { revalidatePath } from "next/cache";
import { container } from "@/server/container";
import { requireAdmin } from "@/server/actions/guards";
import { isValidUploadedImage } from "@/server/actions/image-ref";
import {
  createEvent,
  updateEvent,
  deleteEvent,
  addProgram,
  updateProgram,
  type EventWriteDeps,
} from "@/server/application/events";
import type { ProgramInput } from "@/server/domain/event";
import type { DomainError, FieldErrors } from "@/server/domain/result";
import { sanitizeRichText } from "@/lib/sanitize-html";

export type EventActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export type EventFormInput = {
  title: string;
  year: number;
};

export type ProgramFormInput = {
  title: string;
  message: string;
  imageUrl?: string;
  imageKey?: string;
};

const FORBIDDEN: EventActionResult = {
  ok: false,
  error: "Nedostatečná oprávnění.",
};

const INVALID_IMAGE: EventActionResult = {
  ok: false,
  error: "Neplatný obrázek.",
  fieldErrors: { image: ["Nahrajte prosím platný obrázek (PNG nebo JPG)."] },
};

function writeDeps(): EventWriteDeps {
  return { events: container.eventRepository, storage: container.storage };
}

function mapError(error: DomainError): EventActionResult {
  if (error.kind === "validation") {
    return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
  }
  return { ok: false, error: error.message };
}

// The current event drives /program and the home page; changes also refresh the
// admin listing pages.
function revalidateEvents(id?: string): void {
  revalidatePath("/program");
  revalidatePath("/");
  revalidatePath("/admin/rocniky");
  if (id) revalidatePath(`/admin/rocniky/${id}`);
}

function toYear(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : NaN;
}

export async function createEventAction(
  input: EventFormInput,
): Promise<EventActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return FORBIDDEN;

  const result = await createEvent(writeDeps(), {
    title: String(input?.title ?? ""),
    year: toYear(input?.year),
  });
  if (!result.ok) return mapError(result.error);

  revalidateEvents(result.value.id);
  return { ok: true, id: result.value.id };
}

export async function updateEventAction(
  id: string,
  input: EventFormInput,
): Promise<EventActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return FORBIDDEN;
  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, error: "Neplatný požadavek." };
  }

  const result = await updateEvent(writeDeps(), id, {
    title: String(input?.title ?? ""),
    year: toYear(input?.year),
  });
  if (!result.ok) return mapError(result.error);

  revalidateEvents(id);
  return { ok: true, id };
}

export async function deleteEventAction(
  id: string,
): Promise<EventActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return FORBIDDEN;
  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, error: "Neplatný požadavek." };
  }

  const result = await deleteEvent(writeDeps(), id);
  if (!result.ok) return mapError(result.error);

  revalidateEvents(id);
  return { ok: true, id };
}

// Shared: validate + assemble a sanitized ProgramInput. On add the image is
// required; on update it's only present when the admin replaced it.
function buildProgramInput(
  input: ProgramFormInput,
  requireImage: boolean,
): ProgramInput | typeof INVALID_IMAGE {
  const title = String(input?.title ?? "");
  const message = sanitizeRichText(String(input?.message ?? ""));

  let image: ProgramInput["image"];
  if (input?.imageUrl || input?.imageKey) {
    const imageUrl = String(input.imageUrl ?? "");
    const imageKey = String(input.imageKey ?? "");
    if (!isValidUploadedImage(imageUrl, imageKey, "program")) {
      return INVALID_IMAGE;
    }
    image = { imageUrl, imageKey };
  } else if (requireImage) {
    return INVALID_IMAGE;
  }

  return { title, message, image };
}

export async function addProgramAction(
  eventId: string,
  input: ProgramFormInput,
): Promise<EventActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return FORBIDDEN;
  if (typeof eventId !== "string" || eventId.length === 0) {
    return { ok: false, error: "Neplatný požadavek." };
  }

  const program = buildProgramInput(input, true);
  if ("ok" in program) return program; // INVALID_IMAGE

  const result = await addProgram(writeDeps(), eventId, program);
  if (!result.ok) return mapError(result.error);

  revalidateEvents(eventId);
  return { ok: true, id: eventId };
}

export async function updateProgramAction(
  eventId: string,
  input: ProgramFormInput,
): Promise<EventActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return FORBIDDEN;
  if (typeof eventId !== "string" || eventId.length === 0) {
    return { ok: false, error: "Neplatný požadavek." };
  }

  const program = buildProgramInput(input, false);
  if ("ok" in program) return program; // INVALID_IMAGE

  const result = await updateProgram(writeDeps(), eventId, program);
  if (!result.ok) return mapError(result.error);

  revalidateEvents(eventId);
  return { ok: true, id: eventId };
}
