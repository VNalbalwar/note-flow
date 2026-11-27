import { requireAccess } from "@/lib/server/access";
import { withinLimit } from "@/lib/server/limit";
import { docIdSchema, fail, withUser } from "@/lib/server/request";
import { callRoom } from "@/lib/server/sync";
import { LIMITS, sniffImage } from "@/shared/sync";

const TOO_BIG = "Images can be up to 1.5 MB.";

export async function POST(request: Request, context: { params: Promise<{ docId: string }> }) {
  return withUser(request, async (me) => {
    const docId = docIdSchema.parse((await context.params).docId);
    await requireAccess(docId, me.id, "editor");
    if (!(await withinLimit(me.id, "upload", 30, 60 * 10))) return fail(429, "Too many uploads. Wait a few minutes.");
    if (Number(request.headers.get("content-length") ?? 0) > LIMITS.maxFileBytes) return fail(413, TOO_BIG);

    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.byteLength > LIMITS.maxFileBytes) return fail(413, TOO_BIG);
    // The file's own bytes decide the type. SVG is refused because it can carry scripts.
    const type = sniffImage(bytes);
    if (!type) return fail(415, "Use a PNG, JPEG, GIF or WebP image.");

    const res = await callRoom(docId, "file-put", { body: bytes, contentType: type });
    if (!res.ok) return fail(res.status === 409 ? 409 : 502, res.status === 409 ? "This page has reached its image limit." : "Upload failed. Try again.");
    const { id } = (await res.json()) as { id: string };
    return Response.json({ url: `/api/docs/${docId}/files/${id}` });
  });
}
