import "server-only";
import mongoose from "mongoose";

// Serverless-safe connection. Vercel invokes functions many times; caching the
// connection on `globalThis` across invocations avoids exhausting Atlas connections.
// See docs/03-backend-plan.md §Mongoose connection.

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  _mongoose?: MongooseCache;
};

const cache: MongooseCache = globalForMongoose._mongoose ?? {
  conn: null,
  promise: null,
};
globalForMongoose._mongoose = cache;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    // Fail loudly rather than silently connecting to a default. During Phase 1
    // this MUST point at the cloned TEST database (see docs/plans/phase-1-db-and-public-read.md §0a).
    throw new Error("MONGODB_URI is not set.");
  }

  cache.promise ??= mongoose.connect(uri, {
    maxPoolSize: 5,
    // Bound connection attempts so a misconfigured/unreachable DB fails fast
    // instead of hanging a build or request for the full 30s default.
    serverSelectionTimeoutMS: 8000,
  });
  cache.conn = await cache.promise;
  return cache.conn;
}
