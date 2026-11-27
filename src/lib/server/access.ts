import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { doc, invite, member } from "@/lib/db/schema";
import type { SyncRole } from "@/shared/sync";

/**
 * The one place that decides who can do what with a page. Every route, action
 * and page goes through here.
 */

const RANK: Record<SyncRole, number> = { viewer: 1, editor: 2, owner: 3 };

export function atLeast(role: SyncRole, needed: SyncRole) {
  return RANK[role] >= RANK[needed];
}

export type DocRow = typeof doc.$inferSelect;
export type Access = { doc: DocRow; role: SyncRole };

export async function getAccess(docId: string, userId: string): Promise<Access | null> {
  const [row] = await db
    .select({ doc, memberRole: member.role })
    .from(doc)
    .leftJoin(member, and(eq(member.docId, doc.id), eq(member.userId, userId)))
    .where(eq(doc.id, docId))
    .limit(1);
  if (!row) return null;
  if (row.doc.ownerId === userId) return { doc: row.doc, role: "owner" };
  // A page in the trash is visible to its owner only.
  if (!row.memberRole || row.doc.trashedAt) return null;
  return { doc: row.doc, role: row.memberRole };
}

export class AccessError extends Error {
  constructor(message = "You don't have access to that page.") {
    super(message);
    this.name = "AccessError";
  }
}

/** Missing and forbidden look the same, so page ids can't be probed. */
export async function requireAccess(docId: string, userId: string, needed: SyncRole): Promise<Access> {
  const access = await getAccess(docId, userId);
  if (!access || !atLeast(access.role, needed)) throw new AccessError();
  return access;
}

/** Turn invitations waiting on a proven email address into memberships. */
export async function claimInvites(user: { id: string; email: string; emailVerified: boolean }) {
  if (!user.emailVerified) return;
  await db.transaction(async (tx) => {
    const claimed = await tx
      .delete(invite)
      .where(and(eq(invite.email, user.email.toLowerCase()), gt(invite.expiresAt, new Date())))
      .returning();
    for (const row of claimed) {
      await tx
        .insert(member)
        .values({ docId: row.docId, userId: user.id, role: row.role })
        .onConflictDoUpdate({
          target: [member.docId, member.userId],
          // Claiming an old viewer invite must not lower someone who is already an editor.
          set: { role: sql`CASE WHEN ${member.role} = 'editor' THEN 'editor' ELSE excluded.role END` },
        });
    }
  });
}
