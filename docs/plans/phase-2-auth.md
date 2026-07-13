# Phase 2 — Authentication (Auth.js v5 + legacy password compatibility)

**Goal:** existing users log in with their **current** passwords (zero resets), sessions carry
`id`/`role`, and protected areas (`/admin`, `/ucet`) are guarded server-side. This de-risks the
single hardest item in the whole rewrite: reproducing the legacy `passport-local-mongoose` hash.

**Estimate:** ~2–3 days · **Source of truth:** `docs/03-backend-plan.md` §1 (verifyLegacyPassword),
`docs/05-data-and-auth-migration.md` (login compatibility), `docs/01-architecture.md` (layering).
Legacy auth: `../zive-teplice-backend/{authenticate.js,strategies,controllers/auth.js,models/user.js}`.

**Exit criteria (deliverable):**

- An **existing admin** and an **existing performer** both sign in with their current passwords.
- A wrong password / unknown email fails with a generic error (no user enumeration).
- `/admin/*` redirects to login when logged out or when `role !== "admin"`; `/ucet/*` redirects when
  logged out. Nav reflects session state (login ↔ logout, admin link).
- `npm run build`, `typecheck`, `lint`, and `test` stay green.

> **Status: ✅ DELIVERED** (2026-07-13). All code + tests landed; `build` / `typecheck` / `lint` /
> `test` (33) / `format:check` green; public pages stay static/ISR. **Legacy password login verified
> working end-to-end against real Atlas hashes** — the single highest-risk item is de-risked. Checklist
> boxes below are ticked with inline `→` notes where the implementation deviated from the original plan.
> Deferred (unchanged): registration, password reset/change, `hashPassword` for new creds, login
> rate-limiting, real dashboards — all Phase 5 / later.

> **Read first (this is Next.js 16 + Auth.js v5, both diverge from training data):**
> `node_modules/next/dist/docs/01-app/**` and the current **Auth.js v5** docs (via context7 /
> DocsExplorer). v5 renamed exports (`NextAuth()` returns `{ handlers, auth, signIn, signOut }`),
> moved config to a root `auth.ts`, and env vars to `AUTH_*`.

---

## ⚠️ Key gotchas (read before coding)

1. **pbkdf2 parameters must match EXACTLY** or every existing login fails: pbkdf2, **25000**
   iterations, **keylen 512**, **sha256**, **hex** digest, and the salt is used as the **hex string
   directly** (NOT decoded to bytes). This is the one thing that must be verified against real data.
2. **Do NOT run the Credentials `authorize()` in Edge middleware.** It uses Mongoose + `node:crypto`,
   which are Node-only. Keep route guards in **server-component layouts** (Node runtime). Only add
   `middleware.ts` if you split an edge-safe `auth.config.ts` (no DB/crypto) from the full `auth.ts` —
   optional, and not needed for the deliverable.
3. **Session strategy = JWT** (no DB adapter). Sessions are stateless; we copy `id`/`role` into the
   token. The legacy `refreshToken[]` array stays dead (Auth.js owns the cookie).
4. **`type` is retired** (Phase 1 change) — do **not** put `type` in the session. Only `id` + `role`.
5. Load `hash`/`salt` explicitly with `.select("+hash +salt")` — they're `select:false`.

---

## 0. Prerequisites

- [x] Working **test DB** with a known-password user. → Confirmed live: legacy login verified against
      real Atlas `hash`/`salt` rows (admin signed in with current password).
- [x] `AUTH_SECRET` set in `.env.local` (generated, 32-byte base64). `AUTH_URL` +
      `SESSION_MAX_AGE=2592000` confirmed; `SESSION_MAX_AGE` parsed as a plain integer → `session.maxAge`.
- [x] Added **`next-auth@5.0.0-beta.31`** (`--save-exact`). → beta.31 is the first beta whose peer deps
      list `next: ^16.0.0` + `react: ^19`; earlier betas (≤.29) cap at Next 15. Also added **`zod@4.4.3`**
      as a direct dep (was only transitive) for the use-case input validation.
- [ ] Capture a **redacted** real `{ hash, salt }` sample into a git-ignored fixture. → **Not done.** The
      crypto test uses a synthetic regression vector instead (see §1). Login parity was proven live, so
      this is now a nice-to-have for a permanent offline regression check, not a blocker.

## 1. Password crypto (`src/server/infrastructure/auth/password.ts`)

- [x] `verifyLegacyPassword(password, salt, hash): Promise<boolean>` — pbkdf2 (25000/512/sha256/hex),
      salt passed as the stored **hex string**, `timingSafeEqual` with a length guard first.
      `import "server-only"`, promisified `node:crypto` pbkdf2. → Also returns `false` (never throws)
      for missing/empty/non-hex/wrong-length inputs so callers treat any failure as invalid.
- [x] `hashPassword` **deferred to Phase 5** (not added) — Phase 2 is login only.
- [x] Unit-test `verifyLegacyPassword` (correct → true, wrong → false, plus bad-input cases).
      → Uses a **synthetic reference vector** generated with the exact passport-local-mongoose defaults
      (pins the params against drift), not a captured real sample. The definitive real-data check was
      done **live** (login verified). Drop a redacted real `{salt,hash}` fixture in later for a permanent
      offline vector.

## 2. Auth domain + use case (`src/server/`)

Keep Auth.js thin; put the "who is this user" logic behind a port + use case (testable, no framework).

- [x] `domain/auth.ts` — `SessionUser` (`{ id, username, role }`), a `Role` union (`"user" | "admin"`),
      a `UserWithSecret` type, and the `AuthUserRepository` port `findByEmailWithSecret(email)`.
- [x] `infrastructure/db/repositories/auth.repository.ts` — `UserModel.findOne({ email })`
      `.select("+hash +salt").lean()`. → Normalises `role` to the `Role` union and treats a row missing
      `hash`/`salt` as **absent** (returns `null`). Secrets are consumed only by the use case.
- [x] `application/authenticate.ts` — `authenticateUser(deps, { email, password })` →
      `Result<SessionUser, AuthFailure>`. Zod-validates (trims/lowercases email); load user;
      `verifyPassword`; returns `SessionUser` or a single `{ kind: "invalid_credentials" }` for bad
      input, unknown email **and** wrong password alike. → `deps` injects both the repo and the verify
      fn, so the use case unit-tests with no crypto/DB.
- [x] Wire the repo into `container.ts` (`authUserRepository`).

## 3. Auth.js configuration (`src/auth.ts`)

- [x] `NextAuth({...})` exporting `{ handlers, auth, signIn, signOut }`:
  - [x] `providers: [Credentials({ authorize })]` — `authorize` calls `authenticateUser(...)` (with
        `container.authUserRepository` + `verifyLegacyPassword`) and returns `{ id, name: username, role }`
        or `null`. Thin: no crypto/DB inline.
  - [x] `session: { strategy: "jwt", maxAge }` — `maxAge` from a `sessionMaxAge()` helper that parses a
        positive integer, else falls back to 30 days.
  - [x] `callbacks.jwt` copies `id`/`role` onto the token on sign-in; `callbacks.session` exposes them
        on `session.user`.
  - [x] `pages: { signIn: "/prihlaseni" }`; `trustHost: true`.
- [x] `src/app/api/auth/[...nextauth]/route.ts` — `export const { GET, POST } = handlers`.
- [x] `src/types/next-auth.d.ts` — augments `Session["user"]`, `User`, and `JWT` with `id`/`role`
      (`Role`, no `any`). → Custom JWT claims still read back as `unknown` across next-auth's re-export
      boundary, so the `session` callback narrows `token.id`/`token.role` with an explicit cast.

## 4. Login / logout UI (`src/app/(auth)/`)

- [x] `(auth)/layout.tsx` — centered, minimal auth shell (own `<main>`, outside `(site)`).
- [x] `(auth)/prihlaseni/page.tsx` — accessible login form (email + password, native types, labels),
      inline announced generic error, role-based post-login destination (`callbackUrl` → `/admin` for
      admins → `/ucet`), open-redirect-safe `callbackUrl`. Page also redirects already-signed-in users.
      → **Deviation from the original recipe.** The plan said "server action wrapping `signIn` +
      `useActionState`, redirect on success." That leaves the header **stale**: the `SessionProvider`
      caches the session client-side, and a server-side `redirect()` is a *soft* navigation, so after
      login the nav kept showing **Přihlásit**. Fix: the `login` server action now **returns**
      `{ ok, redirectTo } | { ok:false, error }` (no server redirect); the client form
      (`useTransition`, not `useActionState`) does a **full-page** `window.location.assign(redirectTo)`
      on success so the provider re-reads the session. The clean use-case/`authorize` path is unchanged.
- [x] Logout — `logout` server action calls `signOut({ redirect: false })` (clears cookie only); the
      client `LogoutButton` then does a full-page nav to `/` (same stale-provider reason as login).
- [x] Added `<SessionProvider>` to `components/providers.tsx`. → It fetches the session client-side, so
      public pages stay **static/ISR** (confirmed in the build route table) rather than being forced
      dynamic by an `auth()` call in a shared layout.

## 5. Route guards + session-aware nav

- [x] `app/admin/layout.tsx` — `await auth()`; redirect to `/prihlaseni?callbackUrl=/admin` if no
      session; `export const dynamic = "force-dynamic"`. → A logged-in **non-admin** is sent to `/ucet`,
      **not** back to login: bouncing them through `callbackUrl` would ping-pong with the login page's
      already-signed-in redirect and loop.
- [x] `app/ucet/layout.tsx` — same shape; any session allowed, only guards against logged-out.
- [x] Minimal placeholder `app/admin/page.tsx` + `app/ucet/page.tsx` (each its own `<main>`; greet by
      `session.user.name`; contain a `LogoutButton`). Real dashboards are Phase 3/5.
- [x] `SiteHeader` reflects session via `useSession`: **Přihlásit** logged out; **Můj účet** +
      **Odhlásit** logged in; **Admin** link only when `role === "admin"`. Renders nothing while the
      session is still `loading` to avoid a wrong-state flash.
- [x] *(Optional)* `middleware.ts` — **skipped** (layouts already guard; no edge-safe split needed).

## 6. Security

- [x] Generic auth error only — single `invalid_credentials`, one Czech message; no enumeration.
- [x] Server-side authorization on every guarded route (`auth()` in layouts); client `role` never trusted.
- [x] Auth.js httpOnly + sameSite cookies (secure in prod); `AUTH_SECRET` set.
- [x] Nothing sensitive logged — no passwords/hashes/salts/tokens/session objects go through `console`.
- [x] `SESSION_MAX_AGE` parsed as a plain integer (no `eval()`).
- [ ] Login **rate-limiting** — **deferred** (recorded gap; Credentials gets no built-in throttling).
      Add before/with public registration in Phase 5.

## 7. Tests

- [x] **`verifyLegacyPassword`** — correct → true, wrong → false, plus missing/non-hex/wrong-length
      inputs. → Against the synthetic reference vector (§1), not a captured real sample.
- [x] `authenticateUser` use-case unit tests (mocked repo + crypto): valid, wrong password, unknown
      email; asserts unknown-email and wrong-password yield the **same** error, and that verification is
      skipped for an unknown email.
- [x] `auth.repository` integration test (`mongodb-memory-server`): seeded user found **with**
      `hash`/`salt`; secret-less row → `null`; normal `lean()` read never leaks the secrets.
- [ ] *(Optional)* login-form component test — **not added** (skipped; the flow is exercised manually).
- [x] Guards verified **manually** (see §8). Total: **33 tests** green.

## 8. Verify & wrap up

- [x] Existing **admin** logs in with real password → reaches `/admin`. **Verified live.**
- [x] Nav toggles correctly after the stale-`SessionProvider` fix (login → **Odhlásit**; logout →
      **Přihlásit**). **Verified live** (this was the reported bug; see §4).
- [ ] Existing **performer** logs in → reaches `/ucet`; `/admin` bounces them to `/ucet`. *(recommend a
      quick manual pass — implemented, not yet observed live)*
- [ ] Logged-out access to `/admin` and `/ucet` redirects to `/prihlaseni` and returns after login.
      *(implemented; quick manual confirmation recommended)*
- [ ] Wrong password shows the generic error. *(implemented; quick manual confirmation recommended)*
- [x] `build` / `typecheck` / `lint` / `test` (33) green; `format:check` clean.
- [x] Updated `README.md` status → Phase 2; deferred items noted.

## Out of scope (later phases)

Registration (respecting the registration-open flag), password reset-request / reset-by-token /
change-password (**Phase 5**) · all content writes, uploads, server-action CRUD (**Phase 3+**) ·
participation requests + emails (**Phase 5**) · real admin/account dashboards · `hashPassword` for new
credentials (Phase 5, unless reused earlier).
