# 04 — Frontend rewrite plan

Keep every existing capability; modernize the delivery. Pages Router → App Router, custom SCSS →
Tailwind v4 + shadcn/ui, context/reducer plumbing → RSC + server actions + a little TanStack Query.

## Route map (legacy Pages → new App Router)

| Legacy page | New route | Type | Notes |
|---|---|---|---|
| `pages/index.js` | `app/(site)/page.tsx` | RSC + ISR | hero, news section, year summaries, support/sponsors |
| `pages/program/index.js` | `app/(site)/program/page.tsx` | RSC | tabs: program schedule / prodejci / umělci |
| `pages/gallery/index.js` | `app/(site)/galerie/page.tsx` | RSC | gallery grid, sorted by date |
| `pages/gallery/[galleryId].js` | `app/(site)/galerie/[gid]/page.tsx` | RSC + client lightbox | improved gallery viewer |
| `pages/aktuality/[newsId].js` | `app/(site)/aktuality/[nid]/page.tsx` | RSC | + `app/(site)/aktuality/page.tsx` list |
| `pages/kontakt/index.js` | `app/(site)/kontakt/page.tsx` | RSC | contact + socials |
| `pages/performers/...` (list within program) | `app/(site)/ucinkujici/page.tsx` + `[id]` | RSC | dedicated performers section |
| `pages/login/index.js` | `app/(auth)/prihlaseni/page.tsx` | client form + SA | Auth.js signIn |
| `pages/register/index.js` | `app/(auth)/registrace/page.tsx` | client form + SA | respects registration-open flag |
| `pages/admin/index.js` | `app/admin/page.tsx` + `app/ucet/page.tsx` | RSC guarded | **split**: admin dashboard vs performer self-service |
| `pages/admin/password/reset/*` | `app/(auth)/heslo/reset/*` | client + SA | request + `[token]` |
| `pages/admin/password/change/*` | `app/ucet/heslo/page.tsx` | client + SA | change password |
| `pages/aktuality/add-news.js` | `app/admin/aktuality/nova/page.tsx` | client + SA | Tiptap editor |
| `pages/aktuality/update/[newsId].js` | `app/admin/aktuality/[nid]/page.tsx` | client + SA | |
| `pages/event/create.js` | `app/admin/udalosti/page.tsx` | client + SA | create/manage current event |
| `pages/gallery/create.js` | `app/admin/galerie/nova/page.tsx` | client + SA | |
| `pages/program/insert.js`, `program/edit.js` | `app/admin/program/*` | client + SA | |
| `pages/performers/edit/[performerId].js` | `app/ucet/profil/page.tsx` (self) & `app/admin/ucinkujici/[id]/page.tsx` (admin) | client + SA | |

> Route slugs are Czech to match the audience and existing `aktuality`/`kontakt` convention. Add
> `next.config` redirects from old paths if any are shared/bookmarked publicly.

## Component system

> Primitives are **Base UI** (`@base-ui/react`) via the shadcn Nova preset, not Radix — same
> accessibility guarantees, current shadcn default.

### shadcn/ui primitives (in `components/ui/`, generated via CLI)
`button`, `input`, `textarea`, `select`, `label`, `form` (RHF+Zod), `dialog`, `sheet`, `tabs`,
`dropdown-menu`, `table`, `card`, `badge`, `avatar`, `skeleton`, `sonner` (toaster), `alert-dialog`
(destructive confirms), `pagination`, `tooltip`.

### Legacy component → new mapping
| Legacy | New |
|---|---|
| `ui-elements/button.js` | shadcn `Button` (variants via `cva`) |
| `ui-elements/modal.js`, `backdrop.js`, `error-modal.js` | shadcn `Dialog` / `AlertDialog` |
| `ui-elements/notification.js` + NotificationContext | `sonner` toasts |
| `ui-elements/loading-spinner.js` | `Skeleton` + route `loading.tsx` + `useFormStatus` pending |
| `ui-elements/tabs/*` | shadcn `Tabs` |
| `ui-elements/photo-modal.js` | `yet-another-react-lightbox` |
| `form-elements/input.js` + custom `useForm`/validators | shadcn `Form` + `react-hook-form` + Zod |
| `form-elements/image-upload.js` | new `ImageUpload` (preview + presigned PUT + progress) |
| `editor/editor.js` (CKEditor) | new `RichTextEditor` (Tiptap) |
| `layout/*` (header, nav, footer) | `components/site/{header,nav,footer}.tsx` |
| news/performer tables | shadcn `Table` (optionally TanStack Table for sort/filter) |

## Galleries (the "improve the galleries" ask)
- **Grid:** responsive CSS grid / masonry with `next/image` (blur placeholders, lazy via native
  loading + `IntersectionObserver` only if needed). Cover images use `featuredImage`.
- **Detail/lightbox:** `yet-another-react-lightbox` with zoom, keyboard nav, thumbnails, and
  swipe on touch. Deep-linkable (`?photo=<index>`), closes with View Transitions where supported.
- **Admin bulk upload:** drag-and-drop dropzone, client-side image resize/compress optional, per-file
  progress, parallel presigned PUTs with a concurrency cap (e.g. 5) for the 150-image case, then one
  server action to persist keys.
- **Perf:** paginate/virtualize very large galleries; serve responsive `sizes`.

## Forms & validation
- One Zod schema per form in `src/schemas/`, imported by **both** the client form (RHF resolver) and
  the server action (`schema.parse` before touching the DB). Single source of truth replaces the
  parallel `express-validator` + `validators.js` rules. Encodes: email, password ≥8 + confirm match,
  username required/unique, phone ≥9, description 150–350, type `prodejce|umělec`, title lengths,
  gallery name 4–15, event year 4-digit.
- Server actions return typed field errors → rendered inline via shadcn `Form` messages (accessible,
  announced).

## Auth on the client
- `SessionProvider` (Auth.js) in root layout; `useSession()` for nav state (login/logout links,
  admin link visibility).
- Route protection primarily **server-side**: `app/admin/layout.tsx` and `app/ucet/layout.tsx` call
  `auth()` and `redirect('/prihlaseni')` (and check `role==='admin'` for admin). Optional
  `middleware.ts` for a coarse first pass. This removes the client-only `AuthGuard` (which rendered
  nothing) — a real server redirect instead.
- Cross-tab logout is automatic via the shared session cookie (drops the `localStorage "logout"`
  event hack and the 10-minute manual refresh timer).

## Styling & design
- Tailwind v4 theme tokens (brand colors, spacing, radius) in `globals.css`/`@theme`. Port the
  palette from `sass/abstracts/_variables.scss`.
- Mobile-first, semantic landmarks (`header`/`nav`/`main`/`footer`), correct heading hierarchy,
  `focus-visible`, `prefers-reduced-motion` for transitions/animations.
- `next/font` for the display + body fonts (self-hosted, no layout shift).
- SEO via the Metadata API (per-page `generateMetadata`), Open Graph images for news/events.
- Icons: `lucide-react` (replaces phosphor-react), incl. Facebook/Instagram in header/footer.

## Data-fetching rules (from React 19 standards)
- No `useEffect` + fetch. Public data loads in RSC; mutations via server actions with
  `useActionState`/`useFormStatus`. TanStack Query only for interactive admin tables (search/sort,
  optimistic approve/reject).
- Derive state during render; controlled shadcn inputs; no prop-mirroring in state.
