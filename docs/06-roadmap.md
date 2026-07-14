# 06 — Roadmap (phased, tracer-bullet)

Each phase ends with something demonstrable and deployable. Vertical slices (read path, then auth,
then one write path) prove the whole stack early rather than building layers in isolation.

## Phase 0 — Scaffold & tooling  ·  ~0.5–1 day
- `create-next-app` (App Router, TS, Tailwind v4, ESLint) into `zive-teplice-next/`.
- shadcn/ui init (`components.json`), add base primitives.
- Prettier + `prettier-plugin-tailwindcss`, ESLint, Husky + lint-staged, Vitest.
- `.env.example` → `.env.local`; `next.config.ts` `remotePatterns` for S3 + CloudFront hosts.
- Root layout: fonts, `SessionProvider`, `<Toaster/>`, theme tokens ported from SCSS variables.
- **Deliverable:** empty themed app builds & deploys to a Vercel preview.

## Phase 1 — DB layer + public read path (tracer bullet)  ·  ~2–3 days
- `server/infrastructure/db/connection.ts` (cached) + all Mongoose models with **pinned collection
  names** and legacy fields (`05`).
- Repositories + read use cases: news, gallery, events (current), performers.
- Public pages as RSC + ISR: home, `aktuality` (list+detail), `galerie` (list+detail w/ lightbox),
  `program`, `ucinkujici`. `next/image` for existing S3/CloudFront URLs. Czech dates via `date-fns`.
- **Deliverable:** the public site renders **real production data** read-only. This validates DB
  connectivity, collection-name pinning, and image hosts before any writes.

## Phase 2 — Auth  ·  ~2–3 days
- `src/auth.ts`: Auth.js v5 Credentials provider + `verifyLegacyPassword`; JWT session with
  `role`/`id`/`type` callbacks.
- Login, logout; server-side guards in `app/admin/layout.tsx` & `app/ucet/layout.tsx`; nav reacts to
  session. Optional `middleware.ts`.
- **Deliverable:** an **existing** admin and an existing performer both log in with their current
  passwords; protected routes redirect when logged out. (Highest-risk item proven early.)

## Phase 3 — First write path: News CRUD + presigned uploads  ·  ~2–3 days
- `/api/uploads/presign` route handler (MIME/size validation, key prefixing).
- `ImageUpload` (preview + presigned PUT + progress) and `RichTextEditor` (Tiptap + DOMPurify).
- News create/update/delete server actions with Zod + admin guard (fixing legacy missing guards) +
  `revalidatePath`. Admin news table (shadcn `Table`).
- **Deliverable:** admin creates/edits/deletes a news item end-to-end incl. image; public list
  updates. This proves the whole write+upload+revalidate loop; every later feature reuses it.

## Phase 4 — Galleries + Events + Program  ·  ~3–4 days
- Gallery create (featured image), **bulk upload** (dropzone, concurrency-capped presigned PUTs for
  ≤150 files), delete (removes all S3 keys). Improved public gallery grid + lightbox.
- Event create with the **atomic transaction** (unset previous current, reset all `request`),
  delete, update (fixing the `/eid` typo). Program add/update on an event.
- Admin event/program management UI.
- **Deliverable:** full content management for galleries and events.

## Phase 5 — Performers + participation + password flows  ·  ~2–3 days
- **Admin-controlled registration toggle:** an admin opens/closes performer registration from the admin
  UI. The public registration form + `registerUser` action respect the flag (closed → form hidden and
  the server action rejects), server-enforced. Stored as a single app-settings flag (e.g. a pinned
  `settings` document / one-row config) read by the registration RSC + action, flipped by an
  admin-guarded `setRegistrationOpen` action. See resolved open question below.
- Registration (respecting the registration-open flag), performer self-service profile edit + delete
  account, request participation (`pending`).
- Admin approve/reject with **email** notification; request status flows.
- Password: reset request (email link), reset-by-token, change password.
- **Deliverable:** complete user lifecycle + emails, with registration gated by the admin toggle.

## Phase 6 — Design polish, a11y, SEO  ·  ~2–3 days
- Improve the layout and propose a color pallette suitable for the festival branding.
- Create cool landing page and use some image from latest festival there. You may download them from the s3/mongo and put them into assets.
- Use some of the text/icon from the original site.
- Update the "Kontakt" page with the new design and add the contact information from the original site.
- In the Aktuality page, do not show all the news items, but only the ones from current year. Then make some kind of archive page for the older ones.
- In the Galerie page, we are now showing only the small images, could we make it so that when you click on the image, it opens a bigger version of it in a lightbox?
- In the Ucinkujici page, we are now showing all the performers, could we make it paginated with some filters, fulltext search on username and email might be nice too.
- Finalize shadcn design system, responsive layouts, hero/home sections, gallery UX refinements,
  loading/skeleton states, empty/error states.
- Do not forge the responsive design, make sure it looks good on mobile and tablet as well.
- Accessibility pass (landmarks, headings, focus, reduced motion, form announcements).
- Metadata API per route, Open Graph images, sitemap/robots, `next/font`.
- Explicit CSP + security headers.
- **Deliverable:** production-quality UX.

## Phase 7 — Migration verification, staging, cutover  ·  ~1–2 days
- `scripts/verify-migration.ts` parity checks against a staging DB copy.
- Full QA against staging cluster; Vercel production env vars; Atlas snapshot before cutover.
- DNS/domain switch to the new app. Monitor. Decommission old Heroku backend + old FE.
- **Deliverable:** live combined app; legacy services retired.

## Rough total
~2.5–3.5 focused weeks for one developer. Phases 1–3 de-risk the hardest parts (DB parity, legacy
login, upload loop) in the first ~week.

## Testing strategy (throughout)
- **Domain/use cases:** Vitest unit tests, mocked ports.
- **Repositories:** integration tests on `mongodb-memory-server`.
- **Auth crypto:** unit test `verifyLegacyPassword` against a known legacy `hash`/`salt` sample
  captured from the real DB (redacted) — the single most important test in the project.
- **Critical flows:** component tests for login, news create, gallery upload.

## Open questions to resolve before/while building
- ~~Registration: is it permanently gated behind the "closed" flag, or event-driven?~~ **Resolved:
  admin-driven.** An admin opens/closes registration via an admin-UI toggle (an app-settings flag); the
  public form + `registerUser` action honor it, server-enforced. Not tied to the event lifecycle. Built
  in Phase 5.
- Email provider final choice (Resend vs keep Gmail/nodemailer).
- Any public URLs that must keep working (add `next.config` redirects from old `pages` paths).
- Confirm exact Atlas collection names + whether more than one `current` event exists in prod data.
