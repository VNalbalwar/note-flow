"use client";

import { authClient } from "@/lib/auth-client";

export function Social({ providers, next, onError }: { providers: { github: boolean; google: boolean }; next: string; onError: (m: string) => void }) {
  const list = (["github", "google"] as const).filter((p) => providers[p]);
  if (!list.length) return null;
  return (
    <div className="grid gap-2.5">
      {list.map((provider) => (
        <button
          key={provider}
          type="button"
          className="btn btn-line"
          onClick={async () => {
            const { error } = await authClient.signIn.social({ provider, callbackURL: next, errorCallbackURL: "/sign-in?error=social" });
            if (error) onError(error.message ?? "That sign-in didn't work.");
          }}
        >
          Continue with {provider === "github" ? "GitHub" : "Google"}
        </button>
      ))}
    </div>
  );
}
