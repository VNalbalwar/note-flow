"use client";

import { useState } from "react";
import Link from "next/link";
import { Field, FormError, Heading } from "@/components/auth/parts";
import { authClient } from "@/lib/auth-client";

export function TwoFactorForm({ next }: { next: string }) {
  const [backup, setBackup] = useState(false);
  const [code, setCode] = useState("");
  const [trust, setTrust] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Heading title="Second step">{backup ? "Enter one of your backup codes. Each works once." : "Enter the 6-digit code from your authenticator app."}</Heading>
      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const value = code.trim();
          const { error: failed } = backup
            ? await authClient.twoFactor.verifyBackupCode({ code: value, trustDevice: trust })
            : await authClient.twoFactor.verifyTotp({ code: value.replace(/\s/g, ""), trustDevice: trust });
          if (failed) {
            setBusy(false);
            setError(failed.status === 429 ? "Too many tries. Wait a minute." : "That code didn't work. Check it and try again.");
          } else window.location.href = next;
        }}
      >
        <Field
          key={String(backup)}
          label={backup ? "Backup code" : "Code"}
          required
          autoFocus
          inputMode={backup ? "text" : "numeric"}
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={trust} onChange={(e) => setTrust(e.target.checked)} />
          Don&apos;t ask on this device for 30 days
        </label>
        <FormError>{error}</FormError>
        <button type="submit" className="btn btn-solid w-full" disabled={busy || !code.trim()}>
          {busy ? "Checking…" : "Continue"}
        </button>
      </form>
      <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm font-bold">
        <button
          type="button"
          className="underline"
          onClick={() => {
            setBackup((v) => !v);
            setCode("");
            setError("");
          }}
        >
          {backup ? "Use the authenticator app" : "Use a backup code"}
        </button>
        <Link href="/sign-in" className="underline">
          Start over
        </Link>
      </div>
    </>
  );
}
