import "server-only";
import { desc, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { doc, member } from "@/lib/db/schema";
import { disconnect } from "./sync";

/** Ids of the pages a person owns or belongs to, most recently edited first. */
export async function pagesOf(userId: string, limit = 1000) {
  const pages = await db
    .selectDistinct({ id: doc.id, updatedAt: doc.updatedAt })
    .from(doc)
    .leftJoin(member, eq(member.docId, doc.id))
    .where(or(eq(doc.ownerId, userId), eq(member.userId, userId)))
    .orderBy(desc(doc.updatedAt))
    .limit(limit);
  return pages.map((p) => p.id);
}

const BATCH = 20;

/** Close one person's live connections on these pages and refuse their older passes. */
export async function disconnectFrom(pageIds: string[], userId: string) {
  let failed = 0;
  for (let at = 0; at < pageIds.length; at += BATCH) {
    const results = await Promise.allSettled(pageIds.slice(at, at + BATCH).map((id) => disconnect(id, userId)));
    failed += results.filter((r) => r.status === "rejected").length;
  }
  // Anything missed is still closed by the sync server's 15-minute access re-check.
  if (failed) console.error(`could not cut live access on ${failed} page(s)`);
}

/**
 * Drop one person's live connections on their recent pages, so a device that was
 * just signed out stops receiving edits now. Devices still signed in reconnect.
 */
export async function dropLiveSessions(userId: string) {
  await disconnectFrom(await pagesOf(userId, 100), userId);
}
