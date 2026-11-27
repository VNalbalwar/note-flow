import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { enabledProviders } from "@/lib/server/auth";
import { mailConfigured } from "@/lib/server/mail";
import { getSession } from "@/lib/server/session";
import { safeNext } from "@/lib/safeNext";
import { SignUpForm } from "./SignUpForm";

export const metadata: Metadata = { title: "Create your account" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getSession()) redirect(next);
  return <SignUpForm next={next} providers={enabledProviders()} mailEnabled={mailConfigured()} />;
}
