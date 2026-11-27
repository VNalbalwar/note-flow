import type { Metadata } from "next";
import { mailConfigured } from "@/lib/server/mail";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = { title: "Reset your password" };

export default function Page() {
  return <ForgotForm mailEnabled={mailConfigured()} />;
}
