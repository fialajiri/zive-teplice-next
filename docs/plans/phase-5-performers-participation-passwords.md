# Phase 5 — Performers + participation + password flows (the full user lifecycle + emails)

**Goal:** close the loop on **users/performers**. A visitor **registers** as a performer (when an admin has
**opened registration**), a logged-in performer **edits their profile / deletes their account** and
**requests participation** in the current ročník; an **admin** sees the requests and **approves/rejects**
them (each decision **emails** the performer). Everyone can **reset a forgotten password** (email link) and
**change their password** while logged in. Registration is gated by an **admin-controlled toggle**
(app-settings flag), server-enforced. This phase **reuses every Phase 3/4 primitive** — the presign route +
`ImageUpload` (now with client-side compression), `requireAdmin`, the `Result` + Zod use-case pattern, and
`revalidatePath` — and adds only what's new: **`hashPassword`**, an **app-settings doc**, a **`Mailer`
port**, and **token-based password reset**.

**Estimate:** ~2–3 days · **Source of truth:** `docs/03-backend-plan.md` (Auth table + §1 password crypto +
Users/performers table + §4 email + §Security fixes), `docs/05-data-and-auth-migration.md` (user fields,
`reset.{token,tokenExpiration}`, pbkdf2 params), `docs/06-roadmap.md` §Phase 5 (+ the resolved
admin-driven-registration open question), and `docs/plans/phase-2-auth.md` (the frozen login path this
extends). Legacy: `../zive-teplice-backend/{controllers/auth.js,controllers/users.js,routes/auth.js,routes/users.js,utils/send-email.js,models/user.js}`.

**Exit criteria (deliverable):**

- An **admin** opens/closes registration from the admin UI; **closed → the public form is hidden AND the
  `registerUser` action rejects** (server-enforced, not just UI).
- A visitor **registers** (email, username, password+confirm, phone, description, profile image) → a new
  `role:"user"`, `request:"notsend"` document is created with a pbkdf2 hash in the **identical legacy
  format**, and the new user can immediately **log in** through the existing Phase 2 credentials path.
- A logged-in performer **edits their profile** (optionally replacing the image — old S3 object removed) and
  **deletes their account** (document + S3 image removed); **self-or-admin** enforced server-side.
- A performer **requests participation** → `request:"pending"`; an **admin approves/rejects** → status flips
  and the performer is **emailed** the decision.
- A user **requests a password reset** (emailed a tokenized link), **sets a new password by token** (single-
  use, expiry-checked), and a logged-in user **changes their password** (current verified). All new
  passwords use the frozen pbkdf2 format.
- Auth/authorization is server-enforced everywhere; no action trusts client `role`/`request`; account
  existence is **not** revealed on reset; tokens/PII are never logged.
- `npm run build`, `typecheck`, `lint`, `test`, and `format:check` stay green.

> **Read first (diverge from training data):** `node_modules/next/dist/docs/01-app/**` for server actions /
> `revalidatePath` / route handlers and **Auth.js v5** `signIn`/`auth()` from a server action; the chosen
> email SDK (**Resend** or **nodemailer**) current API. Use context7 / DocsExplorer for exact current APIs.

---

## ⚠️ Key gotchas (read before coding)

1. **`hashPassword` MUST match the frozen legacy format exactly.** pbkdf2, **25 000 iterations, keylen 512,
   sha256, hex**, and the **salt used as the hex string directly** (not decoded to bytes) — identical to
   `verifyLegacyPassword` (Phase 2, verified against real Atlas hashes). `salt = randomBytes(32).toString(
   "hex")`. New users then log in through the *same* `verifyLegacyPassword` path with **zero** special-casing.
   Legacy `setPassword` (passport) is replaced by writing `hash`/`salt` (`select:false`) via the repo.
2. **The registration toggle is server-enforced.** Hiding the form is UX; the `registerUser` action must load
   the flag and reject when closed. The flag is a single **app-settings document** (new — legacy had none);
   pin its collection name explicitly like every other model, and treat "no document yet" as a safe default
   (**closed**).
3. **Never trust client `role`/`request`.** Registration always sets `role:"user"`, `request:"notsend"`
   server-side; `updatePerformer` must not let a user set their own `role`/`request`; only the admin
   `decideParticipation` writes `approved`/`rejected`, and only self writes `pending`.
4. **Reset must not leak account existence.** `requestPasswordReset` returns the **same** generic response
   whether or not the email matches a user (no enumeration). The token is a single-use random hex value with
   an expiry (**1h**, matching legacy `reset.tokenExpiration`); verify expiry, set the new hash, then
   **clear `reset`**. Never log the token, the link, or the recipient.
5. **Self-service authorization is per-record, not just "logged in."** `updatePerformer`/`deletePerformer`/
   `requestParticipation` are allowed for the **owner or an admin** — add a `requireSelfOrAdmin(id)` guard
   (session id vs target id) alongside the existing `requireAdmin`. Never derive identity from a client field.
6. **Email failures must degrade gracefully — but differently per flow.** A **decision** email failing must
   NOT roll back the approve/reject (legacy swallowed it) — log-free, best-effort. A **reset** email failing
   DOES matter (the user is now stuck) — surface a retryable error and don't reveal specifics.
7. **`User.image` is required in the schema.** Registration must upload a profile image first (presign →
   compressed PUT → persist the ref), exactly like gallery/news. Add a `performer` prefix to
   `UPLOAD_MAX_FILES` (single image) and validate refs via the shared `isValidUploadedImage(..., "performer")`.
8. **Password change doesn't invalidate other sessions.** Auth.js JWT sessions are stateless, so changing a
   password won't sign out other devices. Acceptable for this app — **note it**, don't try to build session
   revocation.
9. **The legacy `type` (`prodejce`/`umělec`) stays retired.** It was removed from the web in Phase 1; do NOT
   reintroduce it in registration, the profile form, or the session. The DB field is left untouched for old
   rows.
10. **Participation reset already happens in the event transaction (Phase 4).** Creating a new current event
    resets every `request` to `"notsend"`. Phase 5 owns the request **lifecycle** (self → pending → admin
    decides), not the bulk reset — don't duplicate it.

---

## 0. Prerequisites & decisions

> **Decisions locked (2026-07-14):** email = **Resend**; reset slug = **`/obnova-hesla/[token]`**;
> registration description = **optional, max 1000 chars, no minimum**; post-register UX = **auto `signIn`
> with graceful fallback to `/prihlaseni` + success flash** (no email verification in this flow — matches
> legacy; reset/participation emails act as soft verification later). Settings collection = **`settings`**
> (new; absent doc ⇒ closed). Statuses confirmed `notsend | pending | rejected | approved`.

- [x] **Choose the email provider** — **Resend** (single API key `RESEND_API_KEY`, good deliverability,
      `react-email` templates, no SMTP creds). The `Mailer` port keeps it swappable. Add the `resend` dep.
- [x] **Confirm there is no legacy `settings` collection** — verified: nothing under `src/server/**` and none
      in legacy code. The app-settings doc is new; pin collection name **`settings`**, seed lazily (absent ⇒
      closed).
- [x] **Pick the public reset-link route slug** — **`/obnova-hesla/[token]`**. The link targets this app's
      origin via an env base URL, never a hard-coded host.
- [x] Add a **`performer` prefix** to `UPLOAD_MAX_FILES` (single image) so registration/profile images reuse
      the presign route (gotcha #7). Extend `upload.test.ts`. *(`isValidUploadedImage` picks it up via
      `UploadPrefix` — no hardcoded list to touch.)*
- [x] Confirm the participation **request statuses**: `notsend | pending | rejected | approved` (legacy
      `models/user.js`).

## 1. Complete the password crypto (`src/server/infrastructure/auth/password.ts`)

- [x] Add **`hashPassword(password): { salt, hash }`** using the SAME `P = { iterations: 25_000, keylen: 512,
      digest: "sha256" }` already in the file, `salt = randomBytes(32).toString("hex")`, `hash = pbkdf2(...
      ).toString("hex")` (gotcha #1). Keep `verifyLegacyPassword` unchanged. *(Returns `PasswordHash` type.)*
- [x] **Unit test the round-trip** (`password.test.ts`): `hashPassword` output verifies via
      `verifyLegacyPassword`; a wrong password fails; salts differ across calls; asserts the legacy hex format
      (64-char salt, 1024-char hash). This proves new users share the legacy login path.

## 2. App settings + registration toggle (`src/server/`, `src/app/admin/`)

- [x] `domain/settings.ts` — `AppSettingsDto { registrationOpen: boolean }` + `SettingsRepository`
      (`get(): AppSettingsDto`, `setRegistrationOpen(open): AppSettingsDto`). Absent doc ⇒ `{ registrationOpen:
      false }`.
- [x] `infrastructure/db/models/settings.model.ts` — pinned collection (`settings`); a single-document config
      (`findOneAndUpdate({}, ..., { upsert: true, returnDocument: "after" })` on write).
- [x] `infrastructure/db/repositories/settings.repository.ts` + wired into `container.ts`
      (`settingsRepository`).
- [x] `application/settings.ts` — `getRegistrationOpen(repo)` (read, fails SAFE→closed, returns bare boolean),
      `setRegistrationOpen(repo, open)` (write, `Result`). Admin action `setRegistrationOpenAction`
      (`requireAdmin`, `revalidatePath` `/registrace` + `/admin`).
- [x] Admin UI: a **registration toggle** on the admin dashboard (`app/admin/page.tsx`) — current state +
      open/close button (`RegistrationToggle`, `router.refresh()` after write, no mirrored state) → sonner.

## 3. Registration (`registerUser`) (`src/server/`, `src/app/(auth)/registrace/`)

- [x] Extended the performer domain with a **write shape** (`CreatePerformerInput`: email, username,
      hash/salt, phoneNumber, description, image) — kept separate from the public `PerformerDto`. Added repo
      `create(input): id`, `findByEmail`/`existsByUsername` (uniqueness) onto `PerformerRepository` (matches
      the one-repo-per-entity convention; `role`/`request` are set inside `create`, never accepted).
- [x] `application/registration.ts` — `registerUser(deps, input)`: **checks the registration flag first**
      (closed ⇒ `validation` error, gotcha #2); Zod (email, **username unique** 3–50, password **min 8**
      + confirm match, phone **≥9**, description **optional, max 1000**, image required); injected
      `hashPassword`; persists with **`role:"user"`, `request:"notsend"`** server-set (gotcha #3). `Result`,
      no auth. *(9 unit tests + performer write-repo integration test.)*
- [x] `server/actions/registration.ts` — `registerUserAction`: validates the image ref via
      `isValidUploadedImage(..., "performer")`; calls the use case (which enforces the flag server-side).
      **Post-register UX:** auto `signIn` via Auth.js Credentials with the just-submitted email/password →
      `/ucet`; on any `signIn` `AuthError` falls back to `/prihlaseni?registrace=ok` with a success flash.
      Public (no admin guard). *(Rate-limiting deferred — see §9.)*
- [x] `app/(auth)/registrace/page.tsx` — RSC (force-dynamic) redirects if signed in, reads the flag:
      **closed ⇒ "registration closed" notice**; open ⇒ `<RegistrationForm>` (email, username,
      password+confirm, phone, **plain textarea** description, `ImageUpload prefix="performer"`). Linked both
      ways with `/prihlaseni` (+ `registrace=ok` success flash on the login page).

## 4. Performer self-service (`updatePerformer` / `deletePerformer`)

- [x] `server/actions/guards.ts` — added **`requireSelfOrAdmin(targetId)`** (session exists AND session.id ===
      targetId OR role==="admin"), returns `Result<SelfIdentity, ForbiddenError>` (gotcha #5).
- [x] Domain/repo writes: `getAccountById` (contact+participation DTO), `update(id, input)`
      (username/phone/description + optional image, scoped `role:"user"`), `delete(id): PerformerDto | null`
      (scoped, returns the doc for its image key). `application/performers.ts` — `updatePerformer` (Zod;
      **never** accepts `role`/`request`; username-uniqueness only on change; deletes old S3 key on image
      replace) and `deletePerformer` (repo + `storage.deleteObject`). `Result`, no auth. *(6 use-case tests +
      integration tests.)*
- [x] `server/actions/performers.ts` — `updatePerformerAction` / `deletePerformerAction`: `requireSelfOrAdmin`;
      validate image ref (`performer`); `revalidatePath("/ucinkujici")`, `/ucinkujici/[id]`, `/ucet`.
- [x] `app/ucet/` — real account area: profile **edit form** (reuse `ImageUpload prefix="performer"`) +
      **delete-account** confirm (native `<dialog>`, signs out + hard-nav home after). Admins see an admin
      link instead. *(Change-password link + participation card land in §5/§8.)*

## 5. Participation requests (`requestParticipation`)

- [x] Domain/repo: `setRequest(id, status)` (scoped `role:"user"`); `application/participation.ts` —
      `requestParticipation(repo, id)` sets `"pending"` **only from `notsend`/`rejected`** (already-`pending`/
      `approved` rejected as `validation`). `decideParticipation` lives in §6. *(5 use-case tests.)*
- [x] `server/actions/participation.ts` — `requestParticipationAction`: **`requireSelfOrAdmin(id)`** (self
      requests); `revalidatePath("/ucet")`.
- [x] `app/ucet/` — a **participation card** (`ParticipationCard`): current status badge + per-state copy;
      **"request participation"** button shown only when the status allows (`notsend`/`rejected`).

## 6. Admin performer management + decide participation

- [x] Admin performer list use case (`listPerformersForAdmin` — email/phone/request via `listForAdmin` repo
      method). `application/participation.ts` — `decideParticipation(deps, id, "approved"|"rejected")`:
      sets the status, then **best-effort emails** the performer — an email failure does NOT roll back the
      decision (gotcha #6). *(9 participation tests incl. the best-effort case.)*
- [x] `server/actions/participation.ts` — `decideParticipationAction`: `requireAdmin`; validates the decision
      enum (`isDecision`); `revalidatePath("/admin/ucinkujici")` + `/ucinkujici`.
- [x] Admin UI `app/admin/ucinkujici/` — performers table (username, email, phone, `request` badge) with
      **Approve / Reject** buttons on pending rows → `decideParticipationAction`, sonner. **Účinkující** added
      to the admin nav + dashboard.

## 7. Email infrastructure (`src/server/infrastructure/email/`, `Mailer` port)

- [x] `domain/mailer.ts` — `Mailer` port: `send({ to, subject, html }): Promise<Result<void>>` (typed failure,
      no throwing across layers). Zero deps.
- [x] `infrastructure/email/mailer.ts` — `import "server-only"`; **Resend** adapter (`resend` dep). Never logs
      token/recipient/PII — only a provider error name (gotcha #4/6). Wired into `container.ts`. **Construction
      degrades (loud error on every send) instead of throwing** when env is missing, so the eagerly-built
      container can't crash the app in dev without a key.
- [x] Two templates (`infrastructure/email/templates.ts` — plain functions returning subject + HTML, Czech
      copy from legacy, typos fixed): **(a) reset link** (`resetUrl`) and **(b) participation decision**.
      `resetUrl` built from `AUTH_URL` + `/obnova-hesla/[token]` (never a hard-coded host).

## 8. Password flows (`requestPasswordReset` / `resetPassword` / `changePassword`)

- [x] Auth repo writes: `findByIdWithSecret(id)`, `setResetToken(email, token, expiresAt): boolean`,
      `findByResetToken(token)`, `setPassword(id, {hash, salt})` + `clearReset(id)`. (The `User` schema already
      declares `reset.{token,tokenExpiration}` and `hash`/`salt` `select:false`.) *(Integration-tested.)*
- [x] `application/password.ts` (crypto/clock/URL all injected for testability):
      - `requestPasswordReset(deps, email)` — `generateResetToken()`, store token + expiry (`now + 1h`), email
        the link. **Same generic OK** whether or not the email matches (gotcha #4); a **send failure surfaces a
        retryable error** (gotcha #6).
      - `resetPassword(deps, token, {password, confirm})` — find by token, **check expiry** (consume on
        expiry), `hashPassword`, set hash/salt, **clear `reset`**. Invalid/expired ⇒ one generic typed error.
      - `changePassword(deps, id, current, {password, confirm})` — `findByIdWithSecret`,
        `verifyLegacyPassword(current)`, then `hashPassword(next)`. Wrong current ⇒ typed error.
      All Zod (password **min 8** + confirm), `Result`, no auth. *(11 use-case tests.)*
- [x] `server/actions/password.ts` — `requestPasswordResetAction` (public), `resetPasswordAction` (public, by
      token), `changePasswordAction` (session-derived id). Generic messages; tokens never echoed.
- [x] Public pages: `app/(auth)/obnova-hesla/page.tsx` (request form) and `.../[token]/page.tsx` (set-new
      form → `/prihlaseni?obnova=ok`). **Change-password** form + section in `app/ucet/`. "Zapomenuté heslo?"
      linked from `/prihlaseni`.

## 9. Security (carry-in + new)

- [ ] Every mutating action authorizes server-side (`requireAdmin` / `requireSelfOrAdmin` / registration
      flag); **never trust client `role`/`request`** (gotcha #3).
- [ ] Registration flag enforced in the action, not just the RSC (gotcha #2).
- [ ] Reset: no account enumeration; single-use, expiry-checked token; `timingSafeEqual`-style compare where
      applicable; never log token/link/PII (gotcha #4).
- [ ] New passwords use the frozen pbkdf2 format; `hash`/`salt` stay `select:false`; never returned to the
      client.
- [ ] Validate every uploaded image ref (`performer` prefix + host) before persisting; sanitize any rich-text
      (description) on write if a rich editor is used.
- [ ] **Consider basic rate-limiting** on `registerUserAction`, `requestPasswordResetAction`, and login
      (brute-force / email-spam). If out of scope for the timebox, **record the gap** explicitly.
- [ ] Remove any legacy `eval()`-on-env leftovers if surfaced; parse plain integers (per docs/03 §Security).

## 10. Tests

- [ ] **`hashPassword` round-trip** (`password.test.ts`): output verifies via `verifyLegacyPassword`; wrong
      password fails; salts vary. (The single most important new test — proves shared login path.)
- [ ] **Registration use case** (mocked repo + settings + storage): rejects when the flag is **closed**;
      rejects duplicate username/email; Zod failures (short password, mismatch, short phone); **success sets
      `role:"user"` + `request:"notsend"` and calls `hashPassword`** (never persists a client role).
- [ ] **Settings** use case + repo integration (`mongodb-memory-server`): absent ⇒ closed; `setRegistrationOpen`
      upserts and toggles.
- [ ] **Participation** use cases (mocked repo + mailer): `requestParticipation` only from allowed states;
      `decideParticipation` sets status **and** attempts the email; an email failure does **not** fail the
      decision (gotcha #6).
- [ ] **Password reset** use cases (mocked repo + mailer): `requestPasswordReset` returns generic OK for a
      **missing** email and still generic for a real one; `resetPassword` rejects an **expired**/unknown token,
      succeeds + clears `reset` for a valid one; `changePassword` rejects a wrong current password.
- [ ] **Performer write repo** integration (`mongodb-memory-server`): create; update replaces image; delete
      removes the document + returns the image key; reset-token set/find/clear.
- [ ] **Presign schema** (`upload.test.ts`): `performer` accepts 1, rejects 2.
- [ ] *(Optional)* component tests: registration form (hidden when closed), reset-by-token form.

## 11. Verify & wrap up

- [ ] Admin closes registration → `/registrace` shows the closed notice **and** a direct `registerUserAction`
      call is rejected. Admin opens it → the form registers a user.
- [ ] The newly-registered user **logs in** via the existing Phase 2 flow (proves the shared pbkdf2 path).
- [ ] Performer edits profile (image replaced → old S3 object gone) and deletes account (doc + S3 image gone);
      a **different** non-admin user cannot edit/delete someone else's account (server-enforced).
- [ ] Performer requests participation → `pending`; admin approves and rejects (two users) → statuses flip and
      **decision emails arrive**.
- [ ] Password reset: request → email link → set new password → **log in with the new password**; the token is
      single-use and an expired token is refused. A missing email yields the same generic response. Logged-in
      change-password works and rejects a wrong current password.
- [ ] `build` / `typecheck` / `lint` / `test` green; `format:check` clean. Update `README.md` status → Phase 5;
      note anything deferred (rate-limiting if skipped, session revocation on password change — see gotcha #8).

## Out of scope (later phases)

Design polish, a11y, SEO, explicit CSP + security headers — **Phase 6**. Migration verification, staging QA,
production env, DNS cutover, decommissioning the legacy Heroku backend + old FE — **Phase 7**. Gallery
image-optimization backfill for legacy 10–16 MB objects — **mini-phase 4.5** (independent of this phase).
