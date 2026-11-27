import { and, eq, inArray, isNotNull, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { doc, member, user } from "@/lib/db/schema";
import { requireAccess } from "@/lib/server/access";
import { docIdSchema, withUser } from "@/lib/server/request";

/** Names for the authors of comments. Only people who belong to this page are named. */
export async function GET(request: Request, context: { params: Promise<{ docId: string }> }) {
  return withUser(request, async (me) => {
    const docId = docIdSchema.parse((await context.params).docId);
    await requireAccess(docId, me.id, "viewer");
    const ids = z.array(z.string().max(64)).min(1).max(50).parse(new URL(request.url).searchParams.getAll("id"));
    const people = await db
      .selectDistinct({ id: user.id, name: user.name })
      .from(user)
      .leftJoin(member, and(eq(member.userId, user.id), eq(member.docId, docId)))
      .leftJoin(doc, and(eq(doc.ownerId, user.id), eq(doc.id, docId)))
      .where(and(inArray(user.id, ids), or(isNotNull(member.userId), isNotNull(doc.id))));
    return Response.json({ people }, { headers: { "cache-control": "no-store" } });
  });
}
