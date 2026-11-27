import "server-only";
import { SignJWT } from "jose";
import { env } from "./env";
import type { SyncPass } from "@/shared/sync";

const key = () => new TextEncoder().encode(env.SYNC_SECRET);

/** A 60-second pass that lets one person join one page's live room. */
export async function signRoomPass(pass: SyncPass) {
  return new SignJWT({ ...pass })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("huddle-sync")
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(key());
}

/** Server-to-server call to the sync server. The signature names the exact room and action. */
export async function callRoom(room: string, action: string, init: { body?: BodyInit; contentType?: string; query?: string } = {}) {
  const token = await new SignJWT({ room, action })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("huddle-admin")
    .setIssuedAt()
    .setExpirationTime("30s")
    .sign(key());

  const url = new URL(`/admin/${encodeURIComponent(room)}/${action}${init.query ?? ""}`, env.SYNC_URL);
  return fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      ...(init.contentType ? { "content-type": init.contentType } : {}),
    },
    body: init.body,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
}

async function expectOk(res: Response, what: string) {
  if (!res.ok) throw new Error(`Sync server could not ${what} (${res.status}).`);
  return res;
}

/**
 * Disconnect a person (or everyone) so their next connection is checked again
 * against the database. Passes issued before now are refused.
 */
export async function disconnect(docId: string, userId?: string) {
  await expectOk(
    await callRoom(docId, "kick", { body: JSON.stringify({ userId }), contentType: "application/json" }),
    "update live access",
  );
}

export async function purgeRoom(docId: string) {
  await expectOk(await callRoom(docId, "purge"), "delete the page contents");
}

/** Tell open tabs that title, access or sharing changed. Best effort. */
export async function notifyRoom(docId: string) {
  try {
    await callRoom(docId, "notify");
  } catch {
    // Open tabs will catch up on their next refresh.
  }
}
