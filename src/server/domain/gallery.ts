import type { ImageDto } from "./news";

export type GalleryImageDto = {
  id: string | null;
  imageUrl: string;
  imageKey: string;
};

export type GalleryDto = {
  id: string;
  name: string | null;
  featuredImage: ImageDto | null;
  images: GalleryImageDto[];
  createdAt: string;
  updatedAt: string;
};

export type GalleryRepository = {
  list(): Promise<GalleryDto[]>;
  getById(id: string): Promise<GalleryDto | null>;
};
