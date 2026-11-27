import { z } from "zod";
import { requireAccess } from "@/lib/server/access";
import { docIdSchema, fail, withUser } from "@/lib/server/request";
import { callRoom } from "@/lib/server/sync";
import { IMAGE_TYPES } from "@/shared/sync";

/** Images are private: each request is checked against the page's access list. */
export async function GET(request: Request, context: { params: Promise<{ docId: string; fileId: string }> }) {
  return withUser(request, async (me) => {
    const params = await context.params;
    const docId = docIdSchema.parse(params.docId);
    const fileId = z.string().regex(/^[a-f0-9]{32}$/).parse(params.fileId);
    await requireAccess(docId, me.id, "viewer");
    const res = await callRoom(docId, "file-get", { query: `?id=${fileId}` });
    if (!res.ok) return fail(404, "That image isn't available.");
    const type = res.headers.get("content-type") ?? "";
    if (!(IMAGE_TYPES as readonly string[]).includes(type)) return fail(404, "That image isn't available.");
    return new Response(res.body, {
      headers: {
        "content-type": type,
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; sandbox",
        "cache-control": "private, max-age=300",
      },
    });
  });
}
