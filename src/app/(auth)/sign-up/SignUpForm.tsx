"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { CheckInbox, Field, FormError, Heading } from "@/components/auth/parts";
import { Social } from "@/components/auth/Social";
import { authClient } from "@/lib/auth-client";
import { PEOPLE_INKS } from "@/lib/people";

const MIN = 10;

export function SignUpForm({ next, providers, mailEnabled }: { next: string; providers: { github: boolean; google: boolean }; mailEnabled: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN) return setError(`Use at least ${MIN} characters for your password.`);
    setBusy(true);
    setError("");
    const { error: failed } = await authClient.signUp.email({ name: name.trim(), email: email.trim(), password, callbackURL: next });
    setBusy(false);
    if (failed) setError(failed.status === 429 ? "Too many tries. Wait a few minutes." : (failed.message ?? "That didn't work. Try again."));
    else setSent(true);
  };

  if (sent) {
    return (
      <>
        <Heading title="Check your email" />
        <CheckInbox mailEnabled={mailEnabled}>
          We sent a link to <strong>{email}</strong>. Open it to confirm the address and start writing. If you already have an account, sign in instead.
        </CheckInbox>
        <Link href="/sign-in" className="btn btn-line mt-5 self-start">
          Go to sign in
        </Link>
      </>
    );
  }

  const filled = Math.min(5, Math.floor((password.length / MIN) * 4) + (password.length >= 16 ? 1 : 0));

  return (
    <>
      <Heading title="Join in">Free for you and everyone you invite.</Heading>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Your name" required maxLength={60} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} hint="Your teammates see this next to your cursor." />
        <Field label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field
          label="Password"
          type="password"
          required
          minLength={MIN}
          maxLength={128}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={
            <>
              <span aria-hidden="true" className="mb-1.5 flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.span key={i} className="tag h-1.5 flex-1 bg-wash-2" animate={{ backgroundColor: i < filled ? PEOPLE_INKS[[0, 5, 5, 2, 2][Math.max(0, filled - 1)]].ink : "var(--wash-2)" }} />
                ))}
              </span>
              At least {MIN} characters. A few random words work well. Passwords from known data breaches are refused.
            </>
          }
        />
        <FormError>{error}</FormError>
        <button type="submit" className="btn btn-solid w-full" disabled={busy}>
          {busy ? "Creating your account…" : "Create account"}
        </button>
      </form>
      <div className="mt-3">
        <Social providers={providers} next={next} onError={setError} />
      </div>
      <p className="mt-7 text-sm text-ink-2">
        Already have an account?{" "}
        <Link href={`/sign-in${next === "/app" ? "" : `?next=${encodeURIComponent(next)}`}`} className="font-bold underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
