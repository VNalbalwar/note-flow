"use client";

import { useState } from "react";
import Link from "next/link";
import { Field, FormError, Heading } from "@/components/auth/parts";
import { authClient } from "@/lib/auth-client";

export function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <>
        <Heading title="Link expired">Reset links work once and last 30 minutes.</Heading>
        <Link href="/forgot-password" className="btn btn-solid mt-7 self-start">
          Get a new link
        </Link>
      </>
    );
  }
  if (done) {
    return (
      <>
        <Heading title="Password changed">You&apos;ve been signed out everywhere else. Sign in with the new password.</Heading>
        <Link href="/sign-in" className="btn btn-solid mt-7 self-start">
          Sign in
        </Link>
      </>
    );
  }
  return (
    <>
      <Heading title="New password" />
      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const { error: failed } = await authClient.resetPassword({ newPassword: password, token });
          setBusy(false);
          if (failed) setError(failed.message ?? "That didn't work. Ask for a new link.");
          else setDone(true);
        }}
      >
        <Field label="New password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 10 characters." />
        <FormError>{error}</FormError>
        <button type="submit" className="btn btn-solid w-full" disabled={busy}>
          {busy ? "Saving…" : "Save new password"}
        </button>
      </form>
    </>
  );
}
