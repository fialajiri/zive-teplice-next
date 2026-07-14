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

## ✅ Status: CRUD complete (§1–8, §10–11) — 2026-07-14 · §9 deferred to mini-phase 4.5

Galleries + events + program CRUD is built and green (`build`, `typecheck`, `lint`, `test` (98),
`format:check`). Bulk upload (concurrency-capped, partial-failure tolerant), the atomic "make current"
event transaction (verified on `MongoMemoryReplSet`, including rollback), and program add/update all work;
every mutating action is `requireAdmin()`-guarded and re-validates image refs via the shared
`isValidUploadedImage`. **§9 (gallery image optimization / the 150-photo scale fix) is deferred to a
mini-phase 4.5** as the plan sanctions — small/medium galleries render via the existing S3→CloudFront
read-rewrite; the legacy 10–16 MB originals still need CloudFront resize (Option A) or Sharp derivatives
(Option B) + backfill. Also deferred: public gallery lightbox and the orphaned-object sweep.

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

- [ ] Phase 3 merged; S3 bucket + CORS + IAM + bucket policy already in place (`docs/aws/*`). Confirm the
      IAM policy grants `s3:DeleteObject` (bulk delete needs it) — it does in `iam-uploads-policy.json`.
- [ ] Confirm real Atlas data: **how many `current` events exist** (open question in `06-roadmap.md`) —
      the transaction assumes at most one; if prod has several, the `updateMany` still normalizes them.
- [ ] Decide the **image-optimization approach** for §9 up front (it affects the gallery display code):
      on-the-fly CloudFront resize **vs** pre-generated Sharp derivatives. See §9 for the trade-off.
- [ ] No new runtime deps for gallery/events. If §9 chooses the Sharp pipeline: add `sharp` (server-only)
      + a backfill script; if CloudFront resize: infra only (no npm dep).

## 1. Extend the presign route for the new prefixes (`src/schemas/upload.ts`)

- [ ] Add to `UPLOAD_MAX_FILES`: `gallery: 150`, `program: 1` (news stays `1`). The Zod enum + per-prefix
      count cap + the route + the S3 key builder all pick this up automatically — **no route change**.
- [ ] Extend the presign **unit test** (`upload.test.ts`): accepts 150 files for `gallery`, rejects 151;
      `program` accepts 1, rejects 2; unknown prefix still rejected.
- [ ] Extract the Phase 3 image-ref validator (currently `isValidNewsImage`, hardcoded `news/`) into a
      shared `server/actions/image-ref.ts` — `isValidUploadedImage(imageUrl, imageKey, prefix)` checking
      the `<prefix>/` key, https, allow-listed host, and `pathname === "/" + key`. News/gallery/program
      actions all use it.

## 2. Bulk uploader component (`src/components/admin/bulk-image-upload.tsx`, `'use client'`)

- [ ] Dropzone + multi-file `<input>` (accept png/jpg/jpeg); client-side MIME/size pre-check per file;
      cap the selection at 150 with a clear message (server re-validates).
- [ ] One `POST /api/uploads/presign` with `{ prefix: "gallery", files: [...] }` → N presigned uploads.
- [ ] PUT each file to S3 via the Phase 3 `putToS3` XHR helper (lift it to a shared module), run through a
      **concurrency-capped queue** (≈5). Track per-file status (pending/uploading/done/error) + an
      aggregate progress bar; render a thumbnail grid with per-item state.
- [ ] On completion call `onComplete(succeeded: UploadedImage[], failed: File[])`; keep failed items
      selectable for a one-click retry. Never block the whole batch on a single failure (gotcha #3).

## 3. Gallery domain + write use cases + repo (`src/server/`)

- [ ] Extend `domain/gallery.ts`: `CreateGalleryInput` (`name`, `featuredImage: ImageDto`),
      `GalleryImageInput` (`{imageUrl,imageKey}`), and add repo write methods: `create(input): id`,
      `appendImages(id, images[]): GalleryDto | null`, `removeImage(id, imageId): GalleryDto | null`
      (stretch — legacy had none, but the admin UX benefits), `delete(id): GalleryDto | null` (returns the
      deleted doc so the use case can delete featured + all image keys). Read `GalleryDto` unchanged.
- [ ] `infrastructure/db/repositories/gallery.repository.ts` — implement writes. `appendImages` `$push`es
      the subdocs; `delete` uses `findByIdAndDelete().lean()` and returns the doc.
- [ ] `application/gallery.ts` — `createGallery` (Zod: **name 4–15** per legacy; featured image required),
      `appendGalleryImages` (validate each image ref; ignore empties), `deleteGallery` (orchestrate repo +
      `storage.deleteObject` for **featured + every image key**), optional `removeGalleryImage` (delete the
      one S3 object). All return `Result<T, DomainError>`, no auth (pure/testable).

## 4. Gallery server actions (`src/server/actions/gallery.ts`)

- [ ] `createGalleryAction` / `appendGalleryImagesAction` / `deleteGalleryAction`
      (+ optional `removeGalleryImageAction`): `requireAdmin()` first; Zod-parse; validate each image ref
      via `isValidUploadedImage(..., "gallery")`; call the use case; on success `revalidatePath("/galerie")`,
      `revalidatePath(\`/galerie/${id}\`)`; return `{ ok }` | `{ ok:false, error, fieldErrors? }`.

## 5. Gallery admin UI (`src/app/admin/galerie/`)

- [ ] Add **Galerie** to the admin nav (`app/admin/layout.tsx`).
- [ ] `app/admin/galerie/page.tsx` — gallery table/grid (name, featured thumb, photo count) with open +
      delete (confirm dialog → `deleteGalleryAction`).
- [ ] `app/admin/galerie/nova/page.tsx` — create (name input + single `ImageUpload` for featured →
      `createGalleryAction`, then redirect to the gallery's manage page).
- [ ] `app/admin/galerie/[gid]/page.tsx` — manage: shows existing photos (delete individual), the
      `BulkImageUpload` dropzone → `appendGalleryImagesAction`, and an edit-name affordance.
- [ ] sonner toasts, pending/disabled states, accessible labels + announced errors throughout.

## 6. Events + Program domain + write use cases + repo (`src/server/`)

- [ ] Extend `domain/event.ts`: `CreateEventInput` (`title`, `year`), `UpdateEventInput`, `ProgramInput`
      (`title`, `message`, `image?`), and repo writes: `createCurrent(input)` (**transactional**),
      `update(id, input)`, `delete(id)`, `addProgram(eventId, program)`, `updateProgram(eventId, program)`.
- [ ] `infrastructure/db/repositories/event.repository.ts` — implement writes. `createCurrent` opens a
      session and runs the **transaction** (gotcha #5): `Event.updateMany({current:true},{current:false})`
      → `Event.create([{title,year,current:true}],{session})` → `User.updateMany({},{request:"notsend"})`.
      `addProgram` creates a `Program` + sets `event.program`; `updateProgram` edits the existing Program,
      deleting the old image key when replaced. Guard add-vs-update by whether `event.program` is set.
- [ ] `application/events.ts` — `createEvent` (Zod: **title 10–100**, **year** 4-digit number),
      `updateEvent`, `deleteEvent`, `addProgram` / `updateProgram` (Zod title 10–100, sanitized non-empty
      message; image required on add, optional on update; delete old key on image replace). `Result` +
      no auth. Reset-users + current-flip live in the repo transaction, orchestrated by `createEvent`.

## 7. Events/Program server actions (`src/server/actions/events.ts`)

- [ ] `createEventAction` / `updateEventAction` / `deleteEventAction` / `addProgramAction` /
      `updateProgramAction`: `requireAdmin()`; Zod-parse; `sanitizeRichText(message)` for program;
      validate program image ref via `isValidUploadedImage(..., "program")`; call use case; on success
      `revalidatePath("/program")`, `revalidatePath("/")` (home shows current event), and any admin
      listing paths; return the standard result shape.

## 8. Events/Program admin UI (`src/app/admin/rocniky/`)

- [ ] Add **Ročníky** to the admin nav.
- [ ] `app/admin/rocniky/page.tsx` — events table (title, year, `current` badge) with edit + delete
      (confirm). Creating an event **warns** it will become the current ročník and reset participation
      requests (the transaction's side effects) before submit.
- [ ] `app/admin/rocniky/novy/page.tsx` — create (title + year) → `createEventAction`.
- [ ] `app/admin/rocniky/[eid]/page.tsx` — edit event + manage its **program**: an `EventProgramForm`
      (title, `RichTextEditor`, single `ImageUpload`) that calls `addProgramAction` or `updateProgramAction`
      depending on whether a program already exists.

## 9. Gallery image optimization (decision + implementation)

The 150-photo gallery makes this urgent: `next/image` times out (`500`) fetching the 10–16 MB legacy
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

- [ ] Implement the chosen option; update `GalleryImageDto` + the public gallery grid/lightbox to use the
      responsive variants; verify a 150-image gallery loads without optimizer timeouts.
- [ ] If it grows too large, split §9 into its own mini-phase (4.5) — the gallery CRUD in §1–8 works with
      the current optimizer for small galleries; §9 is the scale fix.

## 10. Security (carry-in fixes)

- [ ] **Add the missing admin guard on gallery delete** (legacy had none) via `requireAdmin()`.
- [ ] Every mutating action `requireAdmin()` + Zod-validates input; never trust client `role`.
- [ ] Validate every uploaded image ref (`gallery/`, `program/` prefix + host) before persisting.
- [ ] **Sanitize program `message` HTML on write** (defense in depth; already sanitized on render).
- [ ] Event "make current" is a **transaction** (data-integrity fix); fix the `current:"true"` string
      query and the `/eid` update typo.
- [ ] Never log creds, presigned URLs with signatures, or full session objects.

## 11. Tests

- [ ] **Presign schema** (extend `upload.test.ts`): gallery ≤150 / reject 151; program 1 / reject 2.
- [ ] **Gallery use cases** (mocked repo + storage): create (name 4–15, featured required); append ignores
      empties + validates refs; **delete calls `storage.deleteObject` for featured + every image key**.
- [ ] **Gallery repo write** integration (`mongodb-memory-server`): create; `appendImages` `$push`;
      delete removes the document.
- [ ] **Event transaction** — use-case unit test (mocked repo asserts the three ops are orchestrated) **and**
      an integration test on **`MongoMemoryReplSet`** (gotcha #6): previous `current` flipped off, exactly
      one `current:true`, all users' `request === "notsend"`; a forced mid-transaction error rolls back.
- [ ] **Program add/update** (mocked repo + storage): add sets `event.program`; update with a new image
      deletes the **old** key; add-vs-update guard.
- [ ] *(Optional)* `BulkImageUpload` component test (renders, caps at 150, reports partial failure).

## 12. Verify & wrap up

- [ ] Admin creates a gallery + **bulk-uploads a >4.5 MB set of ≤150 photos** → all appear on
      `/galerie/[gid]`; a forced single-file failure persists the rest and is reported.
- [ ] Admin deletes the gallery → document **and** featured + all image S3 objects gone.
- [ ] Admin creates an event → it's the **only** `current`, all users' `request` reset; edit + delete work;
      the `/eid` update typo is fixed.
- [ ] Admin adds a program, then updates it **replacing the image** → new image renders, **old S3 object
      gone**; `/program` + home update immediately.
- [ ] Logged-out / non-admin cannot open the admin UIs **and** cannot invoke the actions directly.
- [ ] The 150-image gallery renders **without** optimizer timeouts (§9).
- [ ] `build` / `typecheck` / `lint` / `test` green; `format:check` clean. Update `README.md` status →
      Phase 4; note anything deferred (orphaned-object sweep, single-image gallery delete if skipped, §9
      backfill if Option B).

## Out of scope (later phases)

Performer registration / self-service / participation requests + emails and all password flows —
**Phase 5** (the event transaction here already resets `request`, but the request *lifecycle* is Phase 5).
Design polish, a11y, SEO, CSP — **Phase 6**. Migration verification + cutover — **Phase 7**.
