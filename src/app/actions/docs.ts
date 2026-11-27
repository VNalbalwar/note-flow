"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { doc, favorite, member } from "@/lib/db/schema";
import { requireAccess } from "@/lib/server/access";
import { newId } from "@/lib/server/ids";
import { docIdSchema } from "@/lib/server/request";
import { disconnect, notifyRoom, purgeRoom } from "@/lib/server/sync";
import { TEMPLATE_IDS, templateById } from "@/lib/templates";
import { run } from "./run";

const MAX_OWNED_PAGES = 500;

export async function createDocument(input: { template?: string } = {}) {
  return run("create-page", { max: 30, seconds: 60 }, async (me) => {
    const { template } = z.object({ template: z.enum(TEMPLATE_IDS).optional() }).parse(input);
    const [{ total }] = await db.select({ total: count() }).from(doc).where(eq(doc.ownerId, me.id));
    if (total >= MAX_OWNED_PAGES) throw new Error(`You can own up to ${MAX_OWNED_PAGES} pages. Delete some first.`);

    const preset = template ? templateById(template) : undefined;
    const id = newId();
    await db.insert(doc).values({
      id,
      ownerId: me.id,
      title: preset?.title ?? "",
      icon: preset?.icon ?? null,
      pendingTemplate: preset ? preset.id : null,
    });
    revalidatePath("/app", "layout");
    return { id };
  });
}

const detailsSchema = z.object({
  id: docIdSchema,
  title: z.string().max(160),
  icon: z.string().max(24).nullable(),
});

export async function updateDetails(input: z.input<typeof detailsSchema>) {
  return run("rename", { max: 120, seconds: 60 }, async (me) => {
    const { id, title, icon } = detailsSchema.parse(input);
    await requireAccess(id, me.id, "editor");
    await db.update(doc).set({ title: title.trim(), icon }).where(eq(doc.id, id));
    await notifyRoom(id);
    revalidatePath("/app", "layout");
    return {};
  });
}

export async function saveSearchText(input: { id: string; text: string }) {
  return run("index", { max: 60, seconds: 60 }, async (me) => {
    const { id, text } = z.object({ id: docIdSchema, text: z.string().max(200_000) }).parse(input);
    await requireAccess(id, me.id, "editor");
    await db.update(doc).set({ searchText: text.slice(0, 50_000) }).where(eq(doc.id, id));
    return {};
  });
}

export async function finishTemplate(id: string) {
  return run("template", { max: 30, seconds: 60 }, async (me) => {
    await requireAccess(docIdSchema.parse(id), me.id, "editor");
    await db.update(doc).set({ pendingTemplate: null }).where(eq(doc.id, id));
    return {};
  });
}

export async function setFavorite(input: { id: string; on: boolean }) {
  return run("favorite", { max: 60, seconds: 60 }, async (me) => {
    const { id, on } = z.object({ id: docIdSchema, on: z.boolean() }).parse(input);
    await requireAccess(id, me.id, "viewer");
    if (on) await db.insert(favorite).values({ userId: me.id, docId: id }).onConflictDoNothing();
    else await db.delete(favorite).where(and(eq(favorite.userId, me.id), eq(favorite.docId, id)));
    revalidatePath("/app", "layout");
    return {};
  });
}

export async function trashDocument(id: string) {
  return run("trash", { max: 60, seconds: 60 }, async (me) => {
    await requireAccess(docIdSchema.parse(id), me.id, "owner");
    await db.update(doc).set({ trashedAt: new Date() }).where(eq(doc.id, id));
    // Everyone is disconnected; on reconnect only the owner gets back in.
    await disconnect(id).catch(() => {});
    revalidatePath("/app", "layout");
    return {};
  });
}

export async function restoreDocument(id: string) {
  return run("restore", { max: 60, seconds: 60 }, async (me) => {
    await requireAccess(docIdSchema.parse(id), me.id, "owner");
    await db.update(doc).set({ trashedAt: null }).where(eq(doc.id, id));
    revalidatePath("/app", "layout");
    return {};
  });
}

export async function deleteForever(id: string) {
  return run("delete", { max: 60, seconds: 60 }, async (me) => {
    const { doc: row } = await requireAccess(docIdSchema.parse(id), me.id, "owner");
    if (!row.trashedAt) throw new Error("Move the page to the trash first.");
    // Contents go first: if this fails, the page stays listed and can be retried.
    await purgeRoom(id);
    await db.delete(doc).where(eq(doc.id, id));
    revalidatePath("/app", "layout");
    return {};
  });
}

export async function leaveDocument(id: string) {
  return run("leave", { max: 30, seconds: 60 }, async (me) => {
    await requireAccess(docIdSchema.parse(id), me.id, "viewer");
    await db.delete(member).where(and(eq(member.docId, id), eq(member.userId, me.id)));
    await db.delete(favorite).where(and(eq(favorite.docId, id), eq(favorite.userId, me.id)));
    await disconnect(id, me.id).catch(() => {});
    revalidatePath("/app", "layout");
    return {};
  });
}
