"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronsUpDown, Home, LogOut, Menu as MenuIcon, Plus, Search, Settings, Trash2, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Menu } from "@/components/ui/Menu";
import { Toaster } from "@/components/ui/Toasts";
import { authClient } from "@/lib/auth-client";
import { announceSignOut, onSignedOut, setSigningOut } from "@/lib/sign-out";
import type { DocSummary } from "@/lib/server/docs";
import { Avatar } from "./Avatar";
import { CommandPalette } from "./CommandPalette";
import { DocIcon } from "./DocIcon";
import { useCreatePage } from "./useCreatePage";

type Me = { id: string; name: string; email: string; ink: string };

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className="relative flex items-center gap-2.5 px-2.5 py-2 text-sm font-semibold">
      {active && <motion.span layoutId="nav-active" className="tag absolute inset-0 bg-sheet shadow-[var(--shadow)]" transition={{ type: "spring", stiffness: 460, damping: 36 }} />}
      {!active && <span className="tag absolute inset-0 transition-colors hover:bg-wash" />}
      <span className="pointer-events-none relative flex min-w-0 items-center gap-2.5">{children}</span>
    </Link>
  );
}

function PageGroup({ title, docs, path, empty }: { title: string; docs: DocSummary[]; path: string; empty?: string }) {
  if (!docs.length && !empty) return null;
  return (
    <section className="mt-5">
      <h2 className="px-2.5 pb-1.5 text-xs font-bold text-ink-3">{title}</h2>
      {!docs.length && <p className="px-2.5 text-sm leading-relaxed text-ink-3">{empty}</p>}
      <ul className="space-y-0.5">
        <AnimatePresence initial={false}>
          {docs.map((d) => (
            <motion.li key={d.id} layout initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
              <NavLink href={`/app/d/${d.id}`} active={path === `/app/d/${d.id}`}>
                <DocIcon id={d.id} icon={d.icon} size="sm" />
                <span className="truncate">{d.title || "Untitled"}</span>
              </NavLink>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}

export function AppShell({ me, docs, children }: { me: Me; docs: DocSummary[]; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const { create, creating } = useCreatePage();

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && !e.shiftKey) {
        // Inside the editor, Ctrl+K belongs to "add link" when text is selected.
        if ((e.target as HTMLElement).closest?.(".bn-editor") && !window.getSelection()?.isCollapsed) return;
        e.preventDefault();
        setPalette((v) => !v);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  useEffect(
    () =>
      // A full load, so this tab drops the names and pages it was still showing.
      onSignedOut(() => {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full load drops cached pages
        window.location.href = "/";
      }),
    [],
  );

  const [lastPath, setLastPath] = useState(path);
  if (lastPath !== path) {
    setLastPath(path);
    setDrawer(false);
  }

  const sidebar = (
    <div className="flex h-full flex-col px-3 pb-3 pt-4">
      <div className="flex items-center justify-between px-2">
        <Link href="/app" aria-label="Huddle home">
          <span className="wordmark">huddle</span>
        </Link>
        <ThemeToggle className="!size-9" />
      </div>

      <button type="button" className="btn btn-solid btn-sm mt-4 w-full" onClick={() => void create()} disabled={Boolean(creating)}>
        <Plus className="size-4" aria-hidden="true" />
        {creating === "blank" ? "Creating…" : "New page"}
      </button>
      <button type="button" onClick={() => setPalette(true)} className="field mt-2.5 flex !min-h-9 items-center gap-2 !py-1.5 text-left !text-sm text-ink-3">
        <Search className="size-4" aria-hidden="true" />
        <span className="flex-1">Search</span>
        <kbd className="font-mono text-[0.6875rem]">Ctrl K</kbd>
      </button>

      <nav aria-label="Pages" className="-mx-1 mt-4 min-h-0 flex-1 overflow-y-auto px-1">
        <NavLink href="/app" active={path === "/app"}>
          <Home className="size-[1.15rem]" aria-hidden="true" /> Home
        </NavLink>
        <PageGroup title="Favourites" docs={docs.filter((d) => d.favorite)} path={path} />
        <PageGroup title="My pages" docs={docs.filter((d) => d.owned && !d.favorite)} path={path} empty={docs.some((d) => d.owned) ? undefined : "Pages you create show up here."} />
        <PageGroup title="Shared with me" docs={docs.filter((d) => !d.owned && !d.favorite)} path={path} />
      </nav>

      <div className="mt-2 space-y-0.5 border-t border-line pt-2">
        <NavLink href="/app/trash" active={path === "/app/trash"}>
          <Trash2 className="size-[1.15rem]" aria-hidden="true" /> Trash
        </NavLink>
        <Menu
          label="Account menu"
          align="left"
          up
          triggerClassName="tag flex w-full items-center gap-2.5 px-2 py-2 text-left hover:bg-wash"
          trigger={
            <>
              <Avatar name={me.name} ink={me.ink} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{me.name}</span>
                <span className="block truncate text-xs text-ink-3">{me.email}</span>
              </span>
              <ChevronsUpDown className="size-4 text-ink-3" aria-hidden="true" />
            </>
          }
          items={[
            { label: "Account and security", icon: <Settings className="size-4" />, onSelect: () => router.push("/app/settings") },
            {
              label: "Sign out",
              icon: <LogOut className="size-4" />,
              onSelect: async () => {
                // Set first: live pages disconnect before the reply arrives.
                setSigningOut(true);
                const { error } = await authClient.signOut();
                if (error) setSigningOut(false);
                else announceSignOut();
                // A full load clears every cached page from memory.
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full load drops cached pages
                window.location.href = "/";
              },
            },
          ]}
        />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh">
      <a href="#content" className="tag sr-only z-50 bg-brand px-4 py-2 text-on-brand focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-line md:block print:!hidden">{sidebar}</aside>

      <button type="button" aria-label="Open menu" onClick={() => setDrawer(true)} className="raised tag fixed left-2.5 top-2 z-40 grid size-9 place-items-center md:hidden print:hidden">
        <MenuIcon className="size-5" aria-hidden="true" />
      </button>
      <AnimatePresence>
        {drawer && (
          <motion.div className="fixed inset-0 z-50 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label="Close menu" className="absolute inset-0 bg-[rgb(8_20_10/0.5)]" onClick={() => setDrawer(false)} />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="relative h-full w-[min(19rem,86vw)] bg-ground shadow-[var(--shadow-lift)]"
              onKeyDown={(e) => e.key === "Escape" && setDrawer(false)}
            >
              <button type="button" autoFocus aria-label="Close menu" onClick={() => setDrawer(false)} className="tag absolute -right-12 top-3 grid size-9 place-items-center bg-sheet">
                <X className="size-5" aria-hidden="true" />
              </button>
              {sidebar}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main id="content" className="flex min-w-0 flex-1 flex-col">
        {children}
      </main>

      <CommandPalette docs={docs} open={palette} onClose={() => setPalette(false)} />
      <Toaster />
    </div>
  );
}
