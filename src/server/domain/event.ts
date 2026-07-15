import type { UncroppedImageDto } from "./news";

export type ProgramDto = {
  id: string;
  title: string;
  message: string | null;
  // Never cropped — often a vertical flyer, shown in full via its own aspect ratio.
  image: UncroppedImageDto | null;
};

export type EventDto = {
  id: string;
  title: string;
  year: number;
  current: boolean;
  program: ProgramDto | null;
};

// Write inputs — already validated/sanitized by the use case before the repo sees them.
export type CreateEventInput = {
  title: string;
  year: number;
};

export type UpdateEventInput = {
  title: string;
  year: number;
};

export type ProgramInput = {
  title: string;
  message: string;
  // Required when adding a program; optional on update (only when replacing it).
  image?: UncroppedImageDto;
};

export type EventRepository = {
  list(): Promise<EventDto[]>;
  getCurrent(): Promise<EventDto | null>;
  getById(id: string): Promise<EventDto | null>;
  /**
   * Create the event as the sole `current` ročník in ONE transaction: flip every
   * existing current off, insert this one as current, reset every user's
   * `request` to "notsend". Returns the new id.
   */
  createCurrent(input: CreateEventInput): Promise<string>;
  update(id: string, input: UpdateEventInput): Promise<EventDto | null>;
  delete(id: string): Promise<EventDto | null>;
  /** Create a Program and point the event at it; null if the event is unknown. */
  addProgram(eventId: string, program: ProgramInput): Promise<EventDto | null>;
  /**
   * Update the event's existing Program; when a new image is supplied the old S3
   * key is returned so the use case can delete it. null if event/program missing.
   */
  updateProgram(
    eventId: string,
    program: ProgramInput,
  ): Promise<{ event: EventDto; replacedImageKey: string | null } | null>;
};
