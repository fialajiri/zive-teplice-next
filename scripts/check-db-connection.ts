/**
 * Read-only MongoDB connectivity check. Connects using MONGODB_URI from .env.local,
 * pings, and lists collections with document counts. Makes NO writes.
 *
 * Run: npm run db:check
 */
import mongoose from "mongoose";

async function main(): Promise<void> {
  process.loadEnvFile(".env.local");

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("✖ MONGODB_URI not set in .env.local");
    process.exit(1);
  }

  const dbName = new URL(uri).pathname.replace(/^\//, "") || "(default)";
  console.log(`Connecting to db "${dbName}" …`);

  const start = Date.now();
  try {
    await mongoose.connect(uri, {
      maxPoolSize: 2,
      serverSelectionTimeoutMS: 8000,
    });
    const db = mongoose.connection.db;
    if (!db) throw new Error("No database handle after connect.");

    await db.admin().ping();
    console.log(`✓ Connected and pinged in ${Date.now() - start} ms`);

    const collections = await db.listCollections().toArray();
    const expected = ["users", "events", "galleries", "news", "programs"];
    console.log(`\nCollections (${collections.length}):`);
    for (const name of collections.map((c) => c.name).sort()) {
      const count = await db.collection(name).countDocuments();
      const mark = expected.includes(name) ? "•" : " ";
      console.log(`  ${mark} ${name.padEnd(20)} ${count}`);
    }

    const present = new Set(collections.map((c) => c.name));
    const missing = expected.filter((e) => !present.has(e));
    console.log(
      missing.length
        ? `\n⚠ Expected collections not found: ${missing.join(", ")}`
        : `\n✓ All expected collections present.`,
    );
  } catch (error) {
    console.error(
      `\n✖ Connection failed:`,
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
