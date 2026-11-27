import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";
import { getWorkspace } from "@/lib/server/workspace";
import { inkFor } from "@/lib/people";

export const metadata: Metadata = { title: "Your pages", robots: { index: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, docs } = await getWorkspace();
  return (
    <AppShell me={{ id: user.id, name: user.name, email: user.email, ink: inkFor(user.id).ink }} docs={docs}>
      {children}
    </AppShell>
  );
}
