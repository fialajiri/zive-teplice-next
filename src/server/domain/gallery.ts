import type { ImageDto } from "./news";
import type { Page, PageParams } from "./pagination";

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

// Write inputs — already validated/sanitized by the use case before the repo sees them.
export type GalleryImageInput = { imageUrl: string; imageKey: string };

export type CreateGalleryInput = {
  name: string;
  featuredImage: ImageDto;
};

export type GalleryRepository = {
  list(): Promise<GalleryDto[]>;
  /** Admin listing, paginated — same sort as list() (createdAt desc). */
  listPage(params: PageParams): Promise<Page<GalleryDto>>;
  getById(id: string): Promise<GalleryDto | null>;
  /** Persist a new gallery (featured image, no photos yet); returns its new id. */
  create(input: CreateGalleryInput): Promise<string>;
  /** Rename the gallery; null if the id is unknown. */
  update(id: string, input: { name: string }): Promise<GalleryDto | null>;
  /** Append uploaded photos to the gallery; null if the id is unknown. */
  appendImages(
    id: string,
    images: GalleryImageInput[],
  ): Promise<GalleryDto | null>;
  /** Remove one photo subdocument by its id; null if the gallery is unknown. */
  removeImage(id: string, imageId: string): Promise<GalleryDto | null>;
  /** Delete the gallery; returns the deleted doc (for its S3 keys) or null. */
  delete(id: string): Promise<GalleryDto | null>;
};
