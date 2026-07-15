# Phase 7 — Backlog: everything deferred, postponed, or left unverified (Phases 1–6)

**Goal:** a single source of truth for what's *not* done yet, gathered from `README.md` and every
`docs/plans/phase-*.md` file. Phases 1–6 shipped the full functional app (green `build` / `typecheck` /
`lint` / `test` (184) / `format:check`), but each phase's "Deferred" / "Out of scope" / "Awaiting live
check" notes left a trail of real work. This file consolidates that trail into one prioritized backlog so
nothing gets lost before/during the actual **Phase 7 (migration verification, staging, cutover)** from
`docs/06-roadmap.md`.

**How to use this doc:** items are grouped by priority, not by originating phase. Each item names its
source phase(s) in parentheses so you can go back to the original plan file for full context/gotchas
before implementing. Nothing here is estimated yet — size each item when you actually pick it up.

---

## Tier 1 — Production blockers (do before/at real cutover)

These are the items every phase flagged as a real gap, not a nice-to-have. Roughly maps to the
roadmap's own "Phase 7" scope plus the two security/perf gaps every phase kept re-flagging.

- [x] **Rate-limiting** on registration / password-reset / login (Phases 2, 5, 6). Implemented via a
      `RateLimiter` port (`server/domain/rate-limit.ts`) backed by Upstash Redis
      (`server/infrastructure/rate-limit/upstash.ts`, sliding window, fails open if unconfigured/
      unreachable). Each flow checks both an IP-keyed and identifier-keyed bucket
      (`server/application/rate-limit.ts`): login 5/5min, registration 3/hour, password-reset 3/hour.
      Requires `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` in production (see `.env.example`).
- [ ] **Live email deliverability** — Resend sends are currently sandboxed (`onboarding@resend.dev`, only
      to the account owner's own email) until `zive-teplice.cz` is DNS-verified in Resend. Verify the
      domain, then flip `EMAIL_FROM` to the real address (Phase 5).
- [ ] **Mini-phase 4.5 — gallery image optimization for legacy originals** (Phases 3, 4, 6). New uploads
      are already compressed client-side (Phase 4), but the **pre-existing** 10–16 MB CloudFront/S3
      originals still **500** Next's image optimizer at scale — reproduced live during both Phase 4 and
      Phase 6 testing on `/galerie`. Pick one:
  - **Option A** — on-the-fly CloudFront resize (Lambda@Edge or AWS Serverless Image Handler); app change
    is just building `srcset`/`sizes` against the resize endpoint.
  - **Option B** — pre-generated Sharp derivatives via an S3 `ObjectCreated` Lambda + a one-time backfill
    script for existing objects; extend `ImageDto`/`GalleryImageDto` with variant keys.
  - Either way: verify a full **150-photo legacy gallery** loads without optimizer timeouts (never
    confirmed end-to-end).
- [ ] **Orphaned S3 object cleanup** (Phases 3, 4). A presigned PUT can succeed and then the persisting
      server action fail (or the admin navigates away), leaving an unreferenced S3 object. Delete/replace
      already removes the *old* key on success, but there's no delete-on-failure or periodic sweep for the
      orphan case itself. Bigger surface at gallery bulk-upload scale (≤150 files/request).
- [ ] **`scripts/verify-migration.ts`** — parity checks between the live app's writes and a staging DB
      copy (roadmap Phase 7, never started).
- [ ] **Full staging QA + production cutover** (roadmap Phase 7): Vercel production env vars, an Atlas
      snapshot taken *before* cutover, DNS/domain switch to the new app, monitoring, then decommission the
      legacy Heroku backend + old Next 12 frontend.
- [ ] **Legacy URL redirects** — roadmap open question, never resolved: confirm whether any public URLs
      from the old Pages-Router frontend must keep working, and add `next.config` redirects if so.

## Tier 2 — Verification debt (implemented, never click-tested)

Logic is built and unit/integration-tested, but these specific live flows were never walked end-to-end
because they need a running app (and, for the email ones, a live `RESEND_API_KEY`). Low risk, but real —
do a pass before treating those phases as fully closed.

- [ ] **Phase 2:** existing performer logs in → reaches `/ucet`; logged-out access to `/admin`/`/ucet`
      redirects to `/prihlaseni` and returns after login; wrong password shows the generic error.
- [ ] **Phase 4:** admin deletes a gallery → featured **and** every photo S3 key actually gone (only
      asserted via mocked `deleteObject` calls in tests); event create/edit/delete and program
      add/update walked through the real admin UI (transaction itself is proven on
      `MongoMemoryReplSet`, but the UI wasn't click-tested); the new client-side compression exercised on
      a real 20–30 MB batch; the forced single-file-upload-failure retry path.
- [ ] **Phase 5 (needs live Resend key):** registration-closed notice + a direct `registerUserAction`
      call rejected while closed; a newly-registered user logging in via the Phase 2 credentials path;
      performer profile edit (old S3 image removed) and account delete (doc + S3 image removed), plus
      confirming a **different** non-admin can't touch someone else's account; participation
      approve/reject actually sends the decision email; password reset request → email → set new
      password → login, including the single-use/expired-token rejection and the wrong-current-password
      rejection on change-password.
- [ ] **Phase 1:** confirm exactly **one** `current: true` event exists in the real prod data. Low
      urgency — Phase 4's `createCurrent` transaction is defensive (`updateMany` normalizes *any* number
      of prior current events), so this no longer blocks anything functionally; it's just worth
      confirming the data is clean.

## Tier 3 — Nice-to-haves / polish

Explicitly called "if time permits" or a "minor follow-up" in their originating phase — pick up
opportunistically, no urgency.

- [ ] **Dynamic OG images via `next/og`** (Phase 6) — shipped static per-page OG images (real
      photos/excerpts) instead; fully generated OG images were explicitly optional.
- [ ] **Gallery edit-name affordance** (Phase 4) — gallery name can only be set at creation; there's no
      admin UI to rename an existing gallery.
- [ ] **Redacted real pbkdf2 `{hash,salt}` fixture** (Phase 2) — `verifyLegacyPassword` is currently
      pinned by a *synthetic* reference vector; login parity was proven **live** against real Atlas data,
      but a captured-and-redacted real sample would make that a permanent offline regression test instead
      of a one-time manual check.
- [ ] **Formal Lighthouse run** (Phase 6) — substituted this session with equivalent manual checks
      (scripted WCAG contrast audit, a real `next build && next start` CSP-violation pass, per-route
      metadata/sitemap verification), but no single aggregate score was ever captured. Worth doing once
      before a real production deploy.
- [ ] **List-page render smoke test** (Phase 1 §6) — one rendering smoke test for a list page with a
      mocked use case; never added (repo/use-case/mapper unit tests cover the logic beneath it).

## Tier 4 — Consciously skipped test coverage

Each of these was called out in its phase as "optional, skipped" because use-case/integration tests
already cover the underlying behavior. Revisit only if a regression in one of these areas actually shows
up.

- [ ] Registration-form component test (hidden when registration is closed) (Phase 5).
- [ ] Reset-by-token form component test (Phase 5).
- [ ] Gallery lightbox keyboard-close component test (Phase 6) — covered by manual keyboard verification.
- [ ] Pagination-controls component test (Phase 6) — covered by manual verification; underlying
      page-window math has no component-specific risk beyond what was already exercised.
- [ ] `requireAdmin` unit test + `NewsForm` component test (Phase 3) — optional extras, never added.
- [ ] `BulkImageUpload` component/upload-flow test (Phase 4) — Canvas compression can't run under jsdom;
      the pure dimension/filename helpers are tested, the browser flow is manual-only by necessity.
- [ ] Login-form component test (Phase 2) — flow is exercised manually instead.

## Accepted gaps — not backlog, documented by design

These were evaluated and deliberately **not** scheduled as future work; listed here only so they don't
get rediscovered and re-litigated.

- **Password change does not revoke other sessions** (Phase 5, gotcha #8) — Auth.js JWT sessions are
  stateless; changing a password won't sign out other devices. Acceptable for this app; building session
  revocation is explicitly out of scope.

---

## Out of scope for this backlog file

Anything already shipped and closed in Phases 1–6 per `README.md` §Status. This file only tracks what's
still open.
