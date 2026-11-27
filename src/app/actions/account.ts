"use server";

import { and, desc, eq, gt, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { session } from "@/lib/db/schema";
import { dropLiveSessions } from "@/lib/server/live";
import { getSession } from "@/lib/server/session";
import { run } from "./run";

/** Session tokens never leave the server; devices are referred to by row id. */
export async function listDevices() {
  return run("devices", { max: 60, seconds: 60 }, async (me) => {
    const current = (await getSession())!.session.id;
    const rows = await db
      .select({ id: session.id, userAgent: session.userAgent, ipAddress: session.ipAddress, updatedAt: session.updatedAt })
      .from(session)
      .where(and(eq(session.userId, me.id), gt(session.expiresAt, new Date())))
      .orderBy(desc(session.updatedAt));
    return { devices: rows.map((r) => ({ ...r, current: r.id === current })) };
  });
}

export async function signOutDevice(id: string) {
  return run("devices", { max: 30, seconds: 60 }, async (me) => {
    const target = z.string().min(1).max(64).parse(id);
    await db.delete(session).where(and(eq(session.id, target), eq(session.userId, me.id)));
    await dropLiveSessions(me.id);
    return {};
  });
}

export async function signOutOtherDevices() {
  return run("devices", { max: 10, seconds: 60 }, async (me) => {
    const current = (await getSession())!.session.id;
    await db.delete(session).where(and(eq(session.userId, me.id), ne(session.id, current)));
    await dropLiveSessions(me.id);
    return {};
  });
}
