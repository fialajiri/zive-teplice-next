import type { ImageDto } from "./news";

export type ProgramDto = {
  id: string;
  title: string;
  message: string | null;
  image: ImageDto | null;
};

export type EventDto = {
  id: string;
  title: string;
  year: number;
  current: boolean;
  program: ProgramDto | null;
};

export type EventRepository = {
  list(): Promise<EventDto[]>;
  getCurrent(): Promise<EventDto | null>;
};
