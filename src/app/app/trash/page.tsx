import type { Metadata } from "next";
import { TrashView } from "@/components/app/TrashView";
import { listTrash } from "@/lib/server/docs";
import { requireUser } from "@/lib/server/session";

export const metadata: Metadata = { title: "Trash" };

export default async function TrashPage() {
  const user = await requireUser();
  return <TrashView items={await listTrash(user.id)} />;
}
