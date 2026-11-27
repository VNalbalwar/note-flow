import { z } from "zod";
import { requireAccess } from "@/lib/server/access";
import { docIdSchema, fail, withUser } from "@/lib/server/request";
import { callRoom } from "@/lib/server/sync";

export async function GET(request: Request, context: { params: Promise<{ docId: string; versionId: string }> }) {
  return withUser(request, async (me) => {
    const params = await context.params;
    const docId = docIdSchema.parse(params.docId);
    const versionId = z.coerce.number().int().positive().parse(params.versionId);
    await requireAccess(docId, me.id, "editor");
    const res = await callRoom(docId, "version-get", { query: `?id=${versionId}` });
    if (!res.ok) return fail(res.status === 404 ? 404 : 502, "That version couldn't be opened.");
    return new Response(res.body, {
      headers: { "content-type": "application/octet-stream", "cache-control": "no-store" },
    });
  });
}
