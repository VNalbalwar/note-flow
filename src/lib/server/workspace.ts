import "server-only";
import { cache } from "react";
import { claimInvites } from "./access";
import { listDocs } from "./docs";
import { requireUser } from "./session";

/**
 * The signed-in person and their pages. Layouts and pages render at the same
 * time, so waiting invitations are claimed here, once, before anything is listed.
 */
export const getWorkspace = cache(async () => {
  const user = await requireUser();
  await claimInvites(user);
  return { user, docs: await listDocs(user.id) };
});
