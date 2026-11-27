import "server-only";
import { and, desc, eq, ilike, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { doc, favorite, member, user } from "@/lib/db/schema";

export type DocSummary = {
  id: string;
  title: string;
  icon: string | null;
  excerpt: string;
  updatedAt: Date;
  owned: boolean;
  ownerName: string;
  favorite: boolean;
};

function summaries(userId: string) {
  return db
    .select({
      id: doc.id,
      title: doc.title,
      icon: doc.icon,
      excerpt: sql<string>`left(${doc.searchText}, 180)`,
      updatedAt: doc.updatedAt,
      owned: sql<boolean>`${doc.ownerId} = ${userId}`,
      ownerName: user.name,
      favorite: sql<boolean>`${favorite.docId} is not null`,
    })
    .from(doc)
    .innerJoin(user, eq(user.id, doc.ownerId))
    .leftJoin(member, and(eq(member.docId, doc.id), eq(member.userId, userId)))
    .leftJoin(favorite, and(eq(favorite.docId, doc.id), eq(favorite.userId, userId)));
}

const visibleTo = (userId: string) => and(isNull(doc.trashedAt), or(eq(doc.ownerId, userId), isNotNull(member.userId)));

export async function listDocs(userId: string): Promise<DocSummary[]> {
  return summaries(userId).where(visibleTo(userId)).orderBy(desc(doc.updatedAt)).limit(500);
}

export async function searchDocs(userId: string, query: string): Promise<DocSummary[]> {
  const like = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  return summaries(userId)
    .where(and(visibleTo(userId), or(ilike(doc.title, like), ilike(doc.searchText, like))))
    .orderBy(desc(doc.updatedAt))
    .limit(20);
}

export async function listTrash(userId: string) {
  return db
    .select({ id: doc.id, title: doc.title, icon: doc.icon, trashedAt: doc.trashedAt })
    .from(doc)
    .where(and(eq(doc.ownerId, userId), isNotNull(doc.trashedAt)))
    .orderBy(desc(doc.trashedAt));
}
