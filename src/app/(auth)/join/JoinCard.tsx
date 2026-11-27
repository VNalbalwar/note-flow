"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { joinByLink } from "@/app/actions/sharing";
import { Heading } from "@/components/auth/parts";

const KEY = "huddle-join";
const HOUR = 60 * 60 * 1000;

function stored() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as { secret: string; at: number } | null;
    return saved && Date.now() - saved.at < HOUR ? saved.secret : "";
  } catch {
    return "";
  }
}

/**
 * The link's secret lives after "#", which never reaches a server. It's kept in
 * this browser while a new person signs up, then used once.
 */
export function JoinCard({ signedIn }: { signedIn: boolean }) {
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const fromUrl = window.location.hash.slice(1);
      const value = fromUrl || stored();
      if (fromUrl) {
        localStorage.setItem(KEY, JSON.stringify({ secret: fromUrl, at: Date.now() }));
        window.history.replaceState(null, "", "/join");
      }
      setSecret(value);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (secret === null) return <Heading title="Opening invite" />;
  if (!secret) {
    return (
      <>
        <Heading title="No invite here">Open the full link you were sent.</Heading>
        <Link href="/app" className="btn btn-solid mt-7 self-start">
          Go to your pages
        </Link>
      </>
    );
  }

  return (
    <>
      <Heading title="You're invited">Someone shared a Huddle page with you.</Heading>
      {error && (
        <p role="alert" className="mt-5 text-sm text-danger">
          {error}
        </p>
      )}
      {signedIn ? (
        <button
          type="button"
          className="btn btn-solid mt-8 self-start"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const result = await joinByLink(secret);
            if (!result.ok) {
              setBusy(false);
              setError(result.error);
              if (result.error.startsWith("This link")) localStorage.removeItem(KEY);
              return;
            }
            localStorage.removeItem(KEY);
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- reload the sidebar with the new page
            window.location.href = `/app/d/${result.docId}`;
          }}
        >
          {busy ? "Joining…" : "Join the page"}
        </button>
      ) : (
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/sign-up?next=%2Fjoin" className="btn btn-solid">
            Create an account
          </Link>
          <Link href="/sign-in?next=%2Fjoin" className="btn btn-line">
            Sign in
          </Link>
        </div>
      )}
    </>
  );
}
