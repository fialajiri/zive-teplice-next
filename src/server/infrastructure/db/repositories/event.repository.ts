import "server-only";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "../connection";
import { EventModel, type EventDocument } from "../models/event.model";
import { ProgramModel, type ProgramDocument } from "../models/program.model";
import { UserModel } from "../models/user.model";
import type {
  EventDto,
  EventRepository,
  ProgramDto,
} from "@/server/domain/event";
import { toUncroppedImageDto } from "./mappers";

function toProgramDto(doc: ProgramDocument): ProgramDto {
  return {
    id: doc._id.toString(),
    title: doc.title,
    message: doc.message ?? null,
    image: toUncroppedImageDto(doc.image),
  };
}

function toEventDto(doc: EventDocument, program: ProgramDto | null): EventDto {
  return {
    id: doc._id.toString(),
    title: doc.title,
    year: doc.year,
    current: doc.current,
    program,
  };
}

// Fetch the referenced program separately (mirrors legacy controller; avoids
// brittle populate+lean typing).
async function loadProgram(
  programRef: EventDocument["program"],
): Promise<ProgramDto | null> {
  if (!programRef) return null;
  const doc = await ProgramModel.findById(
    programRef,
  ).lean<ProgramDocument | null>();
  return doc ? toProgramDto(doc) : null;
}

export function createEventRepository(): EventRepository {
  return {
    async list() {
      await connectToDatabase();
      const docs = await EventModel.find()
        .sort({ year: -1 })
        .lean<EventDocument[]>();
      return docs.map((doc) => toEventDto(doc, null));
    },
    async listPage({ page, pageSize }) {
      await connectToDatabase();
      const [docs, total] = await Promise.all([
        // `_id` is a tiebreaker: year alone isn't unique enough (two events
        // could theoretically share a year) to keep .skip/.limit deterministic.
        EventModel.find()
          .sort({ year: -1, _id: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .lean<EventDocument[]>(),
        EventModel.countDocuments(),
      ]);
      return { items: docs.map((doc) => toEventDto(doc, null)), total };
    },
    async getCurrent() {
      await connectToDatabase();
      const event = await EventModel.findOne({
        current: true,
      }).lean<EventDocument | null>();
      if (!event) return null;
      return toEventDto(event, await loadProgram(event.program));
    },
    async getById(id) {
      if (!isValidObjectId(id)) return null;
      await connectToDatabase();
      const event = await EventModel.findById(id).lean<EventDocument | null>();
      if (!event) return null;
      return toEventDto(event, await loadProgram(event.program));
    },
    async createCurrent(input) {
      const conn = await connectToDatabase();
      const session = await conn.startSession();
      try {
        let newId = "";
        // Atomic "make current" (docs/03 §3, gotcha #5): flip every current off,
        // insert this one as current, reset every user's participation request.
        // A partial failure rolls the whole thing back — never two current events
        // or a half-reset user set.
        await session.withTransaction(async () => {
          await EventModel.updateMany(
            { current: true },
            { $set: { current: false } },
            { session },
          );
          const [created] = await EventModel.create(
            [{ title: input.title, year: input.year, current: true }],
            { session },
          );
          newId = created._id.toString();
          await UserModel.updateMany(
            {},
            { $set: { request: "notsend" } },
            { session },
          );
        });
        return newId;
      } finally {
        await session.endSession();
      }
    },
    async update(id, input) {
      if (!isValidObjectId(id)) return null;
      await connectToDatabase();
      const doc = await EventModel.findByIdAndUpdate(
        id,
        { $set: { title: input.title, year: input.year } },
        { returnDocument: "after" },
      ).lean<EventDocument | null>();
      if (!doc) return null;
      return toEventDto(doc, await loadProgram(doc.program));
    },
    async delete(id) {
      if (!isValidObjectId(id)) return null;
      await connectToDatabase();
      const event = await EventModel.findById(id);
      if (!event) return null;

      const program = await loadProgram(event.program);
      // Remove the orphaned Program document along with the event; its S3 image
      // is deleted by the use case from the returned DTO.
      if (event.program) await ProgramModel.findByIdAndDelete(event.program);
      await event.deleteOne();
      return toEventDto(event, program);
    },
    async addProgram(eventId, program) {
      if (!isValidObjectId(eventId)) return null;
      await connectToDatabase();
      const event = await EventModel.findById(eventId);
      if (!event) return null;

      const created = await ProgramModel.create({
        title: program.title,
        message: program.message,
        image: program.image,
      });
      event.program = created._id;
      await event.save();
      return toEventDto(event, toProgramDto(created));
    },
    async updateProgram(eventId, program) {
      if (!isValidObjectId(eventId)) return null;
      await connectToDatabase();
      const event = await EventModel.findById(eventId);
      if (!event?.program) return null;

      const existing = await ProgramModel.findById(event.program);
      if (!existing) return null;

      let replacedImageKey: string | null = null;
      existing.title = program.title;
      existing.message = program.message;
      if (program.image) {
        replacedImageKey = existing.image?.imageKey ?? null;
        existing.image = program.image;
      }
      await existing.save();
      return {
        event: toEventDto(event, toProgramDto(existing)),
        replacedImageKey,
      };
    },
  };
}
