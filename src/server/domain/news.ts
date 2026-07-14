// Serializable news DTO (id as string, dates as ISO strings) + repository port.

export type ImageDto = { imageUrl: string; imageKey: string };

export type NewsDto = {
  id: string;
  title: string;
  message: string | null;
  image: ImageDto | null;
  createdAt: string;
  updatedAt: string;
};

// Write inputs are the already-validated, already-sanitized shapes the use case
// hands to the repository. Image is required on create; on update it is only
// present when the admin is replacing the existing image.
export type CreateNewsInput = {
  title: string;
  message: string;
  image: ImageDto;
};

export type UpdateNewsInput = {
  title: string;
  message: string;
  image?: ImageDto;
};

export type NewsRepository = {
  list(): Promise<NewsDto[]>;
  getById(id: string): Promise<NewsDto | null>;
  /** Persist a new item; returns its new id. */
  create(input: CreateNewsInput): Promise<string>;
  /** Update title/message (and image only when supplied); null if id is unknown. */
  update(id: string, input: UpdateNewsInput): Promise<NewsDto | null>;
  /** Remove the item; returns the deleted row (for its image key) or null. */
  delete(id: string): Promise<NewsDto | null>;
};
