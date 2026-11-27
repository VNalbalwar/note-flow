"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { FilePlus2, LayoutGrid, Search, Settings, Trash2 } from "lucide-react";
import type { DocSummary } from "@/lib/server/docs";
import { TEMPLATES } from "@/lib/templates";
import { DocIcon } from "./DocIcon";
import { useCreatePage } from "./useCreatePage";

type Entry = { key: string; label: string; detail?: string; icon: React.ReactNode; run: () => void };

/** Jump to any page or action from the keyboard (Ctrl or Cmd + K). */
export function CommandPalette({ docs, open, onClose }: { docs: DocSummary[]; open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const { create } = useCreatePage();
  const [query, setQuery] = useState("");
  const [at, setAt] = useState(0);
  const [found, setFound] = useState<DocSummary[]>([]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Search inside page text on the server.
  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) return;
    const abort = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.slice(0, 80))}`, { signal: abort.signal });
        if (res.ok) setFound(((await res.json()) as { results: DocSummary[] }).results);
      } catch {
        // A newer search replaced this one.
      }
    }, 220);
    return () => {
      abort.abort();
      window.clearTimeout(timer);
    };
  }, [query, open]);

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (text: string) => text.toLowerCase().includes(q);
    const go = (path: string) => () => router.push(path);

    const local = docs.filter((d) => matches(d.title || "Untitled"));
    const remote = q.length >= 2 ? found.filter((d) => !local.some((l) => l.id === d.id)) : [];
    const pages: Entry[] = [...local, ...remote].slice(0, 8).map((d) => ({
      key: d.id,
      label: d.title || "Untitled",
      detail: remote.includes(d) ? "Found in the page text" : d.owned ? undefined : `Shared by ${d.ownerName}`,
      icon: <DocIcon id={d.id} icon={d.icon} size="sm" />,
      run: go(`/app/d/${d.id}`),
    }));

    const actions: Entry[] = [
      { key: "new", label: "New blank page", icon: <FilePlus2 className="size-5" />, run: () => void create() },
      ...TEMPLATES.map((t) => ({
        key: `t-${t.id}`,
        label: `New ${t.title.toLowerCase()}`,
        icon: <LayoutGrid className="size-5" />,
        run: () => void create(t.id),
      })),
      { key: "settings", label: "Account and security settings", icon: <Settings className="size-5" />, run: go("/app/settings") },
      { key: "trash", label: "Open trash", icon: <Trash2 className="size-5" />, run: go("/app/trash") },
    ].filter((a) => matches(a.label));

    return [...pages, ...actions.slice(0, q ? 9 : 4)];
  }, [query, docs, found, router, create]);

  const selected = Math.min(at, Math.max(0, entries.length - 1));
  const choose = (entry?: Entry) => {
    if (!entry) return;
    onClose();
    entry.run();
  };

  return (
    <dialog
      ref={ref}
      aria-label="Search and commands"
      onClose={() => {
        setQuery("");
        setAt(0);
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      className="huddle-dialog sheet !mt-[12vh] w-[min(36rem,calc(100vw-1.5rem))]"
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="size-5 text-ink-3" aria-hidden="true" />
        <input
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={entries[selected] ? `palette-${entries[selected].key}` : undefined}
          placeholder="Search pages or type a command"
          className="h-14 w-full bg-transparent text-base outline-none"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setAt(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setAt((selected + 1) % Math.max(1, entries.length));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setAt((selected - 1 + entries.length) % Math.max(1, entries.length));
            } else if (e.key === "Enter") {
              e.preventDefault();
              choose(entries[selected]);
            }
          }}
        />
      </div>
      <ul id="palette-list" role="listbox" className="max-h-[52vh] overflow-y-auto p-2">
        {entries.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-3">Nothing matches that.</li>}
        {entries.map((entry, i) => (
          <li key={entry.key} id={`palette-${entry.key}`} role="option" aria-selected={i === selected} className="relative">
            {i === selected && <motion.span layoutId="palette-active" className="tag absolute inset-0 bg-wash" transition={{ type: "spring", stiffness: 600, damping: 42 }} />}
            <button type="button" tabIndex={-1} onPointerMove={() => setAt(i)} onClick={() => choose(entry)} className="relative flex w-full items-center gap-3 px-3 py-2.5 text-left">
              <span className="grid size-6 place-items-center">{entry.icon}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{entry.label}</span>
              {entry.detail && <span className="shrink-0 text-xs text-ink-3">{entry.detail}</span>}
            </button>
          </li>
        ))}
      </ul>
    </dialog>
  );
}
