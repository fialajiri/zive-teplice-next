# Živé Teplice — Next (`zive-teplice-next`)

A **single, combined Next.js 15 (App Router) + TypeScript** application that replaces the two
legacy projects:

| Legacy project | What it was | Fate |
|---|---|---|
| `zive-teplice-backend` | Express 4 / Mongoose 6 / Passport, plain JS (CommonJS) | Reimplemented as server code inside this app |
| `zive-teplice-frontend` | Next.js 12 Pages Router / React 17 / SCSS, plain JS | Reimplemented as App Router routes + shadcn/ui |

The MongoDB database (**MongoDB Atlas**) and all existing data are **kept as-is**. Existing user
passwords (hashed by `passport-local-mongoose`) keep working — no password resets required.

## Chosen stack (scaffolded)

- **Framework:** Next.js 16 App Router, React 19.2, TypeScript 6 (pinned; latest 7 breaks lint tooling)
- **UI:** shadcn/ui + Tailwind CSS v4 (Base UI primitives via Nova preset, `lucide-react` icons)
- **Auth:** Auth.js v5 (`next-auth@beta`) — Credentials provider verifying the legacy pbkdf2 hashes
- **DB:** MongoDB (unchanged) via Mongoose 9
- **Storage:** AWS S3 via AWS SDK v3 + presigned uploads (browser → S3 direct)
- **Tooling:** ESLint 9 (pinned), Prettier, Vitest 4, Husky + lint-staged
- **Deploy:** Vercel

See [`docs/02-libraries.md`](docs/02-libraries.md) for exact versions and the two "latest is too new"
pins (TypeScript 6 and ESLint 9).

## How to read this plan

Read the docs in order:

1. [`docs/01-architecture.md`](docs/01-architecture.md) — folder structure, layering, data-flow model
2. [`docs/02-libraries.md`](docs/02-libraries.md) — every dependency, version, and why
3. [`docs/03-backend-plan.md`](docs/03-backend-plan.md) — server rewrite: endpoint→server-action map, auth, uploads
4. [`docs/04-frontend-plan.md`](docs/04-frontend-plan.md) — route map, component system, galleries, forms
5. [`docs/05-data-and-auth-migration.md`](docs/05-data-and-auth-migration.md) — keep-Mongo analysis, schema pinning, pbkdf2 login compatibility
6. [`docs/06-roadmap.md`](docs/06-roadmap.md) — phased, tracer-bullet delivery plan
7. [`.env.example`](.env.example) — environment variables (old → new mapping)

## Status

**Phase 6 (design polish, a11y, SEO) built** — the app now looks and feels like the festival, with a
brand palette/typography, real landing/Kontakt pages, a gallery lightbox, performer search, an a11y
pass, SEO metadata, and CSP. Green: `npm run build`, `typecheck`, `lint`, `test` (184 tests),
`format:check` all pass.

- **Brand system:** OKLCH palette (green/amber, light + dark, WCAG AA-checked) replaces the achromatic
  shadcn default, kept under the same token names so every existing component (including admin/auth
  shells) recolors for free. Roboto (body) + Archivo Black (headings) via `next/font/google`, plus a
  light/dark theme toggle (`next-themes`, hydration-safe via `useSyncExternalStore`).
- **Site chrome:** redesigned header with an accessible mobile nav (Base UI `Dialog`, keyboard + focus
  trap, breakpoint at `lg` after a real tablet-width overflow bug), and a footer with real contact/social
  links.
- **Landing + Kontakt:** a real hero (compressed festival photos pulled from the live S3 galleries, ≤310
  KB), festival intro copy + icons, and Kontakt's real address/phone/e-mail/socials (no map — none existed
  on the legacy site).
- **Aktuality:** `/aktuality` now shows only the **current ročník's** news (`createdAt` matched to
  `Event.getCurrent().year` — no schema change) with a year-card **archive** at `/aktuality/archiv[/[year]]`.
- **Galerie:** a full lightbox (Base UI `Dialog`, arrow-key + on-screen prev/next, Esc, focus trap) layered
  over the existing thumbnail grid.
- **Účinkující:** split into `/ucinkujici` (current ročník — `request:"approved"`, reusing the existing
  participation field) and `/ucinkujici/vsichni` (everyone), both with **debounced live search** (username,
  **diacritic- and case-insensitive** via a Mongo regex character-class expansion) and cursor-based
  pagination — paginated at the DB, never over-fetched.
- **Loading/empty/error states:** skeletons for every detail route (`DetailSkeleton`, two layouts), the
  existing list-page skeleton reused elsewhere; Czech empty/error copy throughout.
- **A11y:** fixed heading-order skips (card grids jumped `h1`→`h3`; added `sr-only` `h2`s), a
  `prefers-reduced-motion` kill switch, one palette contrast failure fixed (button text 4.43:1 → 5.02:1),
  visible focus rings verified by keyboard, and the last hardcoded English UI strings (dialog close,
  pagination) translated.
- **SEO:** per-route `generateMetadata` with real excerpts + OG images (news/gallery/performer detail),
  root-level OG/Twitter defaults, `app/sitemap.ts` (195 URLs: static + every news/gallery/performer/archive
  year) and `app/robots.ts` — canonical origin from `AUTH_URL`, never hard-coded.
- **CSP:** a curated policy is **enforced** in production (`Content-Security-Policy`), verified
  violation-free against a real `next build && next start` run across dialogs, forms, and debounced
  navigation. Dev stays **Report-Only** — Turbopack's HMR runtime needs `eval`, which a strict `script-src`
  would otherwise break. `Permissions-Policy` added; existing headers unchanged.

**Deferred (Phase 6):**

- **Mini-phase 4.5 (gallery image optimization)** — legacy 10–16 MB CloudFront originals occasionally
  **500** Next's built-in image optimizer (observed live on `/galerie` during this phase). The lightbox UI
  ships against `next/image` regardless; the fix (CloudFront resize vs. Sharp derivatives + backfill) is
  its own phase, as already scoped.
- **Rate-limiting** (registration/reset/login) — carried over from Phase 5, still deferred to Phase 7
  (needs a shared store).
- **Dynamic OG images** (`next/og`) — shipped static per-page OG (real photos/excerpts) instead; fully
  generated OG images were explicitly "if time permits" in the phase plan.

- **Password crypto:** `hashPassword` reuses the frozen legacy pbkdf2 params (25 000 iters, keylen 512,
  sha256, hex salt-as-string), so new users verify through the **same** `verifyLegacyPassword` path — zero
  special-casing at login. `generateResetToken` = 32 random bytes hex.
- **Registration toggle:** a single-doc `settings` collection (`registrationOpen`, absent ⇒ **closed**),
  admin dashboard switch. The gate is **server-enforced** in the `registerUser` use case (and the presign
  route), not just hidden UI.
- **Registration:** `role:"user"` / `request:"notsend"` set server-side (never from the client), pbkdf2
  hash in the legacy format, image required (`performer` presign prefix). Post-register **auto sign-in** with
  a fallback to `/prihlaseni?registrace=ok`. Description optional (max 1000).
- **Self-service:** `requireSelfOrAdmin` per-record guard; `/ucet` account area — profile edit (old S3 image
  removed on replace), participation card, change-password, delete-account (removes doc + S3 image, signs
  out). `update`/`delete` never touch `role`/`request`.
- **Participation:** self requests `pending` (only from `notsend`/`rejected`); admin `/admin/ucinkujici`
  table approves/rejects → status flips and the performer is **emailed** (best-effort — a mail failure never
  rolls back the decision).
- **Password flows:** reset request (**no account enumeration**, retryable if the mail fails), reset-by-token
  (**single-use, 1h expiry**), logged-in change-password (verifies current). All new passwords use the frozen
  format; crypto/clock/URL injected into the use cases for testability.
- **Email:** `Mailer` port + **Resend** adapter (never logs token/recipient/PII; degrades to a loud error
  without a key so the app still boots) + two Czech templates. Reset links built from `AUTH_URL`.
- **Public reads are now `force-dynamic`** (was ISR `revalidate=60`) so admin changes appear immediately.

**Deferred (Phase 5):**

- **Rate-limiting** on registration / password-reset / login is **not** implemented (brute-force + email-spam
  gap). It needs a shared store (e.g. Upstash) that fits better with the Phase 7 production setup — do it
  there. Recorded, not silently skipped (docs/03 §Security, plan §9).
- **Password change does not revoke other sessions** — Auth.js JWT sessions are stateless, so changing a
  password won't sign out other devices. Acceptable for this app; not building session revocation (plan
  gotcha #8).
- **Live email deliverability pending domain verification** — code is complete; until `zive-teplice.cz` is
  verified in Resend, sends run in sandbox (from `onboarding@resend.dev`, only to your own account email).
  Verify DNS + flip `EMAIL_FROM` in Phase 7.

**Phase 4 (galleries + events + program) built** — admin now manages the remaining content types
end-to-end, reusing every Phase 3 primitive (presign route, `ImageUpload`, `RichTextEditor`,
`requireAdmin`, `Result`+Zod use cases, `revalidatePath`). Green: `npm run build`, `typecheck`, `lint`,
`test` (107 tests), `format:check` all pass.

- **Client-side image compression:** photographer originals run 15–30 MB, so both uploaders now compress
  in the browser **before** the presigned PUT (`components/admin/image-compression.ts`, native Canvas — no
  dep). Decode uses `imageOrientation: "from-image"` (EXIF-correct rotation); output is downscaled to a
  2560px longest edge and re-encoded to JPEG (~5 MB target, quality stepped down if it overshoots),
  transparency flattened to white. Selection accepts originals up to **35 MB** (`MAX_ORIGINAL_BYTES`); the
  server ceiling stays 8 MB and applies to the **compressed** result. Falls back to the original on any
  failure / unsupported browser.
- **Bulk upload:** compress the batch (throttled to 3 in flight for memory) → one presign request for the
  compressed files → concurrency-capped (≈5) direct-to-S3 PUTs via a shared `runWithConcurrency` queue,
  per-file status + a **two-phase progress bar** (count-based "Zpracovávám… X/N" during compression, then
  "Nahrávám… %"). Partial failure is expected — only the succeeded refs are persisted and failed items stay
  selectable for a one-click retry (never fails the whole batch). Successes are collected locally and
  `onComplete` fires exactly once (avoids React Strict Mode's double-invoke of setState updaters).
  `putToS3`/`requestPresign` lifted to `components/admin/upload-client.ts`; the presign route gained
  `gallery: 150` / `program: 1` prefixes (no route change).
- **Galleries:** `createGallery` (name 4–15, featured required), `appendGalleryImages` (ignores empties,
  validates each ref), `removeGalleryImage`, and `deleteGallery` (removes the featured key **and every
  photo key** from S3). Admin UI: list, create (redirects to manage), manage (bulk dropzone + per-photo
  delete). **Carried in the missing admin guard on gallery delete** (legacy had none).
- **Events + program:** the **"make current" transaction** (`createCurrent`) runs
  `Event.updateMany(current→false)` → `Event.create(current:true)` → `User.updateMany(request:"notsend")`
  in one `session.withTransaction` — fixes the legacy non-atomic sequence and the `current:"true"` string
  bug. `updateEvent` fixes the legacy `/eid` no-op. Program is a single ref: `addProgram` (guarded to when
  none exists) / `updateProgram` (deletes the old S3 image on replace). Admin UI: events table with
  `current` badge, create (warns about the reset side-effects), edit + `EventProgramForm`.
- **Shared image-ref validator** `isValidUploadedImage(url, key, prefix)` (`server/actions/image-ref.ts`)
  now re-validates every persisted ref (news/gallery/program) server-side; program HTML is sanitized on
  write; every mutating action `requireAdmin()` + Zod-validates.
- **Tests:** presign schema (gallery ≤150 / program 1), gallery use cases + repo-write integration, the
  event transaction on **`MongoMemoryReplSet`** (previous current flipped off, exactly one current, all
  users reset; forced mid-transaction failure rolls back), and program add/update.

**Deferred:**

- **§9 gallery image optimization** (the 150-photo scale fix) is split into a **mini-phase 4.5**. Small/
  medium galleries render fine today because `mappers.ts` rewrites the S3 origin to CloudFront on read; the
  10–16 MB legacy originals still need on-the-fly CloudFront resize (Option A) **or** pre-generated Sharp
  derivatives + backfill (Option B) before a full 150-image legacy gallery loads without `next/image`
  optimizer timeouts. Decide the AWS approach, then wire `srcset`/variants into the gallery grid + lightbox.
- **Orphaned S3 objects** — same documented gap as Phase 3 (presign+PUT can succeed then persist fail).
  Delete/replace already removes old keys; a delete-on-failure or sweep is a later follow-up.
- **Single-photo gallery lightbox** — the public `/galerie/[gid]` grid is unchanged (no lightbox yet);
  that polish rides with §9/Phase 6.

---

**Phase 3 (news CRUD + presigned uploads) built** — the full write + upload + revalidate loop is in
place and green (`npm run build`, `typecheck`, `lint`, `test`, `format:check` all pass):

- **Storage:** `domain/storage.ts` (`StoragePort` + pure key/URL helpers) → `infrastructure/storage/s3.ts`
  (lazy, server-only `S3Client`) wired through the container. Presigns a **plain** direct-to-S3 `PUT`
  (bucket-policy/CloudFront public read; opt into `x-amz-acl` via `S3_UPLOAD_ACL`), signs `Content-Type`,
  and disables the SDK's default CRC32 checksum so presigned PUTs aren't rejected. Key shape preserved:
  `news/<ISO>-<sanitized-name>`; stored `imageUrl` uses `S3_PUBLIC_HOST`.
- **Presign route** (`app/api/uploads/presign`): admin-guarded, Zod-validates MIME (png/jpg/jpeg) + size
  (≤8 MB) + per-prefix count **before** issuing any URL; generic errors.
- **Write path:** `createNews`/`updateNews`/`deleteNews` use cases (`Result` + Zod, title 10–75,
  non-empty message, image required on create) delete replaced/removed S3 objects; repository `create`/
  `update`/`delete`; admin-guarded server actions sanitize rich-text HTML, re-validate the `imageKey`
  prefix + host, and `revalidatePath` `/aktuality`, `/aktuality/[id]`, and `/`.
- **Admin UI:** admin shell/nav, news table (edit + confirm-delete via native `<dialog>`), create/edit
  pages with `NewsForm` (Tiptap rich-text editor with `immediatelyRender: false`, `ImageUpload` doing
  presign → direct S3 PUT with a progress bar), sonner toasts, accessible labels/errors.
- **Security carry-ins:** admin guards on update **and** delete (legacy had none), server-side MIME/size
  validation before presign, key-prefix constraint, rich-text sanitize on write, Zod on every action.

**Needs your action to run the upload end-to-end:** the S3 bucket must have a **CORS rule** allowing
`PUT`/`GET` from `http://localhost:3000` (and the deployed origin) — apply
[`docs/aws/s3-cors.json`](docs/aws/s3-cors.json) (S3 → bucket → Permissions → CORS, or
`aws s3api put-bucket-cors --bucket <bucket> --cors-configuration file://docs/aws/s3-cors.json`). Set the
real `AWS_*` / `S3_PUBLIC_HOST` in `.env.local`. Deferred: orphaned-object cleanup (presign+PUT can
succeed then persist fail — delete/replace already removes old keys), and galleries/events/program
(Phase 4, reusing this presign route + `ImageUpload` + action pattern).

---

**Phase 2 (auth)** — Auth.js v5 Credentials login with legacy password compatibility is
built and green:

- **Legacy password compat:** `verifyLegacyPassword` reproduces the `passport-local-mongoose`
  pbkdf2 exactly (25000 iters, keylen 512, sha256, hex, salt used as the hex string) with
  `timingSafeEqual` — existing users log in with their current passwords, zero resets. Pinned by a
  regression-vector unit test.
- **Clean-architecture auth path:** `domain/auth.ts` (`SessionUser` + `AuthUserRepository` port) →
  `auth.repository.ts` (loads `+hash +salt`) → `authenticateUser` use case (Zod-validated, single
  generic `invalid_credentials` for unknown-email *and* wrong-password) wired through the container.
  Auth.js `authorize` stays thin — it just calls the use case.
- **Auth.js v5 (`src/auth.ts`):** Credentials provider, **JWT** sessions carrying `id`/`role`
  (no `type`), `pages.signIn = /prihlaseni`, `SESSION_MAX_AGE` parsed as a plain integer.
- **UI + guards:** `(auth)/prihlaseni` login form (server action + `useActionState`, inline generic
  error), server-action logout, `SessionProvider`-aware header (Přihlásit ↔ Odhlásit + Admin link).
  `app/admin` (role `admin`) and `app/ucet` (any session) are guarded in server-component layouts
  (`force-dynamic`); public pages stay static/ISR.
- **Tests:** `verifyLegacyPassword` (regression vector), `authenticateUser` use case (mocked repo +
  crypto; asserts unknown-email and wrong-password yield the same error), `auth.repository`
  integration (`mongodb-memory-server`; secrets load only via `+hash +salt`, never on normal reads).

Phase 1 delivered the DB layer (cached Mongoose connection, five models with pinned collection names)
and the clean-architecture public read path (RSC + ISR) for all public pages. Phase 0 delivered the
themed app, tooling, design tokens, `next/image` remote hosts, and security headers.

**Needs your action to fully verify Phase 2:** point `MONGODB_URI` at a **test DB** with a known-password
user (`npm run db:clone-to-test -- --yes` with `TEST_USER_PASSWORD`, see
[`docs/plans/phase-1-db-and-public-read.md`](docs/plans/phase-1-db-and-public-read.md) §0a), `AUTH_SECRET`
is already generated in `.env.local`, then run `npm run dev` and sign an existing admin + performer in.
Deferred to later phases: registration, password reset/change, `hashPassword` for new credentials,
login rate-limiting, and real admin/account dashboards.
