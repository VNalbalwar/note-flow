import { z } from "zod";
import { requireAccess } from "@/lib/server/access";
import { withinLimit } from "@/lib/server/limit";
import { docIdSchema, fail, withUser } from "@/lib/server/request";
import { signRoomPass } from "@/lib/server/sync";
import { inkFor } from "@/lib/people";

export async function POST(request: Request) {
  return withUser(request, async (me) => {
    const { docId } = z.object({ docId: docIdSchema }).parse(await request.json());
    if (!(await withinLimit(me.id, "sync-token", 90, 60))) return fail(429, "Too many reconnects. Wait a moment.");
    const access = await requireAccess(docId, me.id, "viewer");
    const token = await signRoomPass({
      sub: me.id,
      doc: docId,
      role: access.role,
      name: me.name.slice(0, 60),
      ink: inkFor(me.id).ink,
    });
    return Response.json({ token }, { headers: { "cache-control": "no-store" } });
  });
}
