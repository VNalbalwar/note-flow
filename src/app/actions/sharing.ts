"use server";

import { revalidatePath } from "next/cache";
import { and, asc, count, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { doc, invite, member, shareLink, user, ROLES } from "@/lib/db/schema";
import { requireAccess } from "@/lib/server/access";
import { env } from "@/lib/server/env";
import { hashSecret, newId, newSecret } from "@/lib/server/ids";
import { mailConfigured, sendMail } from "@/lib/server/mail";
import { docIdSchema } from "@/lib/server/request";
import { disconnect, notifyRoom } from "@/lib/server/sync";
import { run } from "./run";

const DAY = 24 * 60 * 60 * 1000;
const role = z.enum(ROLES);
const userId = z.string().min(1).max(64);

const SLOW_REVOKE =
  "Saved, but the live server couldn't be reached. Their open window loses access within 15 minutes.";

async function revokeLive(docId: string, person: string) {
  try {
    await disconnect(docId, person);
    await notifyRoom(docId);
    return {};
  } catch (error) {
    console.error(error);
    return { warning: SLOW_REVOKE };
  }
}

export async function getSharing(docIdInput: string) {
  return run("sharing-read", { max: 120, seconds: 60 }, async (me) => {
    const docId = docIdSchema.parse(docIdInput);
    const access = await requireAccess(docId, me.id, "viewer");
    const isOwner = access.role === "owner";

    const [owner] = await db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, access.doc.ownerId));
    const members = await db
      .select({ id: user.id, name: user.name, email: user.email, role: member.role })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(eq(member.docId, docId))
      .orderBy(asc(member.createdAt));
    const invites = isOwner
      ? await db
          .select({ id: invite.id, email: invite.email, role: invite.role })
          .from(invite)
          .where(and(eq(invite.docId, docId), gt(invite.expiresAt, new Date())))
          .orderBy(asc(invite.createdAt))
      : [];
    const links = isOwner
      ? await db
          .select({ id: shareLink.id, role: shareLink.role, expiresAt: shareLink.expiresAt })
          .from(shareLink)
          .where(and(eq(shareLink.docId, docId), gt(shareLink.expiresAt, new Date())))
          .orderBy(asc(shareLink.createdAt))
      : [];

    // Only the owner sees other people's email addresses.
    const mask = (email: string, id: string) => (isOwner || id === me.id ? email : null);

    return {
      me: me.id,
      isOwner,
      mailEnabled: mailConfigured(),
      owner: { ...owner, email: mask(owner.email, owner.id) },
      members: members.map((m) => ({ ...m, email: mask(m.email, m.id) })),
      invites,
      links,
    };
  });
}

export async function inviteByEmail(input: { docId: string; email: string; role: string }) {
  return run("invite", { max: 20, seconds: 60 * 60 }, async (me) => {
    const data = z
      .object({ docId: docIdSchema, email: z.email().max(254).transform((e) => e.toLowerCase()), role })
      .parse({ ...input, email: input.email.trim() });
    const access = await requireAccess(data.docId, me.id, "owner");
    if (data.email === me.email.toLowerCase()) throw new Error("You already own this page.");

    const [{ total }] = await db.select({ total: count() }).from(invite).where(eq(invite.docId, data.docId));
    if (total >= 50) throw new Error("This page has too many pending invites. Cancel some first.");

    // Same result whether or not the address has an account, so nobody can use this to find out.
    // The invitation is claimed only by someone who has verified this exact address.
    const expiresAt = new Date(Date.now() + 14 * DAY);
    await db
      .insert(invite)
      .values({ id: newId(), docId: data.docId, email: data.email, role: data.role, invitedById: me.id, expiresAt })
      .onConflictDoUpdate({ target: [invite.docId, invite.email], set: { role: data.role, expiresAt } });

    let emailed = false;
    if (mailConfigured()) {
      try {
        await sendMail({
          to: data.email,
          subject: "You've been invited to a page on Huddle",
          intro: `${me.name} invited you to "${(access.doc.title || "Untitled").slice(0, 80)}" on Huddle as ${data.role === "editor" ? "an editor" : "a viewer"}. Sign up or sign in with this email address to open it.`,
          action: "Open Huddle",
          url: `${env.APP_URL}/app`,
          footer: "The invitation expires in 14 days. If you don't know the sender, ignore this email.",
        });
        emailed = true;
      } catch (error) {
        console.error(error);
      }
    }
    return { emailed };
  });
}

export async function cancelInvite(input: { docId: string; inviteId: string }) {
  return run("sharing", { max: 60, seconds: 60 }, async (me) => {
    const data = z.object({ docId: docIdSchema, inviteId: docIdSchema }).parse(input);
    await requireAccess(data.docId, me.id, "owner");
    await db.delete(invite).where(and(eq(invite.id, data.inviteId), eq(invite.docId, data.docId)));
    return {};
  });
}

export async function setMemberRole(input: { docId: string; userId: string; role: string }) {
  return run("sharing", { max: 60, seconds: 60 }, async (me): Promise<{ warning?: string }> => {
    const data = z.object({ docId: docIdSchema, userId, role }).parse(input);
    await requireAccess(data.docId, me.id, "owner");
    await db
      .update(member)
      .set({ role: data.role })
      .where(and(eq(member.docId, data.docId), eq(member.userId, data.userId)));
    revalidatePath("/app", "layout");
    return revokeLive(data.docId, data.userId);
  });
}

export async function removeMember(input: { docId: string; userId: string }) {
  return run("sharing", { max: 60, seconds: 60 }, async (me): Promise<{ warning?: string }> => {
    const data = z.object({ docId: docIdSchema, userId }).parse(input);
    await requireAccess(data.docId, me.id, "owner");
    await db.delete(member).where(and(eq(member.docId, data.docId), eq(member.userId, data.userId)));
    revalidatePath("/app", "layout");
    return revokeLive(data.docId, data.userId);
  });
}

export async function createShareLink(input: { docId: string; role: string }) {
  return run("share-link", { max: 20, seconds: 60 * 60 }, async (me) => {
    const data = z.object({ docId: docIdSchema, role }).parse(input);
    await requireAccess(data.docId, me.id, "owner");
    const [{ total }] = await db
      .select({ total: count() })
      .from(shareLink)
      .where(and(eq(shareLink.docId, data.docId), gt(shareLink.expiresAt, new Date())));
    if (total >= 10) throw new Error("This page already has 10 active links. Turn one off first.");

    const secret = newSecret();
    await db.insert(shareLink).values({
      id: newId(),
      docId: data.docId,
      tokenHash: hashSecret(secret),
      role: data.role,
      createdById: me.id,
      expiresAt: new Date(Date.now() + 7 * DAY),
    });
    // The secret sits after "#", which browsers never send to servers or put in referrers.
    return { url: `${env.APP_URL}/join#${secret}` };
  });
}

export async function revokeShareLink(input: { docId: string; linkId: string }) {
  return run("sharing", { max: 60, seconds: 60 }, async (me) => {
    const data = z.object({ docId: docIdSchema, linkId: docIdSchema }).parse(input);
    await requireAccess(data.docId, me.id, "owner");
    await db.delete(shareLink).where(and(eq(shareLink.id, data.linkId), eq(shareLink.docId, data.docId)));
    return {};
  });
}

export async function joinByLink(secretInput: string) {
  return run("join", { max: 10, seconds: 60 }, async (me) => {
    const secret = z.string().regex(/^[A-Za-z0-9_-]{43}$/).parse(secretInput);
    const [link] = await db
      .select({ docId: shareLink.docId, role: shareLink.role, ownerId: doc.ownerId, trashedAt: doc.trashedAt })
      .from(shareLink)
      .innerJoin(doc, eq(doc.id, shareLink.docId))
      .where(and(eq(shareLink.tokenHash, hashSecret(secret)), gt(shareLink.expiresAt, new Date())));
    if (!link || link.trashedAt) throw new Error("This link has expired or been turned off.");

    if (link.ownerId !== me.id) {
      await db
        .insert(member)
        .values({ docId: link.docId, userId: me.id, role: link.role })
        .onConflictDoUpdate({
          target: [member.docId, member.userId],
          set: { role: sql`CASE WHEN ${member.role} = 'editor' THEN 'editor' ELSE excluded.role END` },
        });
      await notifyRoom(link.docId);
    }
    revalidatePath("/app", "layout");
    return { docId: link.docId };
  });
}
