import { z } from "zod";
import { requireAccess } from "@/lib/server/access";
import { withinLimit } from "@/lib/server/limit";
import { docIdSchema, fail, withUser } from "@/lib/server/request";
import { callRoom } from "@/lib/server/sync";
import { AI_LANGUAGES } from "@/shared/ai";

const body = z.object({
  language: z.enum(AI_LANGUAGES),
  text: z.string().trim().min(1).max(12_000),
});

export async function POST(request: Request, context: { params: Promise<{ docId: string }> }) {
  return withUser(request, async (me) => {
    const docId = docIdSchema.parse((await context.params).docId);
    await requireAccess(docId, me.id, "viewer");
    const input = body.parse(await request.json());
    // Protects the free daily AI allowance.
    if (!(await withinLimit(me.id, "ai", 8, 60 * 60))) {
      return fail(429, "You've used the AI helper 8 times this hour. Try again later.");
    }
    const res = await callRoom(docId, "ai", { body: JSON.stringify(input), contentType: "application/json" });
    if (res.status === 501) return fail(501, "The AI helper works once the sync server is deployed to Cloudflare.");
    if (!res.ok) return fail(502, "The AI helper couldn't answer. The free daily allowance may be used up.");
    return Response.json(await res.json(), { headers: { "cache-control": "no-store" } });
  });
}
