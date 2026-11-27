import type { Metadata } from "next";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = { title: "Choose a new password", referrer: "no-referrer" };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  return <ResetForm token={error ? "" : (token ?? "")} />;
}
