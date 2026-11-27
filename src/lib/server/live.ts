import "server-only";
import { desc, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { doc, member } from "@/lib/db/schema";
import { disconnect } from "./sync";

/**
 * Drop one person's live connections on their recent pages, so a device that was
 * just signed out stops receiving edits now. Devices still signed in reconnect.
 */
export async function dropLiveSessions(userId: string) {
  const pages = await db
    .selectDistinct({ id: doc.id, updatedAt: doc.updatedAt })
    .from(doc)
    .leftJoin(member, eq(member.docId, doc.id))
    .where(or(eq(doc.ownerId, userId), eq(member.userId, userId)))
    .orderBy(desc(doc.updatedAt))
    .limit(100);
  await Promise.allSettled(pages.map((p) => disconnect(p.id, userId)));
}
