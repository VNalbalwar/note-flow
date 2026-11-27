import type { Metadata } from "next";
import { getSession } from "@/lib/server/session";
import { JoinCard } from "./JoinCard";

export const metadata: Metadata = { title: "Join a page", referrer: "no-referrer", robots: { index: false } };

export default async function Page() {
  return <JoinCard signedIn={Boolean(await getSession())} />;
}
