# Phase 3 — First write path: News CRUD + presigned image uploads

**Goal:** an **admin** creates / edits / deletes a news item end-to-end **including its image**, and the
public `/aktuality` list, `/aktuality/[nid]` detail, and the home page update immediately. This is the
tracer bullet for the whole **write + upload + revalidate** loop — every later admin feature (galleries,
events, program, performers) reuses the exact same pieces (presign route, `ImageUpload`, rich-text
editor, admin-guarded server actions, `revalidatePath`).

**Estimate:** ~2–3 days · **Source of truth:** `docs/03-backend-plan.md` (News table + §2 presigned
upload flow + §Security fixes), `docs/01-architecture.md` (data-flow: server actions + Zod +
`revalidatePath`; presigned S3 PUT bypassing Vercel's body limit), `docs/06-roadmap.md` §Phase 3.
Legacy: `../zive-teplice-backend/{controllers/news.js,routes/news.js,middleware/file-upload.js,models/news.js}`.

**Exit criteria (deliverable):**

- An **admin** creates a news item (title + rich-text body + image) → it appears on `/aktuality`, its
  `/aktuality/[nid]` detail, and the home "Nejnovější aktuality" section **immediately**.
- Admin **edits** it (incl. replacing the image — the old S3 object is removed) and **deletes** it
  (document **and** S3 image removed).
- A **non-admin / logged-out** user can neither open the admin news UI nor invoke the actions
  (server-enforced, not just hidden in the UI).
- Image upload goes **browser → S3 directly** via a presigned PUT (bypasses Vercel's ~4.5 MB body
  limit); MIME + size are validated **server-side before** presigning; rich-text HTML is sanitized on
  write.
- `npm run build`, `typecheck`, `lint`, `test`, and `format:check` stay green.

---

## ✅ Status: Complete — 2026-07-14

All exit criteria met; `build`, `typecheck`, `lint`, `test` (59), and `format:check` green. Admin News
create / edit / delete works end-to-end with browser→S3 presigned uploads and immediate revalidation of
`/aktuality`, `/aktuality/[nid]`, and the home page.

**Implementation notes & deviations from the plan below:**

- **Presign is a PLAIN PUT by default.** ACLs are opt-in via `S3_UPLOAD_ACL` (empty ⇒ no ACL). The live
  test bucket uses **Object Ownership: bucket-owner-enforced** (ACLs disabled), so public read is served by
  a **bucket policy**, not per-object ACLs.
- **AWS SDK v3 default checksum had to be disabled.** The SDK bakes a CRC32 of an *empty* body into the
  presigned URL (`x-amz-checksum-crc32=AAAAAA==`), which S3 then rejects against the real file. Fixed with
  `requestChecksumCalculation` / `responseChecksumValidation: "WHEN_REQUIRED"` on the `S3Client`.
- **Presign response shape:** `{ uploads: [{ uploadUrl, key, publicUrl, requiredHeaders }] }`. The browser
  echoes `requiredHeaders` (`Content-Type`, plus `x-amz-acl` only when an ACL is configured) so the
  signature matches.
- **`requireAdmin` lives in `server/actions/guards.ts`** and is reused by both the presign route handler and
  every mutating action.
- **`Result` gained a `validation` variant** (`{ kind, message, fieldErrors }`) so use-case Zod failures map
  to per-field form errors.
- **Native `<dialog>` for the delete confirm and native inputs** instead of pulling shadcn primitives —
  avoids a Radix/Base-UI preset mismatch and matches the existing login form.
- **Tiptap v3:** `Link` + `Underline` ship inside `@tiptap/starter-kit` (no separate installs);
  `immediatelyRender: false` set for SSR.
- **`next.config` image hosts are env-derived:** `remotePatterns` also allow-lists `S3_PUBLIC_HOST`, so the
  active public host (test bucket S3 host in dev, CloudFront in prod) renders through `next/image` with no
  hardcoded test hostname.

**Operator prerequisites (done during bring-up); reference configs committed under `docs/aws/`:**

- Bucket `zive-teplice-test` (eu-central-1), ACLs disabled, Block Public Access off.
- Public-read **bucket policy** → `docs/aws/s3-bucket-policy.json`.
- **CORS** allowing `PUT`/`GET` from `http://localhost:3000` (+ deployed origin) → `docs/aws/s3-cors.json`.
- **IAM** `s3:PutObject`/`GetObject`/`DeleteObject` on the bucket for the app key →
  `docs/aws/iam-uploads-policy.json`.
- `.env.local`: `AWS_*`, `S3_PUBLIC_HOST=zive-teplice-test.s3.eu-central-1.amazonaws.com`, `S3_UPLOAD_ACL`
  empty.

**Deferred / follow-ups:**

- **Orphaned S3 objects:** presign+PUT can succeed then the persist action fail, leaving an unreferenced
  object (documented gap). Delete/replace already removes old keys. Later: delete-on-failure or a sweep.
- **Image optimization pipeline (Phase 4):** legacy gallery originals are 10–16 MB and overwhelm the
  `next/image` optimizer (timeouts / pending) at gallery scale. Planned: pre-generated WebP/AVIF
  derivatives (Sharp on an S3 event) **or** on-the-fly CloudFront resizing, plus a one-time legacy backfill
  and an `ImageDto`/`srcset` change. To be specced with the Phase 4 gallery work.

---

> **Read first (Next.js 16 + current SDKs, all diverge from training data):**
> `node_modules/next/dist/docs/01-app/**` for server actions / `revalidatePath` / route handlers;
> **AWS SDK v3** `@aws-sdk/s3-request-presigner` (`getSignedUrl`); **Tiptap v3** React (client-only,
> needs `immediatelyRender: false` under SSR). Use context7 / DocsExplorer for exact current APIs.

---

## ⚠️ Key gotchas (read before coding)

1. **Never stream the file through the server.** Vercel caps request bodies at ~4.5 MB, and legacy
   allowed 30 MB images. The browser must **PUT directly to S3** using a presigned URL; the server only
   (a) validates + issues the presigned URL and (b) later persists the returned `key`/`publicUrl`.
2. **Bucket CORS + public-read must be confirmed as a prerequisite.** A browser PUT to S3 fails unless
   the bucket has a **CORS rule** allowing `PUT` (and `GET`) from the app origins (localhost **and** the
   deployed URL). Also confirm how existing objects are served publicly — **bucket policy** vs
   **per-object ACL**. Legacy set `acl: "public-read"` per object; if the bucket now blocks ACLs, rely
   on the bucket policy and presign a **plain** PUT; only sign `x-amz-acl: public-read` if the bucket
   still requires it (and then the client must send that header).
3. **Sign the `Content-Type`.** The presigned PUT pins `ContentType`; the browser's PUT must send the
   **exact same** `Content-Type` header or S3 rejects the signature.
4. **Store the CloudFront `publicUrl`, not the raw S3 PUT URL.** Persist `imageUrl` built from
   `S3_PUBLIC_HOST` so new rows match legacy rows and the existing `next.config` `remotePatterns`
   (`zive-teplice.s3…` + `d374dusjcsfayx.cloudfront.net`). The presigned PUT targets the S3 host; the
   stored URL is the public host.
5. **Preserve but sanitize the key format.** Legacy key = `<dest>/<ISO-timestamp>-<originalname>`. Keep
   the shape (`news/<ISO>-<name>`) but **sanitize `originalname`** (strip path segments, spaces, unsafe
   chars) — never build an S3 key from raw client input. Constrain the prefix to `news/`.
6. **Admin guard lives in the server action, not only the layout.** Server actions are directly
   invokable HTTP endpoints; every mutating action must `auth()` + check `role === "admin"` itself and
   **never trust a client-supplied `role`**. (Legacy `PATCH`/`DELETE /news` had **no** guard at all —
   this is a security fix to carry in.)
7. **Tiptap is client-only** (`'use client'`) and needs **`immediatelyRender: false`** in Next SSR to
   avoid a hydration mismatch. Its output is HTML stored in `message`.
8. **Orphaned objects are possible.** Presign + PUT can succeed and then the persist action fail,
   leaving an unreferenced S3 object. Acceptable for Phase 3 — **record the gap** (later: delete-on-
   failure, or a periodic sweep). Conversely, delete/replace **must** remove the old key.

---

## 0. Prerequisites

- [x] Real **S3 credentials** in `.env.local`: `AWS_REGION`, `AWS_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`,
      `AWS_SECRET_ACCESS_KEY`, `S3_PUBLIC_HOST` (already scaffolded in `.env.example`). Confirm the
      bucket + region against the legacy `AWS_BUCKET_*` values.
- [x] **Bucket CORS** rule permitting `PUT`+`GET` from `http://localhost:3000` and the deployed origin;
      confirm the public-read strategy (policy vs ACL) → decides whether the presign signs `x-amz-acl`
      (gotcha #2).
- [x] Add deps (pin exact working versions): `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`;
      `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`. Use `crypto.randomUUID()` instead of a
      `uuid` dep unless needed.
- [x] Decide limits: allowed MIME = **png / jpg / jpeg** (match legacy + `next.config`); **max size**
      (propose ~8 MB for images — well under legacy's 30 MB and comfortably a direct-to-S3 PUT).
- [x] Add any shadcn primitives the admin UI needs (`table`, `input`, `label`, `textarea`, `dialog` /
      alert-dialog for delete confirm) via the shadcn CLI, or build minimal native equivalents.

## 1. Storage infrastructure (S3) + port (`src/server/`)

- [x] `domain/storage.ts` — `StoragePort`: `presignUpload({ filename, contentType, prefix }):
      Promise<{ uploadUrl; key; publicUrl }>` and `deleteObject(key): Promise<void>`. Zero deps.
- [x] `infrastructure/storage/s3.ts` — `import "server-only"`. Construct an `S3Client` (region + creds
      from env). `presignUpload` = `getSignedUrl(client, new PutObjectCommand({ Bucket, Key, ContentType
      [, ACL] }), { expiresIn: 60 })`; build `key = \`${prefix}/${new Date().toISOString()}-${safeName}\``
      and `publicUrl = \`https://${S3_PUBLIC_HOST}/${key}\``. `deleteObject` = `DeleteObjectCommand`.
      Fail loudly if env is missing.
- [x] Wire `storage` into `container.ts`.

## 2. Upload validation + presign route handler

- [x] `schemas/upload.ts` — Zod for the presign request: `{ files: [{ filename, contentType, size }] }`
      with `contentType` an enum (`image/png|image/jpg|image/jpeg`), `size ≤ MAX`, and a **count cap**
      (1 for news now; the same route serves ≤150 for gallery in Phase 4).
- [x] `app/api/uploads/presign/route.ts` (**Node runtime**, default) — `auth()` + admin guard;
      Zod-validate the body; per file call `storage.presignUpload({ prefix: "news", … })`; respond
      `[{ uploadUrl, key, publicUrl }]`. **Never** issue a URL without passing validation. Generic
      error messages; no secret leakage.

## 3. News domain + write use cases (`src/server/`)

- [x] Extend `domain/news.ts`: `CreateNewsInput` / `UpdateNewsInput` (title, message, `image
      {imageUrl,imageKey}`), and add write methods to the repository port (`create`, `update`,
      `delete`) — or a separate `NewsWriteRepository`. Keep the read `NewsDto` unchanged.
- [x] `infrastructure/db/repositories/news.repository.ts` — implement `create` / `update` / `delete`
      (return the new/updated id). `update` replaces `image` only when a new one is supplied.
- [x] `application/news.ts` — `createNews` / `updateNews` / `deleteNews` use cases returning
      `Result<T, DomainError>`. Zod-validate (title **10–75** per legacy; non-empty sanitized message;
      image required on create). Orchestrate the repo **and** `storage.deleteObject` on delete and on
      image replacement. No auth here (pure, testable).

## 4. Server actions (admin-guarded) (`src/server/actions/news.ts`)

- [x] `server/actions/guards.ts` — `requireAdmin(): Promise<Result<SessionUser, "forbidden">>` (or
      throw a typed error) using `auth()`. Reused by every admin action from here on.
- [x] `createNewsAction` / `updateNewsAction` / `deleteNewsAction` (`'use server'`): `requireAdmin()`
      first; parse input with Zod; **`sanitizeRichText(message)`** on write (reuse `lib/sanitize-html`);
      **validate the `imageKey` prefix** (`news/`) and host so a client can't point `imageUrl` at an
      arbitrary object; call the use case; on success `revalidatePath("/aktuality")`,
      `revalidatePath(\`/aktuality/${id}\`)`, **and `revalidatePath("/")`** (home shows the latest 3);
      return `{ ok }` | `{ ok:false, error, fieldErrors? }`.

## 5. Admin UI (`src/app/admin/aktuality/`)

- [x] Give `app/admin/layout.tsx` a minimal **admin shell/nav** (link to *Aktuality*, plus the existing
      logout) — the placeholder from Phase 2 becomes a real shell.
- [x] `app/admin/aktuality/page.tsx` — news **table** (title, date, thumbnail) with edit + delete
      (delete behind a confirm dialog → `deleteNewsAction`).
- [x] `app/admin/aktuality/nova/page.tsx` (create) + `app/admin/aktuality/[nid]/upravit/page.tsx`
      (edit, prefilled) — both render `<NewsForm>`.
- [x] `components/admin/news-form.tsx` (`'use client'`) — title input, `RichTextEditor`, `ImageUpload`;
      submit → the action; **sonner** success/error toasts; pending/disabled states; accessible labels
      + announced errors.
- [x] `components/admin/image-upload.tsx` (`'use client'`) — file picker + preview; on select →
      `POST /api/uploads/presign` → **PUT** the file to `uploadUrl` (XHR for a progress bar, or `fetch`
      without progress) with the matching `Content-Type` → set hidden `imageUrl` + `imageKey` fields.
      Feature-detect; graceful error if the PUT fails; client-side MIME/size pre-check (server still
      re-validates).
- [x] `components/admin/rich-text-editor.tsx` (`'use client'`) — Tiptap `StarterKit`,
      `immediatelyRender: false`, a small toolbar (bold/italic/lists/headings/link), HTML output fed
      into a controlled hidden field.

## 6. Security (carry-in fixes from `docs/03` §Security)

- [x] **Add the missing admin guards** on news update + delete (legacy had none) — via `requireAdmin()`
      in every action.
- [x] Validate upload **MIME + size server-side before** presigning; constrain the key prefix.
- [x] **Sanitize `message` HTML on write** (defense in depth — it's already sanitized on render).
- [x] Zod-validate every action input; validate persisted `imageKey`/`imageUrl` shape; never trust a
      client `role`.
- [x] Never log creds, presigned URLs with signatures, or full session objects.

## 7. Tests

- [x] **Presign validation + key builder** (unit): rejects non-image MIME and oversize; sanitizes the
      filename; builds `news/<ISO>-<name>` + the CloudFront `publicUrl`.
- [x] **`createNews` / `updateNews` / `deleteNews`** use cases (mocked repo + storage): valid path; Zod
      failures (title length, empty message, missing image on create); `deleteNews` calls
      `storage.deleteObject`; `updateNews` with a new image deletes the **old** key.
- [x] **`news.repository` write** integration (`mongodb-memory-server`): create persists; update
      replaces image fields; delete removes the document.
- [x] *(Optional)* `requireAdmin` unit test (mocked `auth()`), and a `NewsForm` component test
      (renders, submits, shows error).

## 8. Verify & wrap up

- [x] Admin creates a news item **with image** → appears on `/aktuality`, `/aktuality/[nid]`, and the
      home section (revalidate is immediate).
- [x] Admin edits it, **replacing the image** → the new image renders and the **old S3 object is gone**.
- [x] Admin deletes it → the document **and** its S3 image are removed; lists no longer show it.
- [x] A **>4.5 MB** image uploads successfully (proves the direct-to-S3 PUT); a **non-image** MIME is
      rejected **before** any URL is issued.
- [x] Logged-out / non-admin cannot open `/admin/aktuality` **and** cannot invoke the actions directly.
- [x] `build` / `typecheck` / `lint` / `test` green; `format:check` clean.
- [x] Update `README.md` status → Phase 3; note anything deferred (orphaned-object cleanup, etc.).

## Out of scope (later phases)

Galleries (featured + **bulk ≤150** upload) · events + the atomic current-event transaction · program
add/update — all **Phase 4** (they reuse this phase's presign route + `ImageUpload` + action pattern).
Performer registration / self-service / participation requests + emails and all password flows —
**Phase 5**. Design polish, a11y, SEO, CSP — **Phase 6**. Phase 3 ships **single-image** uploads only,
but the presign route is built to also serve the Phase 4 bulk case.
