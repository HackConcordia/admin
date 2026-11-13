import mongoose from "mongoose";

// One connection per server instance, opened once and shared by every route.
//
// Why not check `mongoose.connection.readyState`: when a Vercel instance is frozen between requests
// no heartbeats arrive, and mongoose's readyState getter then reports "disconnected" while the
// connection is really still open. Reconnecting on that opened a new MongoClient each time and never
// closed the old one. Operations that wait on that getter (startSession/transactions, and on mongoose
// < 8.10 any model first used in that window) also hung until "buffering timed out after 10000ms".
//
// bufferCommands: false means queries never wait in mongoose's queue: they go straight to the
// driver, which reconnects by itself. So every route must await connectMongoDB() before querying.
const CONNECT_OPTIONS = { bufferCommands: false } as const;

type ConnectionCache = { promise: Promise<unknown> | null };

// On globalThis so dev hot reloads and separately bundled routes share one connection.
const globalWithCache = globalThis as typeof globalThis & { mongooseConnectionCache?: ConnectionCache };
const cache: ConnectionCache = (globalWithCache.mongooseConnectionCache ??= { promise: null });

const connectMongoDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set.");
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, CONNECT_OPTIONS).catch((error: unknown) => {
      // Let the next request try again instead of caching the failure.
      cache.promise = null;

      // Never log or rethrow the raw error: it can contain the connection URI (credentials + host).
      const name = error instanceof Error ? error.name : "UnknownError";
      const code = (error as { code?: unknown } | null)?.code;
      console.error("MongoDB connection failed:", name, code !== undefined ? `(code: ${code})` : "");
      throw new Error(`MongoDB connection failed: ${name}`);
    });
  }

  await cache.promise;
};

export default connectMongoDB;
