"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Fingerprint, KeyRound, Laptop, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { renderSVG } from "uqr";
import { listDevices, signOutDevice, signOutOtherDevices } from "@/app/actions/account";
import { Field, FormError } from "@/components/auth/parts";
import { Dialog } from "@/components/ui/Dialog";
import { toast } from "@/components/ui/Toasts";
import { authClient } from "@/lib/auth-client";
import { Avatar } from "./Avatar";

type Props = {
  me: { name: string; email: string; ink: string };
  twoFactorEnabled: boolean;
  hasPassword: boolean;
};

type AuthError = { message?: string; code?: string; status?: number } | null | undefined;

function explain(error: AuthError, fallback: string) {
  if (error?.code === "SESSION_NOT_FRESH") return "For your safety, sign out and back in, then try this again.";
  if (error?.status === 429) return "Too many tries. Wait a minute.";
  return error?.message ?? fallback;
}

function Section({ title, about, children }: { title: string; about: string; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ type: "spring", stiffness: 180, damping: 24 }} className="grid gap-4 border-t border-line py-9 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 className="display-tight text-2xl">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">{about}</p>
      </div>
      <div className="raised sheet max-w-2xl p-5 sm:p-6">{children}</div>
    </motion.section>
  );
}

function Profile({ me }: { me: Props["me"] }) {
  const router = useRouter();
  const [name, setName] = useState(me.name);
  const [busy, setBusy] = useState(false);
  return (
    <Section title="Profile" about="Your name appears next to your cursor and on your comments.">
      <form
        className="flex flex-wrap items-end gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const { error } = await authClient.updateUser({ name: name.trim() });
          setBusy(false);
          if (error) return toast.error(explain(error, "Couldn't save your name."));
          toast.done("Name saved");
          router.refresh();
        }}
      >
        <Avatar name={name || me.name} ink={me.ink} size={56} />
        <div className="min-w-48 flex-1">
          <Field label="Name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-solid" disabled={busy || !name.trim() || name === me.name}>
          Save
        </button>
      </form>
      <p className="mt-4 text-sm text-ink-3">Signed in as {me.email}. This colour is yours on every page.</p>
    </Section>
  );
}

function Password({ me, hasPassword }: Props) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Section title="Password" about="Changing it signs you out on your other devices.">
      {hasPassword ? (
        <form
          className="max-w-sm space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const result = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
            if (result.error) setError(explain(result.error, "Couldn't change the password."));
            else {
              await signOutOtherDevices();
              setCurrent("");
              setNext("");
              toast.done("Password changed");
            }
            setBusy(false);
          }}
        >
          <Field label="Current password" type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          <Field label="New password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} hint="At least 10 characters." />
          <FormError>{error}</FormError>
          <button type="submit" className="btn btn-solid" disabled={busy}>
            {busy ? "Changing…" : "Change password"}
          </button>
        </form>
      ) : (
        <>
          <p className="text-sm leading-relaxed">You sign in with a connected account. To add a password as well, we&apos;ll email you a link.</p>
          <button
            type="button"
            className="btn btn-line mt-4"
            onClick={async () => {
              const { error: failed } = await authClient.requestPasswordReset({ email: me.email, redirectTo: "/reset-password" });
              if (failed) toast.error(explain(failed, "Couldn't send the link."));
              else toast.done("Check your email for the link");
            }}
          >
            Email me a link
          </button>
        </>
      )}
    </Section>
  );
}

function TwoStep({ twoFactorEnabled, hasPassword }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [setup, setSetup] = useState<{ uri: string; codes: string[] } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(twoFactorEnabled);

  const secret = setup ? new URL(setup.uri).searchParams.get("secret") : "";

  return (
    <Section title="Two-step codes" about="After your password, you'll enter a code from an app like Aegis, Google Authenticator or 1Password.">
      {enabled && !setup && (
        <p className="mb-4 flex items-center gap-2 font-semibold">
          <ShieldCheck className="size-5 text-brand" aria-hidden="true" /> Two-step sign-in is on.
        </p>
      )}
      <AnimatePresence mode="wait">
        {!setup ? (
          <motion.form
            key="start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-sm space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const secretInput = hasPassword ? { password } : {};
              if (enabled) {
                const result = await authClient.twoFactor.disable(secretInput);
                if (result.error) setError(explain(result.error, "Couldn't turn it off."));
                else {
                  setEnabled(false);
                  toast.done("Two-step sign-in is off");
                  router.refresh();
                }
              } else {
                const result = await authClient.twoFactor.enable(secretInput);
                if (result.error || !result.data || !("totpURI" in result.data)) setError(explain(result.error, "Couldn't start setup."));
                else setSetup({ uri: result.data.totpURI as string, codes: (result.data.backupCodes as string[]) ?? [] });
              }
              setPassword("");
              setBusy(false);
            }}
          >
            {hasPassword && <Field label="Confirm your password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
            <FormError>{error}</FormError>
            <button type="submit" className={`btn ${enabled ? "btn-danger" : "btn-solid"}`} disabled={busy}>
              {enabled ? "Turn off two-step codes" : "Set up two-step codes"}
            </button>
          </motion.form>
        ) : (
          <motion.div key="setup" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-sm font-semibold">1. Scan this with your authenticator app</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- generated in the browser, nothing to optimise */}
            <img alt="QR code for your authenticator app" width={176} height={176} className="mt-3 rounded-xl bg-white p-2" src={`data:image/svg+xml,${encodeURIComponent(renderSVG(setup.uri))}`} />
            <p className="mt-2 break-all text-xs text-ink-3">
              Can&apos;t scan? Enter this key: <span className="font-mono text-ink">{secret}</span>
            </p>
            <p className="mt-6 text-sm font-semibold">2. Save these backup codes somewhere safe. They won&apos;t be shown again.</p>
            <ul className="sheet mt-2 grid grid-cols-2 gap-x-4 gap-y-1 bg-wash p-4 font-mono text-sm">
              {setup.codes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <button
              type="button"
              className="btn btn-line btn-sm mt-2"
              onClick={() => navigator.clipboard.writeText(setup.codes.join("\n")).then(() => toast.done("Backup codes copied"))}
            >
              <Copy className="size-4" aria-hidden="true" /> Copy codes
            </button>
            <form
              className="mt-6 max-w-sm space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                const result = await authClient.twoFactor.verifyTotp({ code: code.replace(/\s/g, "") });
                setBusy(false);
                if (result.error) return setError(explain(result.error, "That code didn't match."));
                setSetup(null);
                setCode("");
                setEnabled(true);
                toast.done("Two-step sign-in is on");
                router.refresh();
              }}
            >
              <Field label="3. Enter the 6-digit code it shows" required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
              <FormError>{error}</FormError>
              <button type="submit" className="btn btn-solid" disabled={busy || !code.trim()}>
                <Check className="size-4" aria-hidden="true" /> Turn it on
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </Section>
  );
}

function Passkeys() {
  const { data, isPending, refetch } = authClient.useListPasskeys();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Section title="Passkeys" about="Sign in with your fingerprint, face or device PIN. Nothing to type, and nothing a fake website can steal.">
      {!isPending && !data?.length && <p className="text-sm text-ink-3">No passkeys yet.</p>}
      <ul className="space-y-2">
        {data?.map((p) => (
          <li key={p.id} className="flex items-center gap-3">
            <KeyRound className="size-5 text-brand" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name || "Passkey"}</span>
            <button
              type="button"
              aria-label={`Remove passkey ${p.name || ""}`}
              className="tag grid size-9 place-items-center text-danger hover:bg-wash"
              onClick={async () => {
                const { error } = await authClient.passkey.deletePasskey({ id: p.id });
                if (error) return toast.error(explain(error, "Couldn't remove it."));
                toast.done("Passkey removed");
                void refetch();
              }}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-4 flex flex-wrap items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const result = await authClient.passkey.addPasskey({ name: name.trim() || "My device" });
          setBusy(false);
          if (result?.error) return toast.error(explain(result.error, "The passkey wasn't added."));
          setName("");
          toast.done("Passkey added");
          void refetch();
        }}
      >
        <div className="min-w-48 flex-1">
          <Field label="Name for this passkey" maxLength={40} placeholder="My laptop" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-solid" disabled={busy}>
          <Fingerprint className="size-5" aria-hidden="true" /> Add passkey
        </button>
      </form>
    </Section>
  );
}

type Device = Extract<Awaited<ReturnType<typeof listDevices>>, { ok: true }>["devices"][number];

function describe(agent: string | null) {
  const a = agent ?? "";
  const browser = /Edg\//.test(a) ? "Edge" : /Firefox\//.test(a) ? "Firefox" : /Chrome\//.test(a) ? "Chrome" : /Safari\//.test(a) ? "Safari" : "A browser";
  const system = /Android/.test(a) ? "Android" : /iPhone|iPad/.test(a) ? "iOS" : /Windows/.test(a) ? "Windows" : /Mac OS/.test(a) ? "macOS" : /Linux/.test(a) ? "Linux" : "an unknown device";
  return { text: `${browser} on ${system}`, phone: /Android|iPhone/.test(a) };
}

function Devices() {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const load = useCallback(async () => {
    const result = await listDevices();
    if (result.ok) setDevices(result.devices);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const act = async (work: () => Promise<{ ok: boolean; error?: string }>, done: string) => {
    const result = await work();
    if (result.ok) toast.done(done);
    else toast.error(result.error ?? "That didn't work.");
    await load();
  };

  return (
    <Section title="Devices" about="Everywhere your account is signed in. Sign out anything you don't recognise, then change your password.">
      {devices === null && <p className="text-sm text-ink-3">Loading devices…</p>}
      <ul className="space-y-3">
        <AnimatePresence initial={false}>
          {devices?.map((d) => {
            const info = describe(d.userAgent);
            const Icon = info.phone ? Smartphone : Laptop;
            return (
              <motion.li key={d.id} layout exit={{ opacity: 0, x: 40 }} className="flex items-center gap-3">
                <Icon className="size-5 shrink-0 text-ink-2" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{info.text}</span>
                  <span className="block truncate text-xs text-ink-3">
                    {d.ipAddress ? `${d.ipAddress}, ` : ""}last active {new Date(d.updatedAt).toLocaleDateString()}
                  </span>
                </span>
                {d.current ? (
                  <span className="tag bg-wash px-3 py-1 text-xs font-bold">This device</span>
                ) : (
                  <button type="button" className="btn btn-line btn-sm" onClick={() => act(() => signOutDevice(d.id), "Device signed out")}>
                    Sign out
                  </button>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      {(devices?.length ?? 0) > 1 && (
        <button type="button" className="btn btn-line btn-sm mt-5" onClick={() => act(signOutOtherDevices, "Signed out everywhere else")}>
          Sign out all other devices
        </button>
      )}
    </Section>
  );
}

function Danger({ hasPassword }: Props) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Section title="Delete account" about="Erases your account and every page you own, for everyone.">
      <button type="button" className="btn btn-danger" onClick={() => setOpen(true)}>
        Delete my account
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Delete your account?" description="All pages you own, with their comments, images and history, will be erased for everyone on them. This can't be undone.">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const { error: failed } = await authClient.deleteUser(hasPassword ? { password } : {});
            if (failed) {
              setBusy(false);
              setError(explain(failed, "Your account wasn't deleted."));
            } else {
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full load drops cached pages
              window.location.href = "/";
            }
          }}
        >
          {hasPassword && <Field label="Your password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
          <FormError>{error}</FormError>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-line btn-sm" onClick={() => setOpen(false)}>
              Keep my account
            </button>
            <button type="submit" className="btn btn-danger btn-sm" disabled={busy}>
              {busy ? "Deleting…" : "Delete everything"}
            </button>
          </div>
        </form>
      </Dialog>
    </Section>
  );
}

export function SettingsView(props: Props) {
  return (
    <div className="flex-1 px-4 pb-20 pt-16 sm:px-8 md:pt-12 lg:px-12">
      <h1 className="display mb-8 text-5xl sm:text-6xl">Your account</h1>
      <Profile me={props.me} />
      <Password {...props} />
      <TwoStep {...props} />
      <Passkeys />
      <Devices />
      <Danger {...props} />
    </div>
  );
}
