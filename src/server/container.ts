import "server-only";
import { createNewsRepository } from "./infrastructure/db/repositories/news.repository";
import { createGalleryRepository } from "./infrastructure/db/repositories/gallery.repository";
import { createEventRepository } from "./infrastructure/db/repositories/event.repository";
import { createPerformerRepository } from "./infrastructure/db/repositories/performer.repository";
import { createAuthUserRepository } from "./infrastructure/db/repositories/auth.repository";
import { createSettingsRepository } from "./infrastructure/db/repositories/settings.repository";
import { createHomepageContentRepository } from "./infrastructure/db/repositories/homepage-content.repository";
import { createS3Storage } from "./infrastructure/storage/s3";
import { createResendMailer } from "./infrastructure/email/mailer";
import { createUpstashRateLimiter } from "./infrastructure/rate-limit/upstash";

// Composition root: the single place that constructs concrete infrastructure and
// hands the port interfaces to the presentation layer. Pages/actions import these
// repositories and pass them to use cases — they never touch Mongoose directly.
export const container = {
  newsRepository: createNewsRepository(),
  galleryRepository: createGalleryRepository(),
  eventRepository: createEventRepository(),
  performerRepository: createPerformerRepository(),
  authUserRepository: createAuthUserRepository(),
  settingsRepository: createSettingsRepository(),
  homepageContentRepository: createHomepageContentRepository(),
  storage: createS3Storage(),
  mailer: createResendMailer(),
  // Separate buckets per flow so a burst of logins can't eat into the
  // registration/reset quotas or vice versa.
  loginRateLimiter: createUpstashRateLimiter({
    limit: 5,
    window: "5 m",
    prefix: "rl:login",
  }),
  registerRateLimiter: createUpstashRateLimiter({
    limit: 3,
    window: "1 h",
    prefix: "rl:register",
  }),
  passwordResetRateLimiter: createUpstashRateLimiter({
    limit: 3,
    window: "1 h",
    prefix: "rl:pwreset",
  }),
};
