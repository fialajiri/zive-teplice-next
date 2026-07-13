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

**Phase 1 in progress** — DB layer + public read path is built and green (`npm run build`,
`typecheck`, `lint`, `test` all pass; 14 tests):

- **DB layer:** serverless-safe cached Mongoose connection + five models with **pinned collection
  names** and legacy fields (`hash`/`salt` declared `select:false`).
- **Clean-architecture read path:** domain ports + DTOs → Mongoose repositories → read use cases
  (`Result<T,E>`) wired through `src/server/container.ts`. Pages never touch Mongoose.
- **Public pages (RSC + ISR, `revalidate=60`):** home, `aktuality` (+detail), `galerie` (+detail
  grid), `program`, `ucinkujici` (+profile), `kontakt`; shared `(site)` layout with header/footer,
  `loading`/`error`/`not-found`, per-route metadata, Czech dates, sanitized rich text.
- **Tests:** use-case unit tests (mocked ports) + repository integration test (`mongodb-memory-server`).

Phase 0 (scaffold) delivered the themed app, tooling (ESLint/Prettier/Vitest/Husky), design tokens,
`next/image` remote hosts, and security headers.

**Remaining before Phase 1 is truly "done" (needs your action):** create the isolated **test
database** and clone prod into it — `npm run db:clone-to-test -- --yes` (see
[`docs/plans/phase-1-db-and-public-read.md`](docs/plans/phase-1-db-and-public-read.md) §0a) — then set
a real `MONGODB_URI` (pointing at the test DB) in `.env.local` and verify the pages render live data.
Next: **Phase 2** (auth) in [`docs/06-roadmap.md`](docs/06-roadmap.md).
