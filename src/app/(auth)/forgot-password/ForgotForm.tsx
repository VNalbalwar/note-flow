"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckInbox, Field, FormError, Heading } from "@/components/auth/parts";
import { authClient } from "@/lib/auth-client";

export function ForgotForm({ mailEnabled }: { mailEnabled: boolean }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Heading title="Reset it">Enter your email and we&apos;ll send a link to choose a new password.</Heading>
      {sent ? (
        // The same message whether or not an account exists.
        <CheckInbox mailEnabled={mailEnabled}>
          If <strong>{email}</strong> has an account, a reset link is on its way.
        </CheckInbox>
      ) : (
        <form
          className="mt-8 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const { error: failed } = await authClient.requestPasswordReset({ email: email.trim(), redirectTo: "/reset-password" });
            setBusy(false);
            if (failed?.status === 429) setError("Too many requests. Wait a few minutes.");
            else if (failed) setError("That didn't work. Try again.");
            else setSent(true);
          }}
        >
          <Field label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <FormError>{error}</FormError>
          <button type="submit" className="btn btn-solid w-full" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
      <Link href="/sign-in" className="mt-7 text-sm font-bold underline">
        Back to sign in
      </Link>
    </>
  );
}
