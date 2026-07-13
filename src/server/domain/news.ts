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

export type NewsRepository = {
  list(): Promise<NewsDto[]>;
  getById(id: string): Promise<NewsDto | null>;
};
