import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { DocView } from "@/components/editor/DocView";
import { db } from "@/lib/db";
import { favorite } from "@/lib/db/schema";
import { claimInvites, getAccess } from "@/lib/server/access";
import { docIdSchema } from "@/lib/server/request";
import { requireUser } from "@/lib/server/session";
import { inkFor } from "@/lib/people";

export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const parsed = docIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  // An invitation link can land here before the layout has claimed it.
  await claimInvites(user);
  const access = await getAccess(parsed.data, user.id);
  if (!access) notFound();

  const [star] = await db
    .select({ docId: favorite.docId })
    .from(favorite)
    .where(and(eq(favorite.userId, user.id), eq(favorite.docId, access.doc.id)));

  return (
    <DocView
      // A role change gives the editor a fresh start with the new permissions.
      key={`${access.doc.id}:${access.role}`}
      docId={access.doc.id}
      role={access.role}
      title={access.doc.title}
      icon={access.doc.icon}
      favorite={Boolean(star)}
      trashed={Boolean(access.doc.trashedAt)}
      pendingTemplate={access.doc.pendingTemplate}
      me={{ id: user.id, name: user.name, ink: inkFor(user.id).ink }}
    />
  );
}
