import "server-only";
import { z } from "zod";
import { env } from "./env";
import { getSession } from "./session";
import { AccessError } from "./access";

export const docIdSchema = z.string().regex(/^[A-Za-z0-9_-]{16,40}$/, "Not a page id");

export function fail(status: number, error: string) {
  return Response.json({ error }, { status, headers: { "cache-control": "no-store" } });
}

/** Cross-site requests can't change anything: the Origin header must be ours. */
export function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(env.APP_URL).origin;
}

/** Shared wrapper for API routes: signed-in user, same origin for writes, tidy errors. */
export async function withUser(
  request: Request,
  handler: (user: { id: string; name: string; email: string; emailVerified: boolean }) => Promise<Response>,
) {
  if (request.method !== "GET" && !sameOrigin(request)) return fail(403, "Request refused.");
  const session = await getSession();
  if (!session) return fail(401, "Sign in to continue.");
  try {
    return await handler(session.user);
  } catch (error) {
    if (error instanceof AccessError) return fail(404, "That page isn't available.");
    if (error instanceof z.ZodError) return fail(400, "That request wasn't valid.");
    console.error(error);
    return fail(500, "Something went wrong. Try again.");
  }
}
