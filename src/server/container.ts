import "server-only";
import { createNewsRepository } from "./infrastructure/db/repositories/news.repository";
import { createGalleryRepository } from "./infrastructure/db/repositories/gallery.repository";
import { createEventRepository } from "./infrastructure/db/repositories/event.repository";
import { createPerformerRepository } from "./infrastructure/db/repositories/performer.repository";
import { createAuthUserRepository } from "./infrastructure/db/repositories/auth.repository";

// Composition root: the single place that constructs concrete infrastructure and
// hands the port interfaces to the presentation layer. Pages/actions import these
// repositories and pass them to use cases — they never touch Mongoose directly.
export const container = {
  newsRepository: createNewsRepository(),
  galleryRepository: createGalleryRepository(),
  eventRepository: createEventRepository(),
  performerRepository: createPerformerRepository(),
  authUserRepository: createAuthUserRepository(),
};
