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

- [ ] Working **test DB** with at least one known-password user (Phase 1 §0a — run
      `db:clone-to-test` with `TEST_USER_PASSWORD`, or note one real admin's password for staging).
      Login testing needs a real legacy `hash`/`salt` row.
- [ ] `AUTH_SECRET` set in `.env.local` (`npx auth secret`) — currently empty. Also confirm `AUTH_URL`
      and `SESSION_MAX_AGE` (integer seconds; parsed to `session.maxAge`).
- [ ] Add `next-auth@beta` (Auth.js v5). Confirm it resolves against Next 16 / React 19 (check peer
      deps; pin the exact working version).
- [ ] Capture a **redacted** real `{ hash, salt }` sample from a known account + its plaintext (in a
      safe local fixture, git-ignored) for the crypto unit test.

## 1. Password crypto (`src/server/infrastructure/auth/password.ts`)

- [ ] `verifyLegacyPassword(password, salt, hash): Promise<boolean>` — pbkdf2 (25000/512/sha256/hex),
      salt passed as the stored **hex string**, compare with `timingSafeEqual` (guard length first).
      `import "server-only"`, promisified `node:crypto` pbkdf2.
- [ ] Defer `hashPassword` (new-password creation) to Phase 5 unless trivially reused — Phase 2 is
      login only. If added, use the **identical** format so there's never a mixed-format problem.
- [ ] **The single most important test:** unit-test `verifyLegacyPassword` against the captured real
      sample (correct password → true, wrong → false). If this passes, every existing user can log in.

## 2. Auth domain + use case (`src/server/`)

Keep Auth.js thin; put the "who is this user" logic behind a port + use case (testable, no framework).

- [ ] `domain/auth.ts` — `SessionUser` type (`{ id, username, role }`) and an
      `AuthUserRepository` port: `findByEmailWithSecret(email): Promise<UserWithSecret | null>`
      (returns `id`, `username`, `role`, `hash`, `salt`).
- [ ] `infrastructure/db/repositories/auth.repository.ts` — Mongoose impl using
      `UserModel.findOne({ email }).select("+hash +salt").lean()`. Never returns secrets in a DTO
      beyond what `authorize()` consumes.
- [ ] `application/authenticate.ts` — `authenticateUser(deps, { email, password }): Promise<Result<SessionUser>>`.
      Zod-validate input; load user; `verifyLegacyPassword`; return `SessionUser` or a typed
      `invalid_credentials` error. **Same generic error** for unknown-email and wrong-password.
- [ ] Wire the repo into `container.ts`.

## 3. Auth.js configuration (`src/auth.ts`)

- [ ] `NextAuth({...})` exporting `{ handlers, auth, signIn, signOut }`:
  - [ ] `providers: [Credentials({ authorize })]` — `authorize` calls `authenticateUser(...)` and
        returns `{ id, name: username, role }` or `null`. Thin: no crypto/DB logic inline.
  - [ ] `session: { strategy: "jwt", maxAge: Number(SESSION_MAX_AGE) }`.
  - [ ] `callbacks.jwt` — copy `id`/`role` onto the token on sign-in; `callbacks.session` — expose
        them on `session.user`.
  - [ ] `pages: { signIn: "/prihlaseni" }`; set `trustHost: true` for non-Vercel/preview if needed.
- [ ] `src/app/api/auth/[...nextauth]/route.ts` — `export const { GET, POST } = handlers`.
- [ ] `src/types/next-auth.d.ts` — module augmentation adding `id` + `role` to `Session["user"]` and
      the JWT (no `any`).

## 4. Login / logout UI (`src/app/(auth)/`)

- [ ] `(auth)/layout.tsx` — centered, minimal auth shell (own layout, outside `(site)`).
- [ ] `(auth)/prihlaseni/page.tsx` — accessible login form (email + password, native types, labels):
      a **server action** wrapping `signIn("credentials", ...)` with `useActionState` for inline,
      announced errors (don't redirect on error; show the generic message). Redirect to `callbackUrl`
      or `/ucet` (or `/admin` for admins) on success.
- [ ] Logout — server action calling `signOut()`; button in nav / account area.
- [ ] Add Auth.js `<SessionProvider>` to `components/providers.tsx` (alongside `ThemeProvider`) so
      client nav can read session.

## 5. Route guards + session-aware nav

- [ ] `app/admin/layout.tsx` — `const session = await auth();` redirect to
      `/prihlaseni?callbackUrl=…` if no session **or** `session.user.role !== "admin"`.
      `export const dynamic = "force-dynamic"` (never cache authed pages).
- [ ] `app/ucet/layout.tsx` — same guard, session required (any role).
- [ ] Minimal placeholder `app/admin/page.tsx` + `app/ucet/page.tsx` (real dashboards are Phase 3/5;
      Phase 2 only proves the guard + redirect).
- [ ] `SiteHeader` — reflect session: show **Přihlásit** when logged out, **Odhlásit** + account link
      when logged in, and an **Admin** link only when `role === "admin"`.
- [ ] *(Optional)* `middleware.ts` for coarse pre-render redirects — only with the split edge-safe
      `auth.config.ts` (see gotcha #2). Skippable; layouts already guard.

## 6. Security

- [ ] Generic auth error only (no "user not found" vs "wrong password" distinction).
- [ ] Server-side authorization on every guarded route; never trust a client `role`.
- [ ] Rely on Auth.js httpOnly + secure + sameSite cookies; `AUTH_SECRET` required (fail build/run
      without it in prod).
- [ ] Never log passwords, hashes, salts, tokens, or full session objects.
- [ ] Parse `SESSION_MAX_AGE` as a plain integer (replaces the legacy `eval()` on expiry values).
- [ ] *(Note / optional)* basic login rate-limiting is a nice-to-have; can defer, but record the gap.

## 7. Tests

- [ ] **`verifyLegacyPassword`** against the real redacted sample — correct + wrong password (§1).
- [ ] `authenticateUser` use-case unit tests (mocked repo + crypto): valid, wrong password, unknown
      email → all correct `Result`; assert unknown-email and wrong-password yield the **same** error.
- [ ] `auth.repository` integration test (`mongodb-memory-server`): seeded user is found **with**
      `hash`/`salt`; a normal read path never leaks them.
- [ ] *(Optional)* login-form component test (renders, submits, shows error on failure).
- [ ] Guards/middleware are verified **manually** (auth()/redirect are awkward to unit test) — list the
      manual steps in §Verify.

## 8. Verify & wrap up

- [ ] Existing **admin** logs in with real password → reaches `/admin`.
- [ ] Existing **performer** logs in → reaches `/ucet`; `/admin` redirects them away (role check).
- [ ] Logged-out access to `/admin` and `/ucet` redirects to `/prihlaseni` and returns after login.
- [ ] Wrong password shows the generic error; nav toggles login/logout; logout clears the session.
- [ ] `build` / `typecheck` / `lint` / `test` green; `format:check` clean.
- [ ] Update `README.md` status → Phase 2; note anything deferred.

## Out of scope (later phases)

Registration (respecting the registration-open flag), password reset-request / reset-by-token /
change-password (**Phase 5**) · all content writes, uploads, server-action CRUD (**Phase 3+**) ·
participation requests + emails (**Phase 5**) · real admin/account dashboards · `hashPassword` for new
credentials (Phase 5, unless reused earlier).
