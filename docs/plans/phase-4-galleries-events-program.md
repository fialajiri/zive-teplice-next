# Phase 4 — Galleries + Events + Program (bulk upload + atomic event transaction)

**Goal:** an **admin** manages the remaining content types end-to-end: create a **gallery** (featured
image) and **bulk-upload up to 150 photos** into it, delete it (all S3 objects removed); create an
**event/ročník** with the **atomic "make current" transaction**, edit and delete it, and add/update its
**program**. The public `/galerie` (list + detail lightbox), `/program`, and home update immediately.
This phase **reuses every Phase 3 primitive** — the presign route, `ImageUpload`, `RichTextEditor`,
`requireAdmin`, the `Result` + Zod use-case pattern, and `revalidatePath` — and adds only what's new:
a **concurrency-capped bulk uploader** and a **Mongoose transaction**.

**Estimate:** ~3–4 days · **Source of truth:** `docs/03-backend-plan.md` (Gallery + Events/program
endpoint maps + §3 event-state transaction), `docs/01-architecture.md` (data-flow + presigned upload),
`docs/06-roadmap.md` §Phase 4, and `docs/plans/phase-3-news-crud-uploads.md` (the pattern this extends).
Legacy: `../zive-teplice-backend/{controllers/gallery.js,controllers/event.js,routes/gallery.js,routes/event.js,middleware/file-upload.js,models/{gallery,event,program}.js}`.

## ✅ Status: CRUD + client-side compression complete (§1–8, §10–11) — 2026-07-14 · §9 legacy backfill → mini-phase 4.5

Galleries + events + program CRUD is built and green (`build`, `typecheck`, `lint`, `test` (107),
`format:check`). Bulk upload (concurrency-capped, partial-failure tolerant), the atomic "make current"
event transaction (verified on `MongoMemoryReplSet`, including rollback), and program add/update all work;
every mutating action is `requireAdmin()`-guarded and re-validates image refs via the shared
`isValidUploadedImage`.

**Added beyond the original plan (post-review with the maintainer):**

- **Client-side image compression** (`components/admin/image-compression.ts`, native Canvas — no dep).
  Photographer originals run 15–30 MB; both uploaders now compress in the browser **before** the presigned
  PUT — EXIF-correct decode (`imageOrientation: "from-image"`), downscale to a 2560px longest edge,
  re-encode to JPEG (~5 MB target, quality stepped down on overshoot), transparency flattened to white.
  Selection accepts originals up to **35 MB** (`MAX_ORIGINAL_BYTES`); the server ceiling stays 8 MB and
  applies to the **compressed** result. Falls back to the original on failure / unsupported browser. Wired
  into `BulkImageUpload` (throttled compress phase → batch presign → PUTs, with a two-phase progress bar)
  **and** the single `ImageUpload`.
- **This re-frames §9:** new uploads are now web-sized at the source, so the `next/image` optimizer no
  longer chokes on them — §9's scale problem is solved going forward. What remains in **mini-phase 4.5** is
  only the **legacy 10–16 MB originals already in S3**: either an on-the-fly CloudFront resize (Option A) or
  a one-time Sharp backfill (Option B). Until then those render via the existing S3→CloudFront read-rewrite
  in `mappers.ts`.
- **Bulk-uploader double-append fix:** `onComplete` had been called from inside a `setItems` updater, which
  React Strict Mode double-invokes in dev → the batch persisted twice. Successes are now collected locally
  and `onComplete` fires exactly once.

Also deferred: public gallery lightbox and the orphaned-object sweep.

> ⚠️ Verify in a real browser: the Canvas compression can't run under jsdom, so the unit tests only cover
> the pure dimension/filename helpers. Upload a 20–30 MB photo and confirm it lands as a few-MB,
> correctly-oriented JPEG.

**Exit criteria (deliverable):**

- An **admin** creates a gallery (name + featured image) → it appears on `/galerie`; opens it and
  **bulk-uploads ≤150 photos** (direct browser→S3, concurrency-capped, with progress) → they appear on
  `/galerie/[gid]` **immediately**; deletes the gallery → the document **and every S3 object** (featured
  + all images) are removed.
- An **admin** creates an event → it becomes the sole `current` ročník **atomically** (previous current
  flipped off, every user's `request` reset to `"notsend"`), can **edit** (title/year — fixing the legacy
  `/eid` no-op) and **delete** it; **adds** a program (title + rich text + image) and **updates** it
  (replacing the image removes the old S3 object). `/program` + home reflect changes immediately.
- A **non-admin / logged-out** user can neither open the admin UIs nor invoke any action (server-enforced).
- All uploads reuse the Phase 3 presign route; MIME + size + **per-prefix count** validated server-side
  **before** presigning; program rich-text HTML sanitized on write.
- A **decision + implementation for gallery image optimization** so a 150-photo gallery renders fast
  (§9) — the current `next/image` optimizer times out on the 10–16 MB legacy originals.
- `npm run build`, `typecheck`, `lint`, `test`, and `format:check` stay green.

> **Read first (diverge from training data):** `node_modules/next/dist/docs/01-app/**` for server
> actions / `revalidatePath`; **Mongoose 9** transactions (`session.withTransaction`) and
> `MongoMemoryReplSet` (transactions need a replica set — a standalone mongod rejects them). Use
> context7 / DocsExplorer for exact current APIs.

---

## ⚠️ Key gotchas (read before coding)

1. **Reuse the presign route — don't build a second one.** `POST /api/uploads/presign` already
   validates auth + MIME/size and signs per file. Phase 4 only **adds prefixes** (`gallery` ≤150,
   `program` 1) to `UPLOAD_MAX_FILES` in `schemas/upload.ts`; the route and `S3` adapter are unchanged.
2. **Bulk upload = concurrency-capped parallel PUTs, not one big request.** Presign all N files in one
   `POST` (returns N presigned URLs), then PUT them to S3 with a **small concurrency cap** (≈4–6 in
   flight) so the browser and S3 aren't flooded. Aggregate per-file progress into an overall bar.
3. **Partial bulk failure is expected — persist only what uploaded.** Some of 150 PUTs can fail. Collect
   the **succeeded** `{imageUrl,imageKey}` pairs and persist those; surface which failed and let the
   admin retry them. Do **not** fail the whole batch because one file errored.
4. **Orphaned objects scale up here.** A PUT can succeed then the persist action fail (or the admin
   navigates away) → unreferenced S3 objects. Same documented gap as Phase 3; delete/replace must still
   remove old keys. Gallery **delete must loop** and remove the featured key **and every image key**.
5. **The event "make current" must be a real Mongoose transaction.** Legacy did it non-atomically
   (sequential `save()`s) **and** queried `current: "true"` as a **string** (a bug). The rewrite (docs/03
   §3): in one `session.withTransaction` — `Event.updateMany({current:true},{current:false})`,
   `Event.create([{...current:true}])`, `User.updateMany({},{request:"notsend"})`. A partial failure must
   not leave two current events or a half-reset user set.
6. **Transactions need a replica set in tests.** Use `MongoMemoryReplSet`, not `MongoMemoryServer`, for
   the event-transaction integration test, or it throws "Transaction numbers are only allowed on a
   replica set member or mongos."
7. **Program is a single ref, not an array.** `Event.program` is one `ObjectId` → `programs` collection.
   **Add** creates a Program and points the event at it; **update** edits the existing Program and, when a
   new image is supplied, deletes the old S3 key first. Guard: "add" when none exists, "update" when one
   does (don't orphan a replaced Program document).
8. **Carry in the missing admin guard on gallery delete.** Legacy `DELETE /gallery/:gid` had **no**
   `verifyUser`/`checkRole` — add `requireAdmin()` (event/program routes already had guards; keep them).
9. **`next/image` host is already env-derived (Phase 3).** New gallery/program uploads served from
   `S3_PUBLIC_HOST` render without a config change; the optimization work in §9 is a separate concern.

---

## 0. Prerequisites

- [x] Phase 3 merged; S3 bucket + CORS + IAM + bucket policy already in place (`docs/aws/*`). IAM policy
      grants `s3:DeleteObject` (needed for bulk + gallery delete) — confirmed in `iam-uploads-policy.json`.
- [x] Atlas `current`-event count **not** explicitly counted, but the transaction is defensive: the
      `updateMany({current:true},{current:false})` normalizes **any** number of existing current events, so
      the assumption "at most one" isn't required.
- [x] **Image-optimization decision (revised):** rather than choose a §9 backend up front, we added
      **client-side compression** (browser Canvas) so new uploads are web-sized at the source; the legacy
      10–16 MB backfill (CloudFront resize vs Sharp) is deferred to **mini-phase 4.5**. See §9.
- [x] No new runtime deps — client-side compression uses the native Canvas API (no `sharp`, no lib). A
      Sharp pipeline + backfill would only be needed if 4.5 picks Option B.

## 1. Extend the presign route for the new prefixes (`src/schemas/upload.ts`)

- [x] Added to `UPLOAD_MAX_FILES`: `gallery: 150`, `program: 1` (news stays `1`). Route + key builder
      unchanged — the Zod enum + per-prefix cap pick it up automatically.
- [x] Extended `upload.test.ts`: gallery accepts 150 / rejects 151; program accepts 1 / rejects 2; unknown
      prefix still rejected.
- [x] Extracted `isValidUploadedImage(imageUrl, imageKey, prefix)` into `server/actions/image-ref.ts`
      (prefix-keyed, https, allow-listed host, `pathname === "/" + key`); news/gallery/program actions all
      use it. Unit-tested in `image-ref.test.ts`.

## 2. Bulk uploader component (`src/components/admin/bulk-image-upload.tsx`, `'use client'`)

- [x] Multi-file `<input>` (accept png/jpg/jpeg); per-file client pre-check; selection capped at 150 with a
      clear message (server re-validates). **Deviation:** selection accepts originals up to **35 MB** since
      files are compressed client-side before upload (see §9 update / added below).
- [x] **Added — client-side compression phase** (`components/admin/image-compression.ts`): each original is
      decoded (EXIF-correct), downscaled to ~2560px and re-encoded to a ~5 MB JPEG **before** presigning,
      throttled to 3 in flight for memory. Presign then signs the **compressed** sizes.
- [x] One `POST /api/uploads/presign` with `{ prefix: "gallery", files: [...] }` → N presigned uploads.
- [x] PUT each file to S3 via the shared `putToS3` XHR helper (lifted to `components/admin/upload-client.ts`
      with `requestPresign`/`runWithConcurrency`), concurrency-capped queue (≈5). Per-file status
      (pending/compressing/uploading/done/error) + a **two-phase progress bar** ("Zpracovávám… X/N" during
      compression, then "Nahrávám… %"); thumbnail grid with per-item state.
- [x] On completion calls `onComplete(succeeded: UploadedImage[])` (simplified from the planned
      `failed: File[]` — failed items are kept in the component's own state for one-click retry instead).
      Never blocks the whole batch on a single failure (gotcha #3). **Bug fixed:** `onComplete` was being
      invoked inside a `setItems` updater → React Strict Mode double-invoke persisted the batch twice; now
      successes are collected locally and `onComplete` fires exactly once.

## 3. Gallery domain + write use cases + repo (`src/server/`)

- [x] Extended `domain/gallery.ts`: `CreateGalleryInput`, `GalleryImageInput`, repo writes `create`,
      `appendImages`, `removeImage` (implemented — not just stretch), `delete` (returns the deleted doc for
      key cleanup). Read `GalleryDto` unchanged.
- [x] `gallery.repository.ts` — writes implemented: `appendImages` `$push` (`$each`), `removeImage` `$pull`
      by subdoc `_id`, `delete` = `findByIdAndDelete().lean()` returning the doc.
- [x] `application/gallery.ts` — `createGallery` (name 4–15, featured required), `appendGalleryImages`
      (validates each ref, ignores empties), `removeGalleryImage` (deletes the one S3 object), `deleteGallery`
      (repo + `storage.deleteObject` for **featured + every image key**). All `Result<T, DomainError>`, no auth.

## 4. Gallery server actions (`src/server/actions/gallery.ts`)

- [x] `createGalleryAction` / `appendGalleryImagesAction` / `removeGalleryImageAction` /
      `deleteGalleryAction`: `requireAdmin()` first; Zod-parse; validate each image ref via
      `isValidUploadedImage(..., "gallery")`; call the use case; on success revalidate `/galerie`,
      `/galerie/[id]`, `/admin/galerie/[id]`; return `{ ok }` | `{ ok:false, error, fieldErrors? }`.

## 5. Gallery admin UI (`src/app/admin/galerie/`)

- [x] Added **Galerie** to the admin nav (`app/admin/layout.tsx`), plus **Ročníky**.
- [x] `app/admin/galerie/page.tsx` — gallery table (name, featured thumb, photo count) with manage +
      confirm-delete (`DeleteGalleryButton` → `deleteGalleryAction`).
- [x] `app/admin/galerie/nova/page.tsx` — create (name + featured `ImageUpload` → `createGalleryAction`,
      redirect to the manage page).
- [x] `app/admin/galerie/[gid]/page.tsx` — manage: `GalleryManager` with the `BulkImageUpload` dropzone →
      `appendGalleryImagesAction` and per-photo delete → `removeGalleryImageAction`. **Deviation:** an
      edit-name affordance was **not** built (create-time only) — noted as a minor follow-up.
- [x] sonner toasts, pending/disabled states, accessible labels + announced errors throughout.

## 6. Events + Program domain + write use cases + repo (`src/server/`)

- [x] Extended `domain/event.ts`: `CreateEventInput`, `UpdateEventInput`, `ProgramInput`, and `getById` +
      repo writes `createCurrent` (**transactional**), `update`, `delete`, `addProgram`, `updateProgram`.
- [x] `event.repository.ts` — `createCurrent` runs the **transaction** via `conn.startSession()` +
      `session.withTransaction` (gotcha #5): `updateMany(current→false)` → `create([{…current:true}],{session})`
      → `User.updateMany({},{request:"notsend"})`. `addProgram` creates a `Program` + sets `event.program`;
      `updateProgram` returns the replaced image key so the use case cleans it up; `delete` also removes the
      orphaned `Program` doc. Add-vs-update guarded by whether `event.program` is set.
- [x] `application/events.ts` — `createEvent` (title 10–100, year 4-digit), `updateEvent` (fixes legacy
      `/eid` no-op), `deleteEvent` (drops program image key), `addProgram` / `updateProgram` (sanitized
      non-empty message; image required on add, optional on update; delete old key on replace, guarded so a
      re-submitted same key isn't deleted). `Result` + no auth; `getEvent` read helper added.

## 7. Events/Program server actions (`src/server/actions/events.ts`)

- [x] `createEventAction` / `updateEventAction` / `deleteEventAction` / `addProgramAction` /
      `updateProgramAction`: `requireAdmin()`; Zod-parse; `sanitizeRichText(message)` for program; validate
      program image ref via `isValidUploadedImage(..., "program")`; call use case; on success revalidate
      `/program`, `/` (home shows current event), `/admin/rocniky` + `/admin/rocniky/[id]`; standard result shape.

## 8. Events/Program admin UI (`src/app/admin/rocniky/`)

- [x] Added **Ročníky** to the admin nav.
- [x] `app/admin/rocniky/page.tsx` — events table (title, year, `current` badge) with edit + confirm-delete
      (`DeleteEventButton`). The create form **warns** it will become the current ročník and reset
      participation requests before submit.
- [x] `app/admin/rocniky/novy/page.tsx` — create (title + year) → `createEventAction`.
- [x] `app/admin/rocniky/[eid]/page.tsx` — `EventForm` (edit) + `EventProgramForm` (title, `RichTextEditor`,
      single `ImageUpload` with `prefix="program"`) that calls `addProgramAction` or `updateProgramAction`
      depending on whether a program already exists.

## 9. Gallery image optimization (decision + implementation)

> **Update (2026-07-14):** partially resolved. **New uploads are now compressed client-side to ~2560px /
> a few MB before hitting S3** (`components/admin/image-compression.ts`), so `next/image` handles them
> fine — §9 no longer applies to anything uploaded going forward. What's left for **mini-phase 4.5** is
> only the **existing legacy 10–16 MB objects**; pick Option A or B below for those (plus a backfill).

The legacy galleries make this urgent: `next/image` times out (`500`) fetching the 10–16 MB legacy
originals, and backs up (`pending`) at scale. Pick one before wiring the display:

- **Option A — On-the-fly CloudFront resize (recommended for time-to-value).** CloudFront + Lambda@Edge
  (or the AWS Serverless Image Handler); request `…?width=400&format=webp`, the edge resizes once and
  caches. **Handles the legacy 150-image galleries with no migration.** Mostly infra; app change is
  building `srcset`/`sizes` and pointing image URLs at the resize endpoint. Drop or bypass `next/image`
  for gallery thumbnails.
- **Option B — Pre-generated Sharp derivatives.** Add `sharp` (server-only); an **S3 `ObjectCreated`
  Lambda** writes `<key>__w400.webp` / `__w1080` / `__w1920` for each upload; store variant keys (extend
  `ImageDto`/`GalleryImageDto`) and emit a real `srcset`. Needs a **one-time backfill script** for the
  existing objects. More control, more moving parts.

- [~] **Partial.** New uploads are compressed client-side (§2) so they need no server variants; the public
      grid/lightbox + `GalleryImageDto` responsive-variant work for the **legacy** objects is **deferred to
      4.5**. A 150-image *legacy* gallery is not yet verified to load without optimizer timeouts.
- [x] Split into its own **mini-phase 4.5** — the §1–8 CRUD is done and works with the current optimizer for
      newly-uploaded (now-compressed) galleries; the legacy backfill is the remaining scale fix.

## 10. Security (carry-in fixes)

- [x] **Added the missing admin guard on gallery delete** (legacy had none) via `requireAdmin()`.
- [x] Every mutating action `requireAdmin()` + Zod-validates input; never trusts client `role`.
- [x] Validates every uploaded image ref (`gallery/`, `program/` prefix + host) before persisting.
- [x] **Sanitizes program `message` HTML on write** (defense in depth; already sanitized on render).
- [x] Event "make current" is a **transaction** (data-integrity fix); queries `current:true` (boolean, not
      the legacy `"true"` string) and `updateEvent` fixes the `/eid` no-op.
- [x] Never logs creds, presigned URLs with signatures, or full session objects (generic error messages).

## 11. Tests

- [x] **Presign schema** (`upload.test.ts`): gallery ≤150 / reject 151; program 1 / reject 2.
- [x] **Gallery use cases** (`gallery.test.ts`, mocked repo + storage): create (name 4–15, featured
      required); append ignores empties + validates refs; **delete calls `storage.deleteObject` for featured
      + every image key**; `removeGalleryImage` deletes the one key.
- [x] **Gallery repo write** integration (`gallery.repository.write.test.ts`, `mongodb-memory-server`):
      create; `appendImages` `$push`; `removeImage` `$pull`; delete removes the document.
- [x] **Event transaction** — use-case unit test (orchestration) **and** integration on **`MongoMemoryReplSet`**
      (`event.repository.write.test.ts`, gotcha #6): previous `current` flipped off, exactly one `current:true`,
      all users' `request === "notsend"`; a forced mid-transaction error rolls back.
- [x] **Program add/update** (`events.test.ts`, mocked repo + storage): add-vs-update guard; update with a new
      image deletes the **old** key; no storage touch when no image replaced; image required on add.
- [~] **Added instead of the optional `BulkImageUpload` test:** `image-compression.test.ts` (pure
      dimension-scaling + filename helpers). The Canvas encode + the component's upload flow can't run under
      jsdom, so they are **verified in a real browser**, not in the unit suite. (107 tests total.)

## 12. Verify & wrap up

Automated verification (tests + build) is green; **most live browser/AWS steps below are still pending** a
manual pass (the maintainer exercised gallery-create + bulk-upload during review — which is how the
double-append bug surfaced — but the rest hasn't been click-tested end-to-end).

- [~] Admin creates a gallery + bulk-uploads photos → they appear on `/galerie/[gid]`. **Verified** by the
      maintainer (bulk upload works); the double-append bug found here is fixed. **Not yet re-verified:** the
      new client-side compression on a 20–30 MB set, and the forced single-file-failure retry path.
- [ ] Admin deletes the gallery → document **and** featured + all image S3 objects gone. *(Not live-verified;
      unit test asserts `deleteObject` is called for featured + every key.)*
- [~] Admin creates an event → **only** `current`, all users' `request` reset; edit + delete; `/eid` fixed.
      *(Transaction proven on `MongoMemoryReplSet`; admin UI not walked end-to-end.)*
- [~] Admin adds a program, then updates it **replacing the image** → new renders, **old S3 object gone**.
      *(Use-case unit-tested; live UI not walked.)*
- [x] Logged-out / non-admin cannot open the admin UIs (`layout` redirect) **or** invoke the actions
      (every action + the presign route call `requireAdmin()` — server-enforced, not click-tested).
- [ ] The 150-image **legacy** gallery renders without optimizer timeouts — **deferred to §9 / mini-phase 4.5**.
- [x] `build` / `typecheck` / `lint` / `test` (107) green; `format:check` clean. `README.md` status → Phase 4;
      deferred items noted (§9 legacy backfill, orphaned-object sweep, gallery edit-name, public lightbox).

## Out of scope (later phases)

Performer registration / self-service / participation requests + emails and all password flows —
**Phase 5** (the event transaction here already resets `request`, but the request *lifecycle* is Phase 5).
Design polish, a11y, SEO, CSP — **Phase 6**. Migration verification + cutover — **Phase 7**.
