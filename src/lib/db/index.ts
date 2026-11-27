import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/server/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { huddlePool?: Pool };

function connect() {
  // One small pool per server instance; reused across hot reloads.
  const pool =
    globalForDb.huddlePool ??
    new Pool({ connectionString: env.DATABASE_URL, max: 5, idleTimeoutMillis: 10_000 });
  globalForDb.huddlePool = pool;
  return drizzle(pool, { schema });
}

type Database = ReturnType<typeof connect>;
let instance: Database | undefined;

/**
 * Connects on first use, not on import. Building the app loads this file, and a
 * build must not need the database address or any other secret.
 */
export const db = new Proxy({} as Database, {
  get(_, property) {
    instance ??= connect();
    const value = Reflect.get(instance, property, instance) as unknown;
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
