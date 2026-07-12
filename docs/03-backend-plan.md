# 03 — Backend rewrite plan

The Express service is dissolved into server code inside the Next app. Below: how each concern is
rebuilt, then a full **endpoint → new implementation** table, then the tricky bits (auth, uploads,
event-state transition, emails) with concrete code.

## Building blocks

### Mongoose connection (serverless-safe)
Vercel invokes functions many times; caching the connection avoids exhausting Atlas connections.

```ts
// server/infrastructure/db/connection.ts
import 'server-only'
import mongoose from 'mongoose'

const uri = process.env.MONGODB_URI!            // built from DB_USER/PASSWORD/NAME (see .env.example)
let cached = (global as any)._mongoose ?? { conn: null, promise: null }
;(global as any)._mongoose = cached

export async function db(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn
  cached.promise ??= mongoose.connect(uri, { maxPoolSize: 5 })
  cached.conn = await cached.promise
  return cached.conn
}
```

### Models — pin collection names, declare legacy fields
Mongoose pluralization must not silently point at a new empty collection. **Pin the collection name
explicitly** (3rd arg to `model()`) after confirming real names in Atlas. The `User` schema must
declare the `hash`/`salt` fields (added at runtime by passport-local-mongoose in the old app) so we
can read them for login. See `05-data-and-auth-migration.md` for the full model set.

### Errors
Use cases return `Result<T, DomainError>` (discriminated union). Server actions map errors to
`{ ok: false, message, fieldErrors? }`; route handlers map to HTTP status. This replaces the
Express `HttpError` + global error handler.

## Endpoint → new implementation map

Legend: **SA** = server action · **RH** = route handler (`app/api/...`) · **RSC** = read directly in
a server component · guards: `[session]` any logged-in, `[admin]` role admin, `[self|admin]`.

### Auth (`/auth/*`)
| Legacy endpoint | New implementation | Notes |
|---|---|---|
| `POST /auth/login` | Auth.js `signIn('credentials')` via **SA** on the login form | pbkdf2 verify legacy hashes |
| `POST /auth/signup` | **SA** `registerUser` + presigned image upload | Zod validation; creates user with `role:"user"`, hashes password (see below) |
| `POST /auth/refreshToken` | **Removed** — Auth.js manages session cookie + silent refresh | drops the `User.refreshToken[]` array usage |
| `GET /auth/me` | `auth()` in RSC / `useSession()` client | no endpoint needed |
| `GET /auth/logout` | Auth.js `signOut()` via **SA** | clears session cookie |
| `POST /auth/reset` | **SA** `requestPasswordReset` | generates token, stores `reset.{token,tokenExpiration}`, emails link |
| `POST /auth/reset/:token` | **SA** `resetPassword` | verifies token+expiry, sets new pbkdf2 hash |
| `POST /auth/changePassword` `[session]` | **SA** `changePassword` | verifies current, sets new hash |

### Users / performers (`/users/*`)
| Legacy | New | Notes |
|---|---|---|
| `GET /users` | **RSC** `listPerformers()` | role==="user" only; used by `/ucinkujici` |
| `GET /users/:uid` | **RSC** `getPerformer(id)` | performer profile page |
| `PATCH /users/:uid` `[self\|admin]` | **SA** `updatePerformer` | optional new image via presign; Zod (username unique, desc 150–350, phone ≥9, type enum) |
| `DELETE /users/:uid` `[self\|admin]` | **SA** `deletePerformer` | deletes S3 image too |
| `POST /users/request/:uid` `[session,self]` | **SA** `requestEventParticipation` | sets `request:"pending"` |
| `PATCH /users/request/:uid` `[admin]` | **SA** `decideParticipation` | `"approved"`/`"rejected"` + email notice |

### News (`/news/*`)
| Legacy | New | Notes |
|---|---|---|
| `GET /news`, `GET /news/:nid` | **RSC** | public list + detail |
| `POST /news` `[admin]` | **SA** `createNews` | presigned image; Zod title 10–75; sanitize `message` HTML |
| `PATCH /news/:nid` | **SA** `updateNews` `[admin]` | **FIX:** add admin guard (legacy had none) |
| `DELETE /news/:nid` | **SA** `deleteNews` `[admin]` | **FIX:** add admin guard; delete S3 image |

### Events & program (`/events/*`)
| Legacy | New | Notes |
|---|---|---|
| `GET /events` | **RSC** `listEvents()` | |
| `GET /events/current` | **RSC** `getCurrentEvent()` | populate `program` |
| `POST /events` `[admin]` | **SA** `createEvent` | **transaction:** unset previous `current`, reset all users' `request` to `"notsend"` (see below) |
| `DELETE /events/:eid` `[admin]` | **SA** `deleteEvent` | |
| `PATCH /events/:eid` `[admin]` | **SA** `updateEvent` | **FIX:** legacy route was `/eid` (typo, no-op) |
| `POST /events/program/:eid` `[admin]` | **SA** `addProgram` | presigned image; Zod title 10–100 |
| `PATCH /events/program/:eid` `[admin]` | **SA** `updateProgram` | replace image, delete old key |

### Gallery (`/gallery/*`)
| Legacy | New | Notes |
|---|---|---|
| `GET /gallery`, `GET /gallery/:gid` | **RSC** | list + detail (detail uses lightbox) |
| `POST /gallery` `[admin]` | **SA** `createGallery` | presigned featured image; Zod name 4–15 |
| `POST /gallery/:gid` (bulk) `[admin]` | **RH** presign batch + **SA** `appendGalleryImages` | up to 150 files → presigned PUT, then persist keys |
| `DELETE /gallery/:gid` | **SA** `deleteGallery` `[admin]` | **FIX:** add admin guard; delete featured + all image keys from S3 |

### Uploads (new)
| Endpoint | Impl | Notes |
|---|---|---|
| `POST /api/uploads/presign` `[admin\|self]` | **RH** | body: `[{ filename, contentType }]`; returns `[{ url, key, publicUrl }]`; validates MIME png/jpg/jpeg |

## Tricky bits — concrete

### 1. Legacy-compatible password verify (login for existing users)
passport-local-mongoose defaults: **pbkdf2, 25000 iterations, keylen 512, sha256, hex**; the salt is
used as the **hex string directly** (not decoded to bytes). Fields: `hash`, `salt` (`select:false`).

```ts
// server/infrastructure/auth/password.ts
import { pbkdf2, timingSafeEqual, randomBytes } from 'node:crypto'
import { promisify } from 'node:util'
const pbkdf2Async = promisify(pbkdf2)

const P = { iterations: 25_000, keylen: 512, digest: 'sha256' as const }

export async function verifyLegacyPassword(password: string, salt: string, hash: string) {
  // NOTE: salt passed as the stored hex STRING, exactly like passport-local-mongoose does.
  const derived = await pbkdf2Async(password, salt, P.iterations, P.keylen, P.digest)
  const a = derived
  const b = Buffer.from(hash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

// New passwords (signup / reset / change) use the SAME format → any user can be re-verified,
// and we could later transparently upgrade, but staying identical means zero migration risk.
export async function hashPassword(password: string) {
  const salt = randomBytes(32).toString('hex')
  const hash = (await pbkdf2Async(password, salt, P.iterations, P.keylen, P.digest)).toString('hex')
  return { salt, hash }
}
```

Auth.js Credentials provider (`src/auth.ts`) `authorize()` loads the user with `+hash +salt`, calls
`verifyLegacyPassword`, and returns `{ id, email, username, role, type }`. `jwt`/`session` callbacks
copy `role`, `id`, `type` into the session so guards can read them.

### 2. Presigned upload flow (single + bulk)
```
client: pick file(s)
  → POST /api/uploads/presign  { files:[{filename, contentType}] }   (server validates MIME + auth)
  ← [{ url(PUT), key, publicUrl }]
client: PUT each file directly to S3 `url`   (progress bar; parallel with a concurrency cap for 150)
  → SA persistImages({ galleryId, images:[{ imageUrl:publicUrl, imageKey:key }] })
server: push into Gallery.images[], revalidatePath(`/galerie/${id}`)
```
Key format preserved: `<destinationPath>/<ISO-timestamp>-<originalname>`. `publicUrl` uses the
existing CloudFront/S3 host so `imageUrl` stays consistent with legacy rows.

### 3. Event-state transition (atomic)
Creating an event must (a) flip the previous `current` event to `false`, (b) set the new one
`current:true`, (c) reset every user's `request` to `"notsend"`. Do it in a **Mongoose session /
transaction** (Atlas supports it) so a partial failure can't leave two current events:

```ts
const session = await conn.startSession()
await session.withTransaction(async () => {
  await Event.updateMany({ current: true }, { current: false }, { session })
  await Event.create([{ title, year, current: true }], { session })
  await User.updateMany({}, { request: 'notsend' }, { session })
})
```

### 4. Email (password reset + request decision)
`server/infrastructure/email/mailer.ts` behind a `Mailer` port. Two templates: reset link and
request-status notice. Resend (or nodemailer/Gmail) — low volume. Never log token or recipient PII.

## Security fixes carried in the rewrite
- Add missing admin guards on news update/delete and gallery delete.
- Remove `eval()` on `SESSION_EXPIRY`/`REFRESH_TOKEN_EXPIRY` — parse plain integers (Auth.js session
  `maxAge`).
- Validate upload MIME/size server-side before issuing a presigned URL; constrain key prefix.
- Sanitize all rich-text HTML (`isomorphic-dompurify`) on write and render.
- Explicit CSP + security headers via `next.config`/middleware (replaces Helmet).
- Zod-validate every server action input; never trust client `role`/`request` fields.
