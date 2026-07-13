/**
 * Clone the production MongoDB into an isolated TEST database so Phase 1+ work runs
 * against realistic data with zero risk to production. See
 * docs/plans/phase-1-db-and-public-read.md §0a.
 *
 * Flow: mongodump (prod, read-only) -> mongorestore (test, --drop) -> sanitize PII.
 *
 * Requires the MongoDB Database Tools on PATH (`mongodump`, `mongorestore`):
 *   macOS: `brew install mongodb-database-tools`
 *
 * Env (put in .env.local, NEVER commit real URIs):
 *   MONGODB_URI_PROD   read-only connection string to production
 *   MONGODB_URI_TEST   connection string to the (separate) test cluster/db
 *   TEST_USER_PASSWORD optional — if set, every user's hash/salt is reset to this
 *                      password (pbkdf2, legacy-compatible) so you can log in in Phase 2
 *
 * Run:  npm run db:clone-to-test -- --yes
 * The --yes flag is required because this DROPS and overwrites the test database.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import mongoose from "mongoose";

// Load .env.local (Node 20.12+/24 built-in — no dotenv dependency needed).
try {
  process.loadEnvFile(".env.local");
} catch {
  // Fine if it's absent; env vars may already be exported in the shell.
}

type ParsedUri = { host: string; db: string };

function parseUri(uri: string): ParsedUri {
  const url = new URL(uri);
  const db = url.pathname.replace(/^\//, "");
  return { host: url.host, db };
}

function maskUri(uri: string): string {
  return uri.replace(/\/\/[^@]*@/, "//<credentials>@");
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`✖ Missing required env var ${name}`);
    process.exit(1);
  }
  return value;
}

// Legacy passport-local-mongoose format: pbkdf2, 25000 iters, keylen 512, sha256, hex,
// salt used as the hex STRING directly. Mirrors docs/03-backend-plan.md §1.
function hashLegacyPassword(password: string): { salt: string; hash: string } {
  const salt = randomBytes(32).toString("hex");
  const hash = pbkdf2Sync(password, salt, 25_000, 512, "sha256").toString(
    "hex",
  );
  return { salt, hash };
}

function run(command: string, args: string[]): void {
  execFileSync(command, args, { stdio: "inherit" });
}

async function main(): Promise<void> {
  const confirmed =
    process.argv.includes("--yes") || process.env.CONFIRM === "yes";

  const prodUri = requireEnv("MONGODB_URI_PROD");
  const testUri = requireEnv("MONGODB_URI_TEST");
  const prod = parseUri(prodUri);
  const test = parseUri(testUri);

  // ── Safety guards ────────────────────────────────────────────────────────
  if (!prod.db || !test.db) {
    console.error("✖ Both URIs must include a database name in the path.");
    process.exit(1);
  }
  if (prod.host === test.host && prod.db === test.db) {
    console.error("✖ TEST target equals PROD (same host + db). Aborting.");
    process.exit(1);
  }
  if (!/test|staging|dev/i.test(test.db)) {
    console.error(
      `✖ Refusing: test DB "${test.db}" doesn't look like a test database ` +
        `(expected name to contain test/staging/dev).`,
    );
    process.exit(1);
  }

  console.log(`  PROD : ${maskUri(prodUri)}  (db: ${prod.db})`);
  console.log(`  TEST : ${maskUri(testUri)}  (db: ${test.db})`);

  if (!confirmed) {
    console.error(
      "\n✖ This DROPS and overwrites the TEST database. Re-run with --yes to proceed.",
    );
    process.exit(1);
  }

  const dumpDir = mkdtempSync(join(tmpdir(), "zt-clone-"));
  try {
    console.log("\n▶ Dumping production…");
    run("mongodump", [`--uri=${prodUri}`, `--out=${dumpDir}`]);

    console.log("\n▶ Restoring into test (drop + namespace remap)…");
    run("mongorestore", [
      `--uri=${testUri}`,
      "--drop",
      `--nsFrom=${prod.db}.*`,
      `--nsTo=${test.db}.*`,
      dumpDir,
    ]);
  } finally {
    rmSync(dumpDir, { recursive: true, force: true });
  }

  console.log("\n▶ Sanitizing PII in the test database…");
  await sanitize(testUri);

  console.log("\n✓ Done. Point the app at the TEST database via MONGODB_URI.");
}

async function sanitize(testUri: string): Promise<void> {
  await mongoose.connect(testUri, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database handle after connect.");

  const users = db.collection("users");
  const all = await users.find({}, { projection: { _id: 1 } }).toArray();

  const testPassword = process.env.TEST_USER_PASSWORD;
  let index = 0;
  for (const { _id } of all) {
    index += 1;
    const update: Record<string, unknown> = {
      email: `user${index}@example.test`,
      phoneNumber: "000000000",
    };
    const unset: Record<string, ""> = { reset: "", refreshToken: "" };

    if (testPassword) {
      const { salt, hash } = hashLegacyPassword(testPassword);
      update.salt = salt;
      update.hash = hash;
    }

    await users.updateOne({ _id }, { $set: update, $unset: unset });
  }

  await mongoose.disconnect();
  console.log(
    `  Sanitized ${all.length} user(s)` +
      (testPassword ? " (passwords reset to TEST_USER_PASSWORD)." : "."),
  );
}

main().catch((error: unknown) => {
  console.error("✖ Clone failed:", error);
  process.exit(1);
});
