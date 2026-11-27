"use client";

import { useState } from "react";
import Link from "next/link";
import { Fingerprint } from "lucide-react";
import { CheckInbox, Field, FormError, Heading } from "@/components/auth/parts";
import { Social } from "@/components/auth/Social";
import { authClient } from "@/lib/auth-client";

export function SignInForm({ next, providers, mailEnabled, linkError }: { next: string; providers: { github: boolean; google: boolean }; mailEnabled: boolean; linkError: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(linkError ? "That link has expired or was already used. Sign in to get a new one." : "");
  const [busy, setBusy] = useState(false);
  const [unverified, setUnverified] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { data, error: failed } = await authClient.signIn.email({ email: email.trim(), password, callbackURL: next });
    if (failed) {
      setBusy(false);
      if (failed.code === "EMAIL_NOT_VERIFIED") return setUnverified(true);
      return setError(failed.status === 429 ? "Too many tries. Wait a minute and try again." : (failed.message ?? "Sign-in failed."));
    }
    // With two-step sign-in on, the auth client moves to the code screen itself.
    if (data && !("twoFactorRedirect" in data)) window.location.href = next;
  };

  const withPasskey = async () => {
    setError("");
    const result = await authClient.signIn.passkey();
    if (result?.error) setError("That passkey sign-in didn't finish. Try again or use your password.");
    else window.location.href = next;
  };

  if (unverified) {
    return (
      <>
        <Heading title="One more step" />
        <CheckInbox mailEnabled={mailEnabled}>
          Confirm <strong>{email}</strong> before signing in. We just sent a fresh link.
        </CheckInbox>
        <button type="button" className="btn btn-line mt-5" onClick={() => setUnverified(false)}>
          Back to sign in
        </button>
      </>
    );
  }

  return (
    <>
      <Heading title="Welcome back">Your pages are where you left them.</Heading>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Email" type="email" required autoComplete="username webauthn" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={
            <Link href="/forgot-password" className="font-semibold underline">
              Forgot your password?
            </Link>
          }
        />
        <FormError>{error}</FormError>
        <button type="submit" className="btn btn-solid w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="mt-3 grid gap-2.5">
        <button type="button" className="btn btn-line" onClick={withPasskey}>
          <Fingerprint className="size-5" aria-hidden="true" /> Sign in with a passkey
        </button>
        <Social providers={providers} next={next} onError={setError} />
      </div>
      <p className="mt-7 text-sm text-ink-2">
        New here?{" "}
        <Link href={`/sign-up${next === "/app" ? "" : `?next=${encodeURIComponent(next)}`}`} className="font-bold underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
