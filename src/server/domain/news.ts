// Serializable news DTO (id as string, dates as ISO strings) + repository port.

import type { Page, PageParams } from "./pagination";

export type ImageDto = { imageUrl: string; imageKey: string };

// An image stored without a forced crop — the display side needs the real
// dimensions to size its container to the exact aspect ratio (no crop, no
// letterboxing). Used for the program poster and news' optional second image.
export type UncroppedImageDto = ImageDto & { width: number; height: number };

export type NewsDto = {
  id: string;
  title: string;
  message: string | null;
  image: ImageDto | null;
  // Optional, uncropped second image (e.g. a flyer or site map) shown in full
  // on the detail page, below the cropped preview image.
  secondaryImage: UncroppedImageDto | null;
  createdAt: string;
  updatedAt: string;
};

// Write inputs are the already-validated, already-sanitized shapes the use case
// hands to the repository. Image is required on create; on update it is only
// present when the admin is replacing the existing image. secondaryImage is
// always optional; on update `null` means "explicitly removed".
export type CreateNewsInput = {
  title: string;
  message: string;
  image: ImageDto;
  secondaryImage?: UncroppedImageDto;
};

export type UpdateNewsInput = {
  title: string;
  message: string;
  image?: ImageDto;
  secondaryImage?: UncroppedImageDto | null;
};

export type NewsRepository = {
  list(): Promise<NewsDto[]>;
  /** Admin listing, paginated — same sort as list() (createdAt desc). */
  listPage(params: PageParams): Promise<Page<NewsDto>>;
  /** createdAt within [start, end) — ISO bounds, start inclusive/end exclusive. */
  listByDateRange(start: string, end: string): Promise<NewsDto[]>;
  /** Distinct years with at least one item, most recent first. */
  listDistinctYears(): Promise<number[]>;
  getById(id: string): Promise<NewsDto | null>;
  /** Persist a new item; returns its new id. */
  create(input: CreateNewsInput): Promise<string>;
  /** Update title/message (and image only when supplied); null if id is unknown. */
  update(id: string, input: UpdateNewsInput): Promise<NewsDto | null>;
  /** Remove the item; returns the deleted row (for its image key) or null. */
  delete(id: string): Promise<NewsDto | null>;
};
