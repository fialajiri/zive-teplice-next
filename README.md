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

**Phase 3 (news CRUD + presigned uploads) built** — the full write + upload + revalidate loop is in
place and green (`npm run build`, `typecheck`, `lint`, `test`, `format:check` all pass; 59 tests):

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
