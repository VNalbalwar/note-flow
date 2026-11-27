import { z } from "zod";
import { requireAccess } from "@/lib/server/access";
import { withinLimit } from "@/lib/server/limit";
import { docIdSchema, fail, withUser } from "@/lib/server/request";
import { callRoom } from "@/lib/server/sync";

type Context = { params: Promise<{ docId: string }> };

export async function GET(request: Request, context: Context) {
  return withUser(request, async (me) => {
    const docId = docIdSchema.parse((await context.params).docId);
    // History can show text that was later removed, so viewers don't get it.
    await requireAccess(docId, me.id, "editor");
    const res = await callRoom(docId, "versions");
    if (!res.ok) return fail(502, "Version history is unavailable right now.");
    return Response.json(await res.json(), { headers: { "cache-control": "no-store" } });
  });
}

export async function POST(request: Request, context: Context) {
  return withUser(request, async (me) => {
    const docId = docIdSchema.parse((await context.params).docId);
    await requireAccess(docId, me.id, "editor");
    const { label } = z.object({ label: z.string().trim().min(1).max(80) }).parse(await request.json());
    if (!(await withinLimit(me.id, "version", 20, 60))) return fail(429, "Wait a moment before saving another.");
    const res = await callRoom(docId, "version-create", {
      body: JSON.stringify({ label, author: me.name }),
      contentType: "application/json",
    });
    if (!res.ok) return fail(res.status === 409 ? 409 : 502, "That version couldn't be saved.");
    return Response.json(await res.json());
  });
}
