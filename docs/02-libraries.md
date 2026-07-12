# 02 — Libraries

**Versions verified against the npm registry on 2026-07-12** (latest `dist-tag`), then reconciled
against what the toolchain actually accepts during the Phase 0 scaffold. The stack is a fair bit newer
than first drafted — notably Next **16**, Mongoose **9**, Zod **4**. Auth.js v5 is still pre-release,
so it installs from the `beta` tag.

**Two "latest is too new" pins** (the absolute-latest breaks the Next tooling; use latest *compatible*):

- **TypeScript** — `latest` is **7.0.2** (the native/`tsgo` compiler), but `@typescript-eslint@8.63`
  only supports `>=4.8.4 <6.1.0`, so TS 7 breaks type-aware lint. → pinned **`typescript@6.0.3`**
  (newest supported). Revisit TS 7 once `typescript-eslint` ships support.
- **ESLint** — `latest` is **10.7.0**, but `eslint-config-next@16` bundles an `eslint-plugin-react`
  that calls a context API removed in ESLint 10 (`getFilename`) → crashes on lint. → pinned
  **`eslint@9.39.5`** (newest 9.x). Revisit ESLint 10 when `eslint-config-next` updates its bundled
  react plugin.

Everything else is on true latest. These two are verified working together via `tsc`, `vitest`,
`eslint`, and `next build` all passing.

### Verified latest versions (install these)

| Package | Version | | Package | Version |
|---|---|---|---|---|
| `next` | `16.2.10` | | `mongoose` | `9.7.4` |
| `react` / `react-dom` | `19.2.7` | | `@tanstack/react-query` | `5.101.2` |
| `typescript` | `6.0.3` (pinned; latest is 7.0.2) | | `@aws-sdk/client-s3` | `3.1085.0` |
| `tailwindcss` / `@tailwindcss/postcss` | `4.3.2` | | `@aws-sdk/s3-request-presigner` | `3.1085.0` |
| `shadcn` (CLI) | `4.13.0` (Base UI primitives, Nova preset) | | `@tiptap/react` / `starter-kit` / `pm` | `3.27.3` |
| `next-auth` | `5.0.0-beta.31` (`@beta`) | | `isomorphic-dompurify` | `3.18.0` |
| `@auth/core` | `0.34.3` (transitive) | | `yet-another-react-lightbox` | `3.32.1` |
| `zod` | `4.4.3` | | `resend` | `6.17.2` |
| `react-hook-form` | `7.81.0` | | `nodemailer` | `9.0.3` |
| `@hookform/resolvers` | `5.4.0` | | `date-fns` | `4.4.0` |
| `lucide-react` | `1.24.0` | | `sonner` | `2.0.7` |
| `class-variance-authority` | `0.7.1` | | `next-themes` | `0.4.6` |
| `clsx` | `2.1.1` | | `server-only` | `0.0.1` |
| `tailwind-merge` | `3.6.0` | | | |

**Dev:** `eslint@9.39.5` (pinned; latest 10.7.0 breaks `eslint-config-next@16`), `eslint-config-next@16.2.10`, `@typescript-eslint/eslint-plugin@8.63.0`,
`prettier@3.9.5`, `prettier-plugin-tailwindcss@0.8.0`, `vitest@4.1.10`,
`@testing-library/react@16.3.2`, `@testing-library/jest-dom@6.9.1`, `@vitejs/plugin-react@6.0.3`,
`jsdom@29.1.1`, `mongodb-memory-server@11.2.0`, `tsx@4.23.0`, `husky@9.1.7`, `lint-staged@17.0.8`.

> Notes: **Auth.js v5** is intentionally the `beta` tag — it's the actively developed line and the
> only one with the App Router API; v4 (`latest`) is legacy. **TypeScript 7** is the native compiler —
> confirm `ts-node`-style tooling (`tsx`) and `vitest` play nicely at scaffold time; fall back to
> `typescript@5.9` only if a blocker appears. Re-run `npm view <pkg> version` at implementation time —
> these move fast.

---

The tables below explain *why* each library is chosen and what it replaces.

## Runtime dependencies

### Framework & language
| Package | Purpose | Replaces |
|---|---|---|
| `next` (16.x) | App Router, RSC, server actions, image optimization | `next@12` (Pages Router) |
| `react`, `react-dom` (19.x) | UI runtime | `react@17` |
| `typescript` (7.x) | Types across FE + BE | — (was plain JS everywhere) |

### UI / styling
| Package | Purpose | Replaces |
|---|---|---|
| `tailwindcss` (4.x) + `@tailwindcss/postcss` | Utility CSS | hand-written SCSS in `sass/` |
| shadcn/ui (CLI-generated components, not a dep) | Accessible components you own (Nova preset) | custom Button/Modal/Input/Tabs |
| `@base-ui/react` (pulled in by shadcn Nova preset) | Accessible primitives (dialog, tabs, popover, etc.) | custom modal/backdrop/tabs |
| `lucide-react` | Icon set | `phosphor-react` |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Variant + class composition (shadcn convention) | ad-hoc class strings |
| `sonner` | Toast notifications | custom NotificationContext |
| `next-themes` (optional) | Dark mode | — |

### Forms & validation
| Package | Purpose | Replaces |
|---|---|---|
| `zod` (4.x) | Schema validation, shared FE↔BE, inferred types | `express-validator` + custom `validators.js` |
| `react-hook-form` | Form state/perf | custom `useForm` reducer hook |
| `@hookform/resolvers` | Wire Zod into RHF | — |

### Data / server state
| Package | Purpose | Replaces |
|---|---|---|
| `mongoose` (9.x) | MongoDB ODM (DB unchanged) | `mongoose@6` |
| `@tanstack/react-query` (5.x) | Client cache for interactive admin views | custom `useHttpClient` |
| `server-only` | Guard server modules from client bundles | — |

### Auth
| Package | Purpose | Replaces |
|---|---|---|
| `next-auth@beta` (5.0.0-beta.31) + `@auth/core` | Sessions, Credentials provider, callbacks | `passport`, `passport-jwt`, `passport-local`, `passport-local-mongoose`, manual JWT/refresh in `authenticate.js` |
| `jsonwebtoken` — **dropped** | Auth.js manages session JWTs | `jsonwebtoken@8` |
| (Node built-in `crypto`) | pbkdf2 verify of legacy hashes | `bcryptjs` (unused legacy dep) |

### Storage (S3)
| Package | Purpose | Replaces |
|---|---|---|
| `@aws-sdk/client-s3` (3.x) | S3 client (put/delete objects) | `aws-sdk@2` (deprecated) |
| `@aws-sdk/s3-request-presigner` (3.x) | Presigned upload URLs (browser→S3 direct) | `multer`, `multer-s3` |

> `multer`/`multer-s3` disappear entirely — with presigned uploads there is no multipart parsing on
> the server. This also removes the Vercel serverless body-size problem for the 150-image bulk upload.

### Rich text & media
| Package | Purpose | Replaces |
|---|---|---|
| `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm` | Headless rich-text editor (news/program body) | `@ckeditor/ckeditor5-*` |
| `isomorphic-dompurify` | Sanitize editor HTML before storing/rendering | — (new safety layer) |
| `yet-another-react-lightbox` | Modern gallery lightbox (zoom, thumbnails, keyboard) | custom `photo-modal.js` |

### Email
| Package | Purpose | Replaces |
|---|---|---|
| `resend` (recommended) | Transactional email (password reset, request status) | `nodemailer` + `nodemailer-sendgrid-transport` |
| _or_ `nodemailer` (fallback) | Keep Gmail SMTP if Resend isn't wanted | keep as-is |

### Utilities
| Package | Purpose | Replaces |
|---|---|---|
| `date-fns` + `date-fns/locale/cs` | Czech date formatting | custom `helpers.js` `createHumanReadableDate` |

## Dev dependencies
| Package | Purpose |
|---|---|
| `eslint`, `eslint-config-next`, `@typescript-eslint/*` | Lint |
| `prettier`, `prettier-plugin-tailwindcss` | Format + class sorting |
| `vitest`, `@testing-library/react`, `@testing-library/jest-dom` | Unit/component tests |
| `mongodb-memory-server` | In-memory Mongo for repository/use-case tests |
| `tsx` | Run `scripts/*.ts` (migration/verification) |
| `husky`, `lint-staged` | Pre-commit format + typecheck (matches existing setup-pre-commit skill) |

## Dependencies dropped
`aws-sdk@2`, `multer`, `multer-s3`, `passport*`, `jsonwebtoken`, `bcryptjs`, `cookie-parser`,
`cors`, `helmet` (Next handles headers; add explicit CSP via `next.config`/middleware),
`express`, `express-validator`, `uuid` (use `crypto.randomUUID()`), `sass`, `phosphor-react`,
`@ckeditor/*`, `react-transition-group`.

## Notes / decisions to confirm at build time
- **Tiptap vs keeping CKEditor:** Tiptap is headless + React-first and themes cleanly with Tailwind.
  Existing news `message` is HTML — Tiptap reads/writes HTML, so stored content is compatible.
- **Resend vs nodemailer:** Resend is simpler and reliable on Vercel; nodemailer+Gmail already works.
  Either is fine — email is low-volume (password reset + request status only).
- **TanStack Query footprint:** intentionally small. Public pages use RSC; Query is only for
  interactive admin tables. Don't add it to pages that don't need client interactivity.
