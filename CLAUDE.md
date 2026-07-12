# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Whenever working with any third-party library or something similar, you MUST look up the official documentation to ensure that you're working with up-to-date information.
Use the DocsExplorer subagent for efficient documentation lookup.

@AGENTS.md

> The `@AGENTS.md` import above is the single most important rule: this is **Next.js 16**, not the
> version in your training data. Read the relevant guide under `node_modules/next/dist/docs/` (`01-app`,
> `03-architecture`, …) before writing framework code, and heed deprecation notices.

## Commands

```bash
npm run dev            # dev server (Turbopack)
npm run build          # production build
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm test               # vitest run (CI mode)
npm run test:watch     # vitest watch
npm run format         # prettier --write .
npm run format:check   # prettier --check .
```

Run a single test file / test: `npx vitest run src/lib/utils.test.ts` · `npx vitest run -t "name"`.

Tests live next to source as `*.test.ts(x)` (jsdom, globals on, `@testing-library/jest-dom` matchers).
Pre-commit (Husky + lint-staged) runs `eslint --fix` + Prettier on staged `.ts/.tsx`.

## What this project is

One combined Next.js App Router app that **replaces two legacy projects** (an Express/Mongoose backend
and a Next 12 Pages-Router frontend) for the Živé Teplice festival site. The MongoDB Atlas database and
its data are kept **as-is** — including existing `passport-local-mongoose` password hashes, which must
keep working with zero migration. Copy is in Czech; routes use Czech slugs (`aktuality`, `galerie`,
`ucinkujici`, `udalosti`, `prihlaseni`).

The legacy backend can be found here: @../zive-teplice-backend
The legacy frontend can be found here: @../zive-teplice-frontend

Status: **Phase 0 (scaffold) complete.** Most of `src/server/**` is `.gitkeep` placeholders. The real
build-out follows `docs/06-roadmap.md`. **Read the `docs/` folder before implementing** — it is the
source of truth for architecture and every rewrite decision:

- `docs/01-architecture.md` — layering, folder structure, data-flow & caching model
- `docs/03-backend-plan.md` — legacy endpoint → server-action/RSC map; auth crypto, uploads, event transaction
- `docs/05-data-and-auth-migration.md` — keep-Mongo rationale, pinned collection names, pbkdf2 login compat
- `docs/06-roadmap.md` — the phased delivery plan

## Architecture

The former HTTP backend becomes **server-only modules** (no separate service). Clean-architecture
layering, dependencies point inward — framework code (Next, Mongoose, AWS SDK) stays at the edges:

```
app/**                 Presentation — RSC pages, route handlers, server actions (kept thin)
server/application     Use cases: orchestration + DTOs, no framework imports
server/domain          Entities, value objects, port interfaces (zero deps)
server/infrastructure  Mongoose models, S3 client, email, auth crypto (implements domain ports)
server/container.ts    Composition root — wires concrete infra into use cases
```

Server actions/pages call use cases, **never Mongoose directly**. Ports/interfaces exist only where
they buy testability (storage, email, repositories) — the layering earns its keep on the write path
(auth, uploads, event-state, emails); simple read pages may be a one-line pass-through.

Data-flow rules:
- **Public reads** (home, news, gallery, program, performers): RSC querying Mongo via a repository, ISR
  via `export const revalidate`. No client fetch, no API hop.
- **Auth**: Auth.js v5 Credentials, JWT session with `role`/`id`/`type` in the token.
- **Admin mutations**: server actions + Zod validation + `revalidatePath()`.
- **Image upload** (single + bulk ≤150): presigned S3 PUT (browser → S3 direct) to bypass Vercel's
  ~4.5 MB body limit, then a server action persists the keys.
- Server-only modules import `'server-only'` to keep DB/S3 creds out of client bundles.

## Conventions specific to this repo

- **Path alias**: `@/*` → `src/*`.
- **UI**: shadcn/ui with the **Nova preset on Base UI primitives** (`@base-ui/react`) — not Radix. Icons
  are `lucide-react`; components in `src/components/ui/`. `cn()` from `@/lib/utils` merges classes.
- **Legacy password compat is the highest-risk item**: pbkdf2, 25000 iters, keylen 512, sha256, hex,
  salt used as the hex string directly. New passwords use the identical format. See
  `docs/03-backend-plan.md` §1 — unit-test `verifyLegacyPassword` against a real (redacted) hash.
- **Mongoose models pin collection names explicitly** (3rd `model()` arg) to avoid pluralization
  pointing at empty collections; the `User` schema must declare the runtime-added `hash`/`salt`
  (`select:false`). Confirm real Atlas names before coding.
- **Pinned deps** (latest breaks tooling): TypeScript 6 (not 7), ESLint 9. Don't bump these blindly.
- **Security fixes to carry in during the rewrite**: add missing admin guards on news update/delete and
  gallery delete; validate upload MIME/size server-side before presigning; sanitize rich-text HTML;
  never trust client `role`/`request` fields (Zod-validate every action input).
- `next.config.ts` allow-lists the existing S3 + CloudFront image hosts and sets security headers.
- Env: copy `.env.example` → `.env.local` (`.env*` is gitignored).
