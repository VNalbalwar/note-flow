import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/db/schema";

/** Fixed-window limit stored in the database. Returns false once over the limit. */
export async function withinLimit(userId: string, bucket: string, max: number, windowSeconds: number) {
  const key = `huddle:${bucket}:${userId}`;
  const now = Date.now();
  const stale = sql`${now} - ${rateLimit.lastRequest} > ${windowSeconds * 1000}`;
  const [row] = await db
    .insert(rateLimit)
    .values({ id: key, key, count: 1, lastRequest: now })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: {
        count: sql`CASE WHEN ${stale} THEN 1 ELSE ${rateLimit.count} + 1 END`,
        lastRequest: sql`CASE WHEN ${stale} THEN ${now}::bigint ELSE ${rateLimit.lastRequest} END`,
      },
    })
    .returning({ count: rateLimit.count });
  return row.count <= max;
}
