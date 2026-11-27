import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/server/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { huddlePool?: Pool };

// One small pool per server instance; reused across hot reloads.
const pool =
  globalForDb.huddlePool ??
  new Pool({ connectionString: env.DATABASE_URL, max: 5, idleTimeoutMillis: 10_000 });
if (process.env.NODE_ENV !== "production") globalForDb.huddlePool = pool;

export const db = drizzle(pool, { schema });
