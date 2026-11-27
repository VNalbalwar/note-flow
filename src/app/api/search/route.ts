import { z } from "zod";
import { searchDocs } from "@/lib/server/docs";
import { withinLimit } from "@/lib/server/limit";
import { fail, withUser } from "@/lib/server/request";

export async function GET(request: Request) {
  return withUser(request, async (me) => {
    const query = z.string().trim().min(1).max(80).parse(new URL(request.url).searchParams.get("q"));
    if (!(await withinLimit(me.id, "search", 120, 60))) return fail(429, "Too many searches. Wait a moment.");
    return Response.json({ results: await searchDocs(me.id, query) }, { headers: { "cache-control": "no-store" } });
  });
}
