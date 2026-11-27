import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { enabledProviders } from "@/lib/server/auth";
import { mailConfigured } from "@/lib/server/mail";
import { getSession } from "@/lib/server/session";
import { safeNext } from "@/lib/safeNext";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const query = await searchParams;
  const next = safeNext(query.next);
  if (await getSession()) redirect(next);
  return <SignInForm next={next} providers={enabledProviders()} mailEnabled={mailConfigured()} linkError={Boolean(query.error)} />;
}
