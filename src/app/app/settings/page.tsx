import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { SettingsView } from "@/components/app/SettingsView";
import { db } from "@/lib/db";
import { account } from "@/lib/db/schema";
import { requireUser } from "@/lib/server/session";
import { inkFor } from "@/lib/people";

export const metadata: Metadata = { title: "Account and security" };

export default async function SettingsPage() {
  const user = await requireUser();
  const password = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, user.id), eq(account.providerId, "credential")))
    .limit(1);
  return (
    <SettingsView
      me={{ name: user.name, email: user.email, ink: inkFor(user.id).ink }}
      twoFactorEnabled={Boolean((user as { twoFactorEnabled?: boolean }).twoFactorEnabled)}
      hasPassword={password.length > 0}
    />
  );
}
