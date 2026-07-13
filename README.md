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

**Phase 2 (auth) in progress** — Auth.js v5 Credentials login with legacy password compatibility is
built and green (`npm run build`, `typecheck`, `lint`, `test` all pass; 33 tests):

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
