import type { Metadata } from "next";
import { safeNext } from "@/lib/safeNext";
import { TwoFactorForm } from "./TwoFactorForm";

export const metadata: Metadata = { title: "Two-step sign-in" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <TwoFactorForm next={safeNext((await searchParams).next)} />;
}
