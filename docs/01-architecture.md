# 01 — Architecture

## Goal

One deployable Next.js app. The "backend" is no longer a separate HTTP service — it becomes
**server-only modules** (server components, server actions, and a small number of route handlers)
that talk to MongoDB and S3 directly. This removes an entire network hop and the CORS/token dance
between two origins.

## Layering (Clean Architecture, pragmatic)

Dependencies point inward. Framework code (Next, Mongoose, AWS SDK) lives at the edges; business
rules do not import it.

> UI note: shadcn/ui was initialized with the **Nova preset on Base UI primitives** (`@base-ui/react`),
> Lucide icons, and the Geist font — the current shadcn default. (The earlier draft said "Radix";
> Base UI is the modern maintained path and what actually got scaffolded.) We keep ports/interfaces only where they buy testability (storage, email,
repositories) — not for one-off things.

```
Presentation      app/**              RSC pages, layouts, route handlers, server actions (thin)
   │  calls
Application        server/application  use cases: orchestration + DTOs, no framework imports
   │  depends on
Domain            server/domain       entities, value objects, port interfaces (zero deps)
   ▲  implemented by
Infrastructure    server/infrastructure  Mongoose models, S3 client, email, auth crypto
```

Wiring happens in a **composition root** (`server/container.ts`) that constructs concrete infra and
injects it into use cases. Server actions/pages call use cases, never Mongoose directly.

> Pragmatic note: for simple read pages (news list, gallery list) a use case may be a one-line
> pass-through to a repository. That's fine — don't invent abstraction the read path doesn't need.
> The layering earns its keep on the write path (auth, uploads, event-state transitions, emails).

## Folder structure

```
zive-teplice-next/
├─ src/
│  ├─ app/                              # PRESENTATION — App Router
│  │  ├─ (site)/                        # public-facing pages (route group, shared marketing layout)
│  │  │  ├─ page.tsx                    # home
│  │  │  ├─ program/page.tsx
│  │  │  ├─ galerie/page.tsx
│  │  │  ├─ galerie/[gid]/page.tsx      # gallery detail + lightbox
│  │  │  ├─ aktuality/page.tsx          # news list
│  │  │  ├─ aktuality/[nid]/page.tsx    # news detail
│  │  │  ├─ ucinkujici/page.tsx         # performers list (prodejce/umělec tabs)
│  │  │  ├─ ucinkujici/[id]/page.tsx    # performer profile
│  │  │  └─ kontakt/page.tsx
│  │  ├─ (auth)/                        # unauthenticated flows
│  │  │  ├─ prihlaseni/page.tsx         # login
│  │  │  ├─ registrace/page.tsx         # register (respects "registration open" flag)
│  │  │  └─ heslo/                      # reset request, reset[token], change
│  │  ├─ ucet/                          # SELF-SERVICE (role: user) — profile, event request
│  │  │  ├─ layout.tsx                  # guard: requires session
│  │  │  └─ page.tsx
│  │  ├─ admin/                         # ADMIN dashboard (role: admin)
│  │  │  ├─ layout.tsx                  # guard: requires session + role===admin
│  │  │  ├─ page.tsx                    # overview
│  │  │  ├─ aktuality/…                 # news CRUD
│  │  │  ├─ galerie/…                   # gallery CRUD + bulk upload
│  │  │  ├─ ucinkujici/…                # performer approve/reject/delete
│  │  │  ├─ udalosti/…                  # events (create/current)
│  │  │  └─ program/…                   # event program
│  │  ├─ api/
│  │  │  ├─ auth/[...nextauth]/route.ts # Auth.js handler
│  │  │  └─ uploads/presign/route.ts    # returns S3 presigned PUT URLs
│  │  ├─ layout.tsx                     # root layout (fonts, providers, <Toaster/>)
│  │  ├─ error.tsx / not-found.tsx
│  │  └─ globals.css                    # Tailwind v4 entry
│  ├─ components/
│  │  ├─ ui/                            # shadcn/ui generated primitives (button, dialog, …)
│  │  ├─ site/                          # header, footer, nav, hero, gallery-grid, lightbox
│  │  └─ admin/                         # data tables, forms, editor wrapper
│  ├─ features/                         # feature-oriented client glue (hooks, query options)
│  │  ├─ news/  gallery/  performers/  events/  auth/
│  ├─ server/                           # SERVER-ONLY (import 'server-only')
│  │  ├─ domain/                        # entities, value objects, ports (interfaces)
│  │  ├─ application/                   # use cases (one file per use case)
│  │  ├─ infrastructure/
│  │  │  ├─ db/{connection.ts, models/*.ts}     # Mongoose 8, pinned collection names
│  │  │  ├─ storage/s3.ts                        # @aws-sdk/client-s3 + presigner
│  │  │  ├─ email/mailer.ts                       # Resend (or nodemailer)
│  │  │  └─ auth/password.ts                       # pbkdf2 verify (legacy-compatible)
│  │  ├─ actions/                        # 'use server' entrypoints (thin → use cases)
│  │  └─ container.ts                    # composition root
│  ├─ schemas/                          # Zod schemas shared by client forms + server actions
│  ├─ lib/                              # framework-agnostic client utils (cn, dates, query client)
│  └─ auth.ts                           # Auth.js config (exports auth(), signIn, signOut, handlers)
├─ scripts/                             # tsx migration/verification scripts
├─ public/
├─ .env.example
├─ next.config.ts
├─ middleware.ts                        # optional: coarse route protection
├─ components.json                      # shadcn config
├─ tsconfig.json
└─ package.json
```

## Data-flow model

| Concern | Mechanism | Notes |
|---|---|---|
| Public read (home, news, gallery, program, performers) | **RSC** query Mongo via repository, `export const revalidate = 60` (ISR) | No client fetch, no API hop. SEO-friendly. |
| Auth | **Auth.js v5** Credentials, JWT session strategy | Role/id/type in the session token. |
| Admin mutations (create/update/delete) | **Server Actions** + Zod validation + `revalidatePath()` | Progressive enhancement, no manual fetch code. |
| Interactive admin lists (search/filter, optimistic) | **TanStack Query** hitting server actions/route handlers | Only where interactivity warrants it. |
| Image upload (single + bulk gallery ≤150) | **Presigned S3 PUT** (browser→S3) then server action persists keys | Bypasses Vercel's ~4.5 MB serverless body limit. |
| Notifications/toasts | **sonner** (`<Toaster/>` in root layout) | Replaces the legacy NotificationContext. |
| Rich text (news/program body) | **Tiptap** editor → sanitized HTML stored in `message` | Replaces CKEditor 5. |

## Rendering & caching strategy

- **Public pages:** statically rendered with ISR (`revalidate`), so the site is fast and cheap. On
  admin mutation, call `revalidatePath('/aktuality')` etc. to refresh affected pages immediately.
- **Admin/account pages:** dynamic (`export const dynamic = 'force-dynamic'` or by using `auth()`),
  never cached.
- **Images:** `next/image` with `remotePatterns` for the existing S3 + CloudFront hosts (see
  frontend plan). Existing `imageUrl` values keep working unchanged.

## Cross-cutting rules (from global standards)

- No `any`; `unknown` + Zod parsing at every trust boundary.
- Typed errors via discriminated-union result objects out of use cases; presentation maps them to
  HTTP/UI. Keep a small `Result<T, E>` helper rather than throwing across layers.
- Server-only modules import `'server-only'` to prevent accidental client bundling of DB/S3 creds.
- Files ≤200 lines, functions ≤50 lines, ≤3 nesting levels; early returns.
