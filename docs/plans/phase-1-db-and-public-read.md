# Phase 1 — DB layer + public read path (tracer bullet)

**Goal:** the public site renders **real production data, read-only**. This proves DB connectivity,
collection-name pinning, and image hosts before any writes.

**Estimate:** ~2–3 days · **Source of truth:** `docs/01-architecture.md`, `docs/03-backend-plan.md`,
`docs/05-data-and-auth-migration.md`. Legacy schemas: `../zive-teplice-backend/models/*.js`.

**Exit criteria (deliverable):** `aktuality`, `galerie`, `program`, and `ucinkujici` render live Atlas
data through RSC + ISR; existing S3/CloudFront images load via `next/image`; `npm run build`,
`typecheck`, `lint`, and `test` stay green.

> **Status (in progress):** all application code is built and green (`build` / `typecheck` / `lint` /
> `format` clean, **18 tests** passing). Verified against **live data** — the app currently talks to the
> **production** DB (`zive-teplice-prod`) read-only; the isolated test DB (§0a) is **not yet created**.
> Remaining before "done": create + point at the test DB (§0a), verify the single-`current`-event
> invariant (§0), and add the list-page render smoke test (§6). See **Remaining work** at the bottom.

---

## 0. Prerequisites

- [x] `.env.local` has a working `MONGODB_URI` — connects & pings; `npm run db:check` confirms.
      ⚠️ Currently points at **production** (`zive-teplice-prod`), not a test copy — see §0a.
- [x] Confirm the **real collection names** in Atlas — verified via `db:check`: `users` (103),
      `events` (8), `galleries` (15), `news` (60), `programs` (8). All pinned names match. ✅
- [ ] Confirm exactly **one** `current: true` event exists in prod data — **not yet verified**.
- [x] Add `mongoose` (v9) + `server-only` + `date-fns` (`/locale/cs`). Also added
      `isomorphic-dompurify` (sanitize rich text) and `mongodb-memory-server` (dev, integration tests).

## 0a. Clone production DB → isolated testing DB (do this FIRST) — **NOT DONE (needs you)**

Work against a **copy** of prod, never prod itself. The app only ever sees the copy's connection
string, so nothing this phase can corrupt real data. Requires MongoDB Database Tools (`mongodump` /
`mongorestore`). Phase 1 reads are safe against prod, but this MUST be in place before Phase 3 writes.

- [x] Automation written: `scripts/clone-prod-to-test.ts` (`npm run db:clone-to-test -- --yes`) —
      dump → restore (`--drop`, ns remap) → PII sanitize, with guards refusing non-test targets.
- [ ] Pick where the copy lives (isolation ↓, effort ↑):
  - **Separate Atlas cluster (free M0) — recommended:** a wrong env var physically cannot reach prod
  - Separate **DB name** on the same cluster: cheap, different namespace, but shares the cluster
  - Local MongoDB (Docker `mongo:7`): fully offline, nothing can reach prod
- [ ] Take a prod snapshot first (Atlas backup or a dump) as insurance before touching anything
- [ ] Run the clone: set `MONGODB_URI_PROD` / `MONGODB_URI_TEST` in `.env.local`, then
      `npm run db:clone-to-test -- --yes`. The script dumps, restores with `--drop` + `--nsFrom/--nsTo`
      remap, and sanitizes PII (fakes `email`/`phoneNumber`, blanks `reset`/`refreshToken`, optionally
      resets `hash`/`salt` to `TEST_USER_PASSWORD` for Phase 2 login testing).
- [ ] Point the app at the copy: set `MONGODB_URI` in `.env.local` to the **test** URI
      (keep `MONGODB_URI_PROD` only for re-dumping; the app never reads it)
- [ ] Guardrails so the copy can't accidentally become prod:
  - [ ] Test cluster/DB uses a **distinct name** (e.g. `zive-teplice-test`) — script enforces this
  - [ ] Give the app user **read-only** creds for Phase 1 (writes come in Phase 3)
  - [x] `.gitignore` covers `.env*`; the script never logs a full URI (credentials masked)
- [x] Automated tests use `mongodb-memory-server` (§6) — the cloned DB is for **manual / integration**
      verification against realistic data.

## 1. DB connection (`src/server/infrastructure/db/`) — **DONE**

- [x] `connection.ts` — serverless-safe cached connection on `globalThis` (`maxPoolSize: 5`,
      `serverSelectionTimeoutMS: 8000` so a bad URI fails fast), `import 'server-only'`.
- [x] Fails loudly if `MONGODB_URI` is missing (no silent default).

## 2. Mongoose models (`src/server/infrastructure/db/models/`) — **DONE**

Field names/types kept **identical** to legacy; collection names **pinned** (3rd `model()` arg);
hot-reload guard via `models.X ?? model(...)`.

- [x] `user.model.ts` — legacy fields + `hash`/`salt` (`select:false`), `authStrategy`, `event` ref,
      `request`, `image`, `reset`; pinned `'users'`.
- [x] `event.model.ts` — `title`, `year`, `current`, single `program` ObjectId ref; pinned `'events'`.
- [x] `gallery.model.ts` — `name`, `featuredImage`, `images[]`; pinned `'galleries'`.
- [x] `news.model.ts` — `title`, `message`, `image`, timestamps; pinned `'news'` (uncountable).
- [x] `program.model.ts` — `title`, `message`, `image`; pinned `'programs'`.
- [x] `hash`/`salt` never exposed — achieved via `select:false` **plus** explicit DTO mapping (repos
      use `.lean()` and hand-build DTOs) rather than a `toJSON` transform. `refreshToken[]` left
      undeclared so legacy subdocs are ignored.
- [x] Explicit document types (`UserDocument`, `EventDocument`, …) — no `any`.

## 3. Domain + repositories + read use cases (`src/server/`) — **DONE**

- [x] `domain/` — DTOs + repository ports (`NewsRepository`, `GalleryRepository`, `EventRepository`,
      `PerformerRepository`). `_id`→`id`, `Date`→ISO string; `Result<T,DomainError>` helper.
- [x] `infrastructure/db/repositories/` — Mongoose implementations mirroring legacy queries:
  - [x] News: `find().sort({ createdAt: -1 })`, `findById`
  - [x] Gallery: `find().sort({ createdAt: -1 })`, `findById`
  - [x] Events: `findOne({ current: true })` + separate `Program.findById` for the ref (clearer than
        `populate` under `.lean()` typing); `find().sort({ year: -1 })` for list
  - [x] Performers: `find({ role: 'user' })`, `findOne({ _id, role: 'user' })`; DTO excludes
        `hash`/`salt`/`email`/`phone` (privacy — flag if contact fields should be public)
- [x] `application/` — `listNews`/`getNews`, `listGalleries`/`getGallery`, `getCurrentEvent`/
      `listEvents`, `listPerformers`/`getPerformer`. Return `Result`; not-found is a typed error.
- [x] `container.ts` — composition root wiring repositories.

## 4. Public pages (`src/app/(site)/`) — RSC + ISR — **DONE**

Route group `(site)`, shared layout, `export const revalidate = 60`.

- [x] `(site)/layout.tsx` — header + footer + single `<main>` landmark.
- [x] `aktuality/page.tsx` + `[nid]/page.tsx` (detail renders **sanitized** `message`).
- [x] `galerie/page.tsx` (grid) + `[gid]/page.tsx` (accessible `next/image` grid; lightbox is Phase 4).
- [x] `program/page.tsx` — current event + its program.
- [x] `ucinkujici/page.tsx` (prodejce/umělec split) + `[id]/page.tsx` (profile). Plus a static
      `kontakt/page.tsx` so nav has no dead links.
- [x] `loading.tsx` / `error.tsx` / `not-found.tsx` for the group; detail routes call `notFound()`.
- [x] Per-route `generateMetadata` / static `metadata`.
- [x] Czech dates via `date-fns` + `cs` locale.
- [x] **Deviation:** list pages **degrade gracefully** (render an "unavailable" state) on unexpected
      errors instead of throwing, so static prerender/build succeeds even without a DB. Detail routes
      still map not-found → `notFound()` and unexpected → error boundary.

## 5. Shared site components (`src/components/site/`) — **DONE**

- [x] `SiteHeader` (client, active-link `aria-current`) + `SiteFooter`; `PageHeader`, `RichText`.
- [x] `NewsCard` / `GalleryCard` / `PerformerCard` — presentational, `next/image` (grid is inline in
      the gallery pages rather than a separate `GalleryGrid`).
- [x] Image hosts covered by `remotePatterns` (S3 + CloudFront). **Fix applied:** legacy `imageUrl`s
      point at raw S3 originals (10–16 MB); `next/image`'s optimizer has a hard-coded 7 s upstream
      timeout, so large covers timed out → broken thumbnails. Non-destructive rewrite (`toPublicUrl` in
      `repositories/mappers.ts`) serves the same object keys via the CloudFront CDN (~4× faster, well
      under the timeout). DB untouched. (Long-term: generate resized derivatives during Phase 3 upload.)

## 6. Tests — **MOSTLY DONE**

- [x] Repository integration test (`news.repository.test.ts`) on `mongodb-memory-server` — seed →
      query → assert DTO shape, sort order, partial-image handling, bad/missing id.
- [x] Use-case unit tests with mocked ports (`news`, `events`) — ok / not-found / error paths.
- [x] Mapper unit tests (`mappers.test.ts`) — CDN URL rewrite + incomplete-image handling.
- [ ] A rendering smoke test for one list page with a mocked use case — **not yet done**.
- [x] `server-only` aliased to a stub in `vitest.config.ts` so server modules import cleanly in tests.

## 7. Verify & wrap up — **DONE**

- [x] `npm run build` — static ISR (`/`, `/aktuality`, `/galerie`, `/program`, `/ucinkujici`,
      `/kontakt`) + on-demand dynamic detail routes.
- [x] `typecheck` / `lint` / `test` (18) green; `format:check` clean.
- [x] Manual pass against live data — pages render; images fixed via CloudFront; dates Czech; empty /
      not-found states behave. (Base UI `Button`-as-link console warning fixed: nav links now use
      `Link` + `buttonVariants` instead of `Button render={<Link>}`.)
- [x] `README.md` status updated to Phase 1.

## Remaining work (to fully close Phase 1)

1. **Create the isolated test DB and point the app at it** (§0a) — run `npm run db:clone-to-test`,
   set the test `MONGODB_URI`. Required before any Phase 3 writes.
2. **Verify the single-`current`-event invariant** (§0) and, while connected, spot-check that every
   user has `hash`/`salt` + `image.imageUrl` (login + images will work in later phases).
3. **Add the list-page render smoke test** (§6).

## Out of scope (later phases)

Auth & `verifyLegacyPassword` (Phase 2) · all writes/uploads/server actions (Phase 3+) · Tiptap editor ·
admin UI · lightbox polish · emails · resized image derivatives.
