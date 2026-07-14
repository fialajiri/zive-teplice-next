# Phase 6 — Design polish, a11y, SEO (production-quality UX)

**Status: ✅ Done.** All sections below are implemented and verified (`build`, `typecheck`, `lint`,
`test` — 184 tests, `format:check` all green). See `README.md` §Status for the user-facing summary and
`git log` for the commit. Two originally-optional items were consciously skipped — see the note at the
very bottom.

**Goal:** turn the functionally-complete app (Phases 1–5) into something that **looks and feels like the
Živé Teplice festival**. Introduce a real **brand palette + typography**, a proper **landing page** with
festival imagery, redesign the **Kontakt** page with the real contact details, and level up the four content
surfaces: **Aktuality** (current-year + archive), **Galerie** (lightbox), **Účinkující** (search + filters +
pagination). Finish the shadcn/Base-UI design system, add **loading/skeleton/empty/error** states everywhere,
do a **responsive** pass (mobile + tablet) and an **accessibility** pass, then **SEO** (per-route metadata, OG
images, sitemap/robots, `next/font`) and an explicit **CSP + security headers**. No new data model, no new
business logic — this phase is presentation, a11y, and SEO only.

**Estimate:** ~2–3 days · **Source of truth:** `docs/06-roadmap.md` §Phase 6, `docs/01-architecture.md`
(data-flow + caching, layering), the legacy frontend `../zive-teplice-frontend` (branding, copy, contact,
icons — the visual reference), and the existing site components under `src/components/site/**`.

**Exit criteria (deliverable):**

- [x] A cohesive **brand identity** is applied: palette tokens in `globals.css` (light + dark), heading/body
      **fonts via `next/font`**, consistent spacing/radius. The grayscale default shadcn theme is gone.
- [x] The **home page** is a real landing page: a hero using a **festival photo** (sourced from S3/Mongo into
      `public/`), festival intro copy/icons carried from the legacy site, and section links.
- [x] **Kontakt** shows the **real contact information** from the legacy site (address, e-mail, phone, socials,
      map if present — legacy had none), styled to match.
- [x] **Aktuality** lists only the **current ročník's** news by default, with a linked **archive** for older
      years. **Galerie** detail opens each photo in a **lightbox**. **Účinkující** is **paginated** with a
      **fulltext search** (username; email only where authorized) and any agreed filters.
- [x] Every async route has **loading/skeleton** UI and sensible **empty/error** states; all pages are
      **responsive** (mobile + tablet verified) and pass an **a11y** pass (landmarks, heading order, visible
      focus, reduced-motion, form announcements).
- [x] **SEO:** per-route Metadata (+ dynamic for detail pages), Open Graph/Twitter images, `sitemap.ts`,
      `robots.ts`. An explicit **Content-Security-Policy** plus the existing security headers ship in
      `next.config.ts` (or middleware) with **no console CSP violations** in normal use.
- [x] `npm run build`, `typecheck`, `lint`, `test`, `format:check` stay green.

> **Read first (diverge from training data):** `node_modules/next/dist/docs/01-app/**` for the Metadata API,
> `sitemap.ts`/`robots.ts`, `next/font`, `loading.tsx`/`error.tsx`, and Image; check the **Base UI**
> (`@base-ui/react`) + shadcn Nova docs for any primitives added (Dialog for the lightbox, etc.). Use
> context7 / DocsExplorer for exact current APIs.

---

## ⚠️ Key gotchas (read before coding)

1. **This is a presentation phase — do not change the data-flow or layering.** Pages stay RSC → use case →
   repository. Any new query shape (news-by-year, performer search/pagination) is added as a **repository
   method + use case**, never a Mongoose call in a component (CLAUDE.md, `docs/01-architecture.md`).
2. **Public pages are now `force-dynamic` (Phase 5 fix).** Keep it that way — do NOT reintroduce
   `export const revalidate`. New list queries (archive, search) run per-request; paginate at the DB so a big
   archive/performer list never over-fetches.
3. **`email` is NOT on the public `PerformerDto`** (privacy — Phase 5). A **public** fulltext search may match
   **username only**; email search belongs to the **admin** performers list. Confirm scope before wiring
   email search into a public page (see §7 decision).
4. **The gallery lightbox surfaces full-size originals** — legacy objects are **10–16 MB** and are the subject
   of **mini-phase 4.5** (gallery image optimization). The lightbox UI can ship now against `next/image`, but
   large legacy images may load slowly until 4.5 lands. Note the dependency; don't block on it.
5. **Palette in OKLCH, both themes.** The current tokens are all achromatic `oklch(L 0 H)`. Replace with brand
   hues but keep the shadcn token **names** (`--primary`, `--muted`, …) so every existing component recolors
   for free. Define **light AND dark** values and check contrast (WCAG AA) — don't ship a one-theme palette.
6. **CSP with Next + inline styles is fiddly.** Next injects some inline `<style>`/`<script>`; a strict CSP
   needs a **nonce** (via middleware) or the right `style-src`/`script-src`. Start in **Report-Only**, fix
   violations, then enforce. Allow-list the S3/CloudFront image hosts and the Resend/email origins if any
   client hits them (they shouldn't — email is server-side). Keep the existing headers.
7. **Assets go in `public/` and are committed.** When pulling a hero/festival image from S3/Mongo, download a
   **web-sized** copy (compress, ~≤300 KB) into `public/`, don't hotlink a 15 MB original. Give it real `alt`.
8. **`next/font` replaces the Geist defaults deliberately.** If the brand uses a specific family, self-host via
   `next/font/google` or `next/font/local`; keep the `--font-sans`/`--font-heading` CSS variables wired in
   `globals.css` so nothing else changes.
9. **A11y is not a coat of paint.** Fix semantics as you redesign (one `h1`/page, ordered headings, `nav`
   landmarks, `:focus-visible` rings, `prefers-reduced-motion` on any animation, `aria-live` for async form
   results) — retrofitting later is harder. Most primitives already do this; custom UI (lightbox, mobile nav,
   pagination) must be keyboard + screen-reader correct.
10. **Design polish must not regress the working flows.** The Phase 3–5 admin forms, uploads, auth, and
    participation actions keep working unchanged — restyle their shells, don't rewire their logic.

---

## 0. Prerequisites & decisions

All decided with the maintainer at the start of implementation (grounded in a survey of the legacy frontend
and the live Mongo/S3 data — see the plan file this phase started from for full rationale):

- [x] **Brand palette** — fresh festival-appropriate palette (not a literal legacy-color port), OKLCH,
      light + dark. Grassy green primary + warm amber accent, contrast-checked (one initial failure on
      button text found and fixed: 4.43:1 → 5.02:1 via `--primary` lightness 0.55 → 0.52).
- [x] **Typography** — Roboto (body, matches legacy) + **Archivo Black** (headings) via `next/font/google`.
      Chose an open-license display font over the legacy's local AmSans to avoid licensing risk.
- [x] **Hero image source** — real festival photos pulled from the live "2024"/"2025" S3 galleries,
      compressed to ~300 KB JPEGs in `public/hero/`.
- [x] **Účinkující search scope** — **username only**, public (matches `PerformerDto` — no email field).
- [x] **Aktuality "current year"** — `createdAt` matched to the calendar year of `Event.getCurrent().year`
      (falls back to the real calendar year if no event is current). No News schema change.
- [x] **CSP strategy** — curated static policy, Report-Only → **enforced in production** (verified against a
      real `next build && next start` run); stays Report-Only in dev since Turbopack's HMR needs `eval`.
- [x] Confirmed **shadcn/Base-UI primitives**: added Dialog, Skeleton, Pagination, Input, Badge (only
      `button`/`sonner` existed before this phase).

## 1. Design system foundation (`globals.css`, `layout.tsx`, `components/ui/`)

- [x] Replaced the achromatic tokens in `globals.css` with the brand palette (light + dark), same token
      names — every existing component (including admin/auth shells) recolors for free. AA contrast verified
      with a small OKLCH→sRGB contrast script.
- [x] Wired **fonts** via `next/font` (`--font-sans` = Roboto, `--font-heading` = Archivo Black); base-layer
      rule applies `font-heading` to every `h1`–`h6` site-wide.
- [x] Added the 5 agreed **UI primitives** to `components/ui/` via the shadcn CLI (Nova/Base UI style).
- [x] Sanity-checked the admin + auth shells (login page) still render correctly with the new tokens.

## 2. Site chrome (`components/site/site-header.tsx`, `site-footer.tsx`)

- [x] Redesigned the **header/nav**: text wordmark, primary nav, auth-aware actions, light/dark **theme
      toggle**, and an accessible **mobile menu** (Base UI Dialog, keyboard + focus-trap verified). Breakpoint
      moved from `md` to `lg` after finding the desktop nav actually overflowed/wrapped at real tablet width.
- [x] Redesigned the **footer**: contact snippet, social links, nav, copyright — copy carried from legacy.
- [x] Single `main` landmark per route (already correct from Phase 1 scaffold).

## 3. Landing page (`app/(site)/page.tsx`)

- [x] Real **hero**: festival photo, name + tagline, CTAs (Program / Galerie / **Registrace** — conditionally
      shown via the live `registrationOpen` setting). No motion used, so `prefers-reduced-motion` is moot here.
- [x] Festival **intro/about** section (legacy copy + 4 lucide-react icons standing in for the legacy SVGs),
      current-ročník highlight (event title/year in the hero subtitle), latest-news teaser (restyled). RSC,
      no client fetch.

## 4. Kontakt (`app/(site)/kontakt/page.tsx`)

- [x] Real contact info from the legacy site: organizer name, address, e-mail, phone, socials. Semantic
      `<address>`, accessible `mailto:`/`tel:` links. No map — the legacy site never had one.

## 5. Aktuality — current year + archive (`app/(site)/aktuality/**`, news repo/use case)

- [x] Repo/use case: `listByDateRange` + `listDistinctYears` on `NewsRepository`; `listCurrentYearNews` /
      `listArchiveYears` / `listNewsForYear` in the application layer.
- [x] `/aktuality` shows current-ročník news + a link to `/aktuality/archiv` (year-card grid) →
      `/aktuality/archiv/[year]`. `NewsCard` itself needed no changes (recolors via shared tokens).
- [x] Loading skeleton (route-level `loading.tsx`) + empty state on every list.

## 6. Galerie — lightbox (`app/(site)/galerie/[gid]/**`, `components/site/`)

- [x] `GalleryLightbox`: Base UI Dialog, full-size image, **keyboard nav** (arrows, Esc), focus trap, prev/next
      buttons + counter, real `alt` text. Client component; the grid stays server-rendered. One real bug found
      and fixed: arrow-key nav initially didn't work because Base UI's Dialog doesn't bubble `keydown` to
      `window` — fixed by attaching `onKeyDown` directly to `DialogContent`.
- [x] **Mini-phase 4.5 dependency confirmed live**: `/galerie` hit real `500`s from Next's image optimizer on
      the 10–16 MB legacy CloudFront originals during this phase's own testing — pre-existing, not a
      regression, exactly the gap 4.5 is scoped to fix.
- [x] Loading skeleton for the grid; empty state for an image-less gallery (pre-existing, verified).

## 7. Účinkující — search + filters + pagination (`app/(site)/ucinkujici/**`, performer repo/use case)

- [x] Repo/use case: `search({ query, onlyApproved, page, pageSize })` on `PerformerRepository` — Mongo regex
      on username, **diacritic- and case-insensitive** (character-class expansion, e.g. "skodova" matches
      "Škodová"), paginated at the DB (skip/limit + count).
- [x] **Scope extended beyond the original plan at the maintainer's request mid-implementation**: split into
      `/ucinkujici` (current ročník — reuses the existing `request:"approved"` participation field, no schema
      change) and `/ucinkujici/vsichni` (everyone), mirroring the Aktuality current+archive pattern. Search is
      **live/debounced** (400 ms, URL-driven via `router.replace`, progressively-enhanced `<form>` fallback).
- [x] Email search was never wired into any public page (gotcha #3) — admin-only, unchanged.
- [x] Loading skeleton + "Nic nenalezeno" empty state.

## 8. Loading / skeleton / empty / error states (all routes)

- [x] Added route-level `loading.tsx` (via a shared `DetailSkeleton` component, two layouts) for every detail
      route that lacked one: `aktuality/[nid]`, `galerie/[gid]`, `ucinkujici/[id]`, `program`. List routes
      already inherited a working group-level skeleton from `(site)/loading.tsx`.
- [x] `(site)/error.tsx` + `not-found.tsx` confirmed styled with the new brand palette (shadcn `Button`).
      Empty states already used a consistent Czech copy pattern; verified, not changed.

## 9. Responsive pass (mobile + tablet)

- [x] Audited every route at mobile (390px) / tablet (768px) / desktop. Found and fixed a real bug: the
      desktop nav wrapped and overlapped the logo at 768px (6 links + auth + theme toggle didn't fit) — fixed
      by moving the mobile-menu breakpoint from `md` to `lg`.

## 10. Accessibility pass

- [x] Fixed heading-order skips: card grids (Aktuality, Galerie, Účinkující) jumped `h1` → `h3` with no `h2`
      in between — added `sr-only` `h2`s. Single `h1`/route confirmed throughout.
- [x] Visible `:focus-visible` rings confirmed via real keyboard Tab-through (nav links, cards, theme toggle).
- [x] Keyboard paths verified: lightbox (arrows/Esc/focus-trap), mobile nav (Tab-cycle wraps correctly,
      confirmed via a full manual trap test), pagination (plain `<a>` links, inherently keyboard-native).
- [x] Added a global `prefers-reduced-motion: reduce` kill switch (kills all animation/transition durations).
- [x] Contrast checked against the new palette with a small OKLCH contrast script; one failure found and
      fixed (light-mode primary button text, 4.43:1 → 5.02:1).
- [x] Translated the last hardcoded English strings found in shared UI primitives (Dialog's "Close",
      Pagination's "Go to previous/next page" / "More pages") for consistency with the rest of the (Czech)
      site.

## 11. SEO (`app/**` metadata, `sitemap.ts`, `robots.ts`, OG)

- [x] Per-route **Metadata**: static where reasonable, `generateMetadata` for news/gallery/performer detail
      and the archive-year route, with real plain-text excerpts (`htmlToExcerpt`) instead of duplicating the
      title.
- [x] **Open Graph / Twitter**: root-level static defaults (hero photo) + per-page dynamic OG images for
      news/gallery/performer detail pages using their real cover photo. Fully generated `next/og` images were
      explicitly "if time permits" in this plan — skipped in favor of shipping real-photo OG images instead.
- [x] `app/sitemap.ts` (195 URLs: static routes + every news/gallery/performer id + archive year) and
      `app/robots.ts` (disallows `/admin`, `/ucet`, `/prihlaseni`, `/registrace`, `/obnova-hesla`, `/api/`).
      Canonical origin from `AUTH_URL` via a shared `getSiteUrl()` helper — never hard-coded.
- [x] `next/font` confirmed in place (§1).

## 12. Security — explicit CSP + headers (`next.config.ts` / middleware)

- [x] Added a **Content-Security-Policy**: `img-src` allow-lists the S3 + CloudFront hosts (+ dynamic upload
      host), `'unsafe-inline'` for script/style (Next's injected inline tags), `frame-ancestors 'none'`,
      `Permissions-Policy` added. Verified **Report-Only** first (dev, and an initial prod build), then
      **flipped to enforced** for `NODE_ENV=production` after a `next build && next start` run showed zero
      violations across every dialog, form, and debounced navigation tested. Dev stays Report-Only since
      Turbopack's HMR runtime relies on `eval`. Existing headers (nosniff, X-Frame-Options, Referrer-Policy,
      HSTS) untouched.
- [x] No map embed exists anywhere on the site (legacy had none) — no extra CSP frame allowance needed.

## 13. Tests

- [x] Repo/use-case tests for news **by year**: `listByDateRange`/`listDistinctYears` (integration, real
      in-memory Mongo) + `listCurrentYearNews`/`listArchiveYears`/`listNewsForYear` (application, mocked).
- [x] Repo/use-case tests for performer **search**: username match, diacritic/case-insensitivity, admin
      accounts excluded, `onlyApproved` filter, empty result, page/total math (integration) +
      `searchPerformers` defaults/clamping/error path (application, mocked).
- [x] `sitemap.ts`/`robots.ts` unit tests (mocked container) — static + dynamic entries present, single
      origin, disallow rules correct.
- [ ] **Skipped, consciously**: dedicated component tests for the lightbox keyboard-close and pagination
      controls (explicitly "optional" in this plan). Covered instead by manual keyboard verification during
      §9/§10 — the project's stated convention favors use-case/integration tests over component tests, and
      the underlying logic (arrow-key nav, page-window math) has no component-test-specific risk beyond what
      manual verification already exercised.

## 14. Verify & wrap up

- [x] Manual pass at mobile/tablet/desktop; keyboard-only walk of nav, lightbox, search, pagination
      (mobile-menu focus-trap explicitly verified via a full Tab-cycle).
- [ ] **Skipped**: a formal Lighthouse run. Substituted with equivalent manual checks this session already
      covers Lighthouse's main categories — a scripted WCAG-formula contrast audit (§10), a real
      `next build && next start` CSP-violation check (§12), and per-route Metadata/sitemap verification
      (§11) — but no single aggregate score was captured. Worth a quick Lighthouse pass before a real
      production deploy.
- [x] `build` / `typecheck` / `lint` / `test` (184 tests) green; `format:check` clean. `README.md` status
      updated to Phase 6 with an explicit deferred list.

## Out of scope (later phases)

- **Mini-phase 4.5** — gallery image optimization for the legacy 10–16 MB originals (CloudFront resize vs.
  Sharp derivatives + backfill). The lightbox UI ships here; the heavy-image performance fix is separate.
  **Confirmed still live** — this phase's own manual testing hit real `500`s from it.
- **Rate-limiting** (registration/reset/login) — deferred from Phase 5 to **Phase 7** (needs a shared store).
- **Migration verification, staging QA, production env, DNS cutover, Resend domain verification, decommissioning
  the legacy Heroku backend + old FE** — **Phase 7**.
