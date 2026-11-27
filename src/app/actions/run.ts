import "server-only";
import { z } from "zod";
import { AccessError } from "@/lib/server/access";
import { withinLimit } from "@/lib/server/limit";
import { getSession } from "@/lib/server/session";

export type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

type Me = { id: string; name: string; email: string; emailVerified: boolean };

/** Messages written for people. Anything else is logged and hidden. */
const FRIENDLY = /^(You |Move |That |Saved|Invite|This )/;

/**
 * Every server action runs through this: it must be called by a signed-in
 * person, within a rate limit, and errors never leak internals.
 */
export async function run<T extends object>(
  bucket: string,
  limit: { max: number; seconds: number },
  work: (me: Me) => Promise<T>,
): Promise<Result<T>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Your session ended. Sign in again." };
  try {
    if (!(await withinLimit(session.user.id, bucket, limit.max, limit.seconds))) {
      return { ok: false, error: "That's a lot at once. Wait a moment and try again." };
    }
    return { ok: true, ...(await work(session.user)) };
  } catch (error) {
    if (error instanceof AccessError) return { ok: false, error: error.message };
    if (error instanceof z.ZodError) return { ok: false, error: "Check what you entered and try again." };
    if (error instanceof Error && FRIENDLY.test(error.message)) return { ok: false, error: error.message };
    console.error(`[action ${bucket}]`, error);
    return { ok: false, error: "Something went wrong. Try again." };
  }
}
