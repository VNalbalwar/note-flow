"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Copy, Link2, Trash2, UserMinus } from "lucide-react";
import {
  cancelInvite,
  createShareLink,
  getSharing,
  inviteByEmail,
  removeMember,
  revokeShareLink,
  setMemberRole,
} from "@/app/actions/sharing";
import { leaveDocument } from "@/app/actions/docs";
import { Avatar } from "@/components/app/Avatar";
import { Dialog } from "@/components/ui/Dialog";
import { toast } from "@/components/ui/Toasts";
import { inkFor } from "@/lib/people";

type Sharing = Extract<Awaited<ReturnType<typeof getSharing>>, { ok: true }>;
type Role = "editor" | "viewer";

const day = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
const ROLE_LABEL: Record<Role, string> = { editor: "Can edit", viewer: "Can view" };

function RoleSelect({ value, onChange, label }: { value: Role; onChange: (role: Role) => void; label: string }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as Role)}
      className="field !min-h-9 !w-auto shrink-0 !py-1 !text-sm"
    >
      <option value="editor">{ROLE_LABEL.editor}</option>
      <option value="viewer">{ROLE_LABEL.viewer}</option>
    </select>
  );
}

function Person({ id, name, detail, children }: { id: string; name: string; detail?: string | null; children: React.ReactNode }) {
  return (
    <motion.li layout initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="flex items-center gap-3 py-2">
      <Avatar name={name} ink={inkFor(id).ink} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{name}</span>
        {detail && <span className="block truncate text-xs text-ink-3">{detail}</span>}
      </span>
      {children}
    </motion.li>
  );
}

export function ShareDialog({ docId, open, onClose }: { docId: string; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [data, setData] = useState<Sharing | null>(null);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [linkRole, setLinkRole] = useState<Role>("viewer");
  const [newLink, setNewLink] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const result = await getSharing(docId);
    if (result.ok) {
      setData(result);
      setError("");
    } else setError(result.error);
  }, [docId]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setNewLink("");
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, load]);

  const act = async (work: () => Promise<{ ok: boolean; error?: string; warning?: string }>, done: string) => {
    setBusy(true);
    try {
      const result = await work();
      if (!result.ok) toast.error(result.error ?? "Something went wrong.");
      else if (result.warning) toast.error(result.warning);
      else toast.done(done);
      await load();
      return result.ok;
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.done("Link copied");
    } catch {
      toast.error("Couldn't copy. Select the link and copy it yourself.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Share this page" description="Only people listed here can open it.">
      {error && <p className="text-sm text-danger">{error}</p>}
      {!data && !error && <p className="text-sm text-ink-3">Loading…</p>}
      {data && (
        <div className="space-y-6">
          {data.isOwner && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const address = email.trim();
                if (!address) return;
                const ok = await act(
                  () => inviteByEmail({ docId, email: address, role }),
                  data.mailEnabled ? "Invitation sent" : "Invitation saved. Tell them to sign in with that email.",
                );
                if (ok) setEmail("");
              }}
            >
              <label htmlFor="invite-email" className="mb-2 block text-sm font-semibold">
                Invite by email
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="invite-email"
                  type="email"
                  required
                  autoComplete="off"
                  className="field !w-auto min-w-40 flex-1"
                  placeholder="friend@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <RoleSelect value={role} onChange={setRole} label="What the invited person can do" />
                <button type="submit" className="btn btn-solid btn-sm" disabled={busy || !email.trim()}>
                  Invite
                </button>
              </div>
            </form>
          )}

          <section>
            <h3 className="mb-1 text-sm font-semibold">People with access</h3>
            <ul>
              <AnimatePresence initial={false}>
                <Person key={data.owner.id} id={data.owner.id} name={data.owner.id === data.me ? `${data.owner.name} (you)` : data.owner.name} detail={data.owner.email}>
                  <span className="text-sm text-ink-3">Owner</span>
                </Person>
                {data.members.map((m) => (
                  <Person key={m.id} id={m.id} name={m.id === data.me ? `${m.name} (you)` : m.name} detail={m.email}>
                    {data.isOwner ? (
                      <>
                        <RoleSelect
                          value={m.role}
                          label={`What ${m.name} can do`}
                          onChange={(next) => act(() => setMemberRole({ docId, userId: m.id, role: next }), `${m.name} ${next === "editor" ? "can edit now" : "can only view now"}`)}
                        />
                        <button
                          type="button"
                          aria-label={`Remove ${m.name}`}
                          title="Remove"
                          disabled={busy}
                          onClick={() => act(() => removeMember({ docId, userId: m.id }), `${m.name} was removed`)}
                          className="tag grid size-9 shrink-0 place-items-center text-danger hover:bg-wash"
                        >
                          <UserMinus className="size-4" aria-hidden="true" />
                        </button>
                      </>
                    ) : (
                      <span className="text-sm text-ink-3">{ROLE_LABEL[m.role]}</span>
                    )}
                  </Person>
                ))}
                {data.invites.map((i) => (
                  <Person key={i.id} id={i.email} name={i.email} detail={`Invited, ${ROLE_LABEL[i.role].toLowerCase()}. Waiting for them to sign in.`}>
                    <button
                      type="button"
                      className="btn btn-line btn-sm"
                      disabled={busy}
                      onClick={() => act(() => cancelInvite({ docId, inviteId: i.id }), "Invitation cancelled")}
                    >
                      Cancel
                    </button>
                  </Person>
                ))}
              </AnimatePresence>
            </ul>
          </section>

          {data.isOwner ? (
            <section>
              <h3 className="text-sm font-semibold">Share a link</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-3">
                Anyone with the link who signs in can join. It works for 7 days. Turning it off doesn&apos;t remove people who already joined.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <RoleSelect value={linkRole} onChange={setLinkRole} label="What people joining by link can do" />
                <button
                  type="button"
                  className="btn btn-line btn-sm"
                  disabled={busy}
                  onClick={async () => {
                    const result = await createShareLink({ docId, role: linkRole });
                    if (!result.ok) return toast.error(result.error);
                    setNewLink(result.url);
                    await load();
                  }}
                >
                  <Link2 className="size-4" aria-hidden="true" /> Create link
                </button>
              </div>
              {newLink && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
                  <div className="flex gap-2">
                    <input readOnly aria-label="New share link" className="field !min-h-9 !text-xs" value={newLink} onFocus={(e) => e.target.select()} />
                    <button type="button" className="btn btn-solid btn-sm shrink-0" onClick={() => copy(newLink)}>
                      <Copy className="size-4" aria-hidden="true" /> Copy
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-ink-3">Copy it now. For safety it can&apos;t be shown again.</p>
                </motion.div>
              )}
              {data.links.length > 0 && (
                <ul className="mt-3">
                  {data.links.map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                      <span>
                        {ROLE_LABEL[l.role]} link, ends {day.format(new Date(l.expiresAt))}
                      </span>
                      <button
                        type="button"
                        className="tag flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-danger hover:bg-wash"
                        onClick={() => act(() => revokeShareLink({ docId, linkId: l.id }), "Link turned off")}
                      >
                        <Trash2 className="size-4" aria-hidden="true" /> Turn off
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={busy}
              onClick={async () => {
                const result = await leaveDocument(docId);
                if (!result.ok) return toast.error(result.error);
                toast.done("You left the page");
                router.push("/app");
              }}
            >
              Leave this page
            </button>
          )}
        </div>
      )}
    </Dialog>
  );
}
