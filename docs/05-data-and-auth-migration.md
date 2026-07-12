# 05 — Data & auth migration

**Requirement:** keep the current MongoDB data. Existing users, news, galleries, events, programs,
and — critically — existing password hashes must keep working with **zero data migration** if
possible.

## Should we keep MongoDB? (analysis)

**Decision: keep MongoDB (via Mongoose 8). Do not migrate to SQL.**

| Factor | MongoDB (keep) | Postgres + Prisma (switch) |
|---|---|---|
| Data continuity | ✅ Zero ETL, point the app at the same Atlas cluster | ❌ Full export → transform → import, risk of data loss |
| Password hashes | ✅ Preserved in-place; login keeps working | ❌ Must migrate `hash`/`salt` rows into a new table |
| Schema fit | ✅ Documents with embedded `image`, `refreshToken[]`, `reset` map 1:1 | ⚠️ Needs normalization / JSON columns |
| Relationships | Minimal (User→Event, Event→Program) — no complex joins | Overkill for this shape/volume |
| Volume | Small (a community festival site) | No scale pressure justifying a switch |
| Team familiarity | Existing app is Mongo | New paradigm |
| Effort/risk | Low | High, for little benefit |

**Conclusion:** the only real downside of Mongo here (weak relational integrity) doesn't bite at this
data shape or volume. Switching would add migration risk and effort with no payoff. Keep Mongo; gain
type-safety through TypeScript + Zod at the boundary instead of at the DB.

> If the domain later grows relational (ticketing, orders, payments), revisit — but that's a separate
> project, not this rewrite.

## Preserve exact collections & fields

1. **Confirm real collection names in Atlas** before coding (don't assume Mongoose pluralization):
   ```bash
   # via mongosh against the existing cluster
   show collections
   ```
   Then pin each model's collection name as the 3rd `model()` arg:
   ```ts
   export const User = model<IUser>('User', userSchema, 'users')       // confirm 'users'
   export const Event = model('Event', eventSchema, 'events')
   export const Gallery = model('Gallery', gallerySchema, 'galleries')
   export const News = model('News', newsSchema, 'news')               // 'news' (uncountable!)
   export const Program = model('Program', programSchema, 'programs')
   ```

2. **Keep field names/types identical** to the legacy schemas (see `models/*.js` in the old backend).
   The new User schema **must additionally declare the runtime-added auth fields**:
   ```ts
   const userSchema = new Schema({
     email: { type: String, required: true },
     username: { type: String, required: true },
     // passport-local-mongoose added these at runtime in the old app — declare them now:
     hash: { type: String, select: false },
     salt: { type: String, select: false },
     authStrategy: { type: String, default: 'local' },
     phoneNumber: { type: String, required: true },
     description: { type: String, required: true },
     type: { type: String, required: true },          // 'prodejce' | 'umělec'
     role: { type: String, default: 'user' },          // 'user' | 'admin'
     event: { type: Schema.Types.ObjectId, ref: 'Event' },
     request: { type: String, default: 'notsend' },     // notsend|pending|rejected|approved
     image: { imageUrl: { type: String, required: true }, imageKey: { type: String, required: true } },
     reset: { token: String, tokenExpiration: Date },
     refreshToken: [{ refreshToken: { type: String, default: '' } }], // legacy; unused, kept to not disturb docs
   }, { timestamps: {} })
   ```
   Keep the `toJSON` transform that strips `refreshToken` (and now also `hash`/`salt`, though
   `select:false` already prevents loading them).

3. **`refreshToken[]` is now dead** (Auth.js owns sessions). Leave existing subdocs in place; the app
   simply never reads/writes them. No migration needed. Optionally add a one-off cleanup script later.

## Login compatibility for existing users

Existing hashes were produced by `passport-local-mongoose` with defaults **pbkdf2 / 25000 iters /
keylen 512 / sha256 / hex**, salt used as the **hex string directly**. The new Auth.js Credentials
`authorize()` reproduces exactly that (see `03-backend-plan.md` §1 `verifyLegacyPassword`). Result:
**every existing user logs in with their current password, no reset email needed.**

New passwords (signup/reset/change) are written in the **same** pbkdf2 format, so there's never a
mixed-format problem and no lazy-rehash logic required.

## Enum/validation drift to fix on the way in
- `type` should be constrained to `'prodejce' | 'umělec'` at the Zod boundary (schema stores String).
- `role` to `'user' | 'admin'`; `request` to the 4 known values. Enforced in Zod, not the DB, so
  legacy rows never fail to load.

## Verification script (Phase 7)
`scripts/verify-migration.ts` (run with `tsx`): connect to the cluster read-only and assert counts &
shape parity — e.g. every user has `hash`+`salt`, `image.imageUrl`; every gallery image has a `key`;
exactly one `current` event. Spot-check a known user login against a test password in a staging copy.

## Backups before cutover
Take an Atlas snapshot (or `mongodump`) immediately before pointing production traffic at the new
app. The rewrite is read-compatible, but a snapshot is the cheap insurance for the first admin write.
