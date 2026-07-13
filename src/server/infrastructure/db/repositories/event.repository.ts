import "server-only";
import { connectToDatabase } from "../connection";
import { EventModel, type EventDocument } from "../models/event.model";
import { ProgramModel, type ProgramDocument } from "../models/program.model";
import type {
  EventDto,
  EventRepository,
  ProgramDto,
} from "@/server/domain/event";
import { toImageDto } from "./mappers";

function toProgramDto(doc: ProgramDocument): ProgramDto {
  return {
    id: doc._id.toString(),
    title: doc.title,
    message: doc.message ?? null,
    image: toImageDto(doc.image),
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

export function createEventRepository(): EventRepository {
  return {
    async list() {
      await connectToDatabase();
      const docs = await EventModel.find()
        .sort({ year: -1 })
        .lean<EventDocument[]>();
      return docs.map((doc) => toEventDto(doc, null));
    },
    async getCurrent() {
      await connectToDatabase();
      const event = await EventModel.findOne({
        current: true,
      }).lean<EventDocument | null>();
      if (!event) return null;

      // Fetch the referenced program separately (mirrors legacy controller;
      // avoids brittle populate+lean typing).
      let program: ProgramDto | null = null;
      if (event.program) {
        const doc = await ProgramModel.findById(
          event.program,
        ).lean<ProgramDocument | null>();
        if (doc) program = toProgramDto(doc);
      }
      return toEventDto(event, program);
    },
  };
}
