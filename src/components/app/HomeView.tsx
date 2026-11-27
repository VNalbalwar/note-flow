"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { FilePlus2, Star } from "lucide-react";
import type { DocSummary } from "@/lib/server/docs";
import { TEMPLATES, type TemplateBlock } from "@/lib/templates";
import { Aurora } from "@/components/landing/Aurora";
import { PEOPLE_INKS } from "@/lib/people";
import { DOC_ICONS, DocIcon } from "./DocIcon";
import { useCreatePage } from "./useCreatePage";

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function ago(date: Date, now: number) {
  const minutes = Math.round((new Date(date).getTime() - now) / 60000);
  if (Math.abs(minutes) < 1) return "just now";
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute");
  if (Math.abs(minutes) < 1440) return relative.format(Math.round(minutes / 60), "hour");
  return relative.format(Math.round(minutes / 1440), "day");
}

const never = () => () => {};
let clientNow = 0;
/** The viewer's clock and greeting, filled in after the page loads. */
function useNow() {
  return useSyncExternalStore(never, () => (clientNow ||= Date.now()), () => 0);
}

/** A tiny drawing of a template's real structure. */
function MiniPage({ blocks, ink }: { blocks: TemplateBlock[]; ink: string }) {
  return (
    <span aria-hidden="true" className="flex h-28 flex-col gap-1.5 overflow-hidden rounded-[4px_14px_14px_14px] border border-line bg-sheet p-3">
      {blocks.slice(0, 8).map((b, i) => {
        if (b.type === "heading") return <span key={i} className="mt-0.5 h-2 w-2/5 shrink-0 rounded-full transition-[width] duration-500 group-hover:w-3/5" style={{ background: ink }} />;
        if (b.type === "table")
          return (
            <span key={i} className="grid h-6 shrink-0 grid-cols-3 gap-px overflow-hidden rounded bg-line">
              {Array.from({ length: 6 }, (_, c) => (
                <span key={c} className="bg-sheet" />
              ))}
            </span>
          );
        if (b.type === "codeBlock") return <span key={i} className="h-6 shrink-0 rounded bg-ink/80" />;
        return (
          <span key={i} className="flex shrink-0 items-center gap-1.5">
            {b.type !== "paragraph" && <span className={`size-1.5 shrink-0 ${b.type === "checkListItem" ? "rounded-[1px] border border-ink-3" : "rounded-full bg-ink-3"}`} />}
            <span className="h-1.5 rounded-full bg-wash-2 transition-[width] duration-500 group-hover:!w-[92%]" style={{ width: `${48 + ((i * 29) % 44)}%` }} />
          </span>
        );
      })}
    </span>
  );
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "mine", label: "Mine" },
  { id: "shared", label: "Shared with me" },
  { id: "favorite", label: "Favourites" },
] as const;

export function HomeView({ name, docs }: { name: string; docs: DocSummary[] }) {
  const { create, creating } = useCreatePage();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const now = useNow();
  const hour = now ? new Date(now).getHours() : -1;
  const greeting = hour < 0 ? "Hello" : hour < 5 ? "Up late" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const first = name.split(" ")[0];

  const shown = docs.filter((d) => (filter === "all" ? true : filter === "mine" ? d.owned : filter === "shared" ? !d.owned : d.favorite));

  return (
    <div className="relative isolate flex-1 px-4 pb-20 pt-16 sm:px-8 md:pt-12 lg:px-12">
      <div className="absolute inset-x-0 top-0 -z-10 h-[26rem] [mask-image:linear-gradient(#000_40%,transparent)]">
        <Aurora />
      </div>

      <h1 aria-label={`${greeting}, ${first}`} className="display max-w-4xl text-[clamp(2.5rem,6.4vw,5rem)]">
        {`${greeting}, ${first}`.split(" ").map((word, i) => (
          <span key={`${word}-${i}`} aria-hidden="true">
            <motion.span className="inline-block" initial={{ opacity: 0, y: 36, rotate: 4 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: i * 0.09, type: "spring", stiffness: 260, damping: 20 }}>
              {word}
            </motion.span>{" "}
          </span>
        ))}
      </h1>

      <section aria-labelledby="start" className="mt-10">
        <h2 id="start" className="display-tight text-xl">
          Start something
        </h2>
        <div className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-4 pt-1 sm:-mx-1 sm:px-1">
          <motion.button
            type="button"
            onClick={() => void create()}
            disabled={Boolean(creating)}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.97 }}
            className="sheet grid w-40 shrink-0 snap-start place-content-center justify-items-center gap-2 bg-brand p-4 text-on-brand shadow-[var(--shadow)]"
          >
            <FilePlus2 className="size-8" aria-hidden="true" />
            <span className="font-bold">{creating === "blank" ? "Creating…" : "Blank page"}</span>
          </motion.button>
          {TEMPLATES.map((t, i) => {
            const ink = PEOPLE_INKS[(i + 1) % PEOPLE_INKS.length];
            const Icon = DOC_ICONS[t.icon];
            return (
              <motion.button
                key={t.id}
                type="button"
                onClick={() => void create(t.id)}
                disabled={Boolean(creating)}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05, type: "spring", stiffness: 240, damping: 22 }}
                whileHover={{ y: -5, rotate: i % 2 ? 0.8 : -0.8 }}
                whileTap={{ scale: 0.97 }}
                className="raised sheet group w-52 shrink-0 snap-start p-2.5 text-left"
              >
                <MiniPage blocks={t.blocks} ink={ink.ink} />
                <span className="mt-2.5 flex items-center gap-2 px-1 text-sm font-bold">
                  <span className="tag grid size-6 shrink-0 place-items-center" style={{ background: ink.ink, color: ink.on }}>
                    <Icon className="size-3.5" aria-hidden="true" />
                  </span>
                  {creating === t.id ? "Creating…" : t.title}
                </span>
                <span className="mt-1 block px-1 pb-1 text-xs leading-snug text-ink-3">{t.blurb}</span>
              </motion.button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="pages" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="pages" className="display-tight text-xl">
            Your pages
          </h2>
          <div role="group" aria-label="Show" className="raised flex rounded-full p-1">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} className="relative px-3 py-1.5 text-xs font-bold">
                {filter === f.id && <motion.span layoutId="filter-active" className="absolute inset-0 rounded-full bg-brand" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
                <span className={`relative ${filter === f.id ? "text-on-brand" : "text-ink-2"}`}>{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="sheet mt-4 border border-dashed border-line px-6 py-10 text-center leading-relaxed text-ink-2">
            {filter === "shared"
              ? "Nothing has been shared with you yet. When someone invites your email address, the page appears here."
              : filter === "favorite"
                ? "Star a page to keep it here."
                : "No pages yet. Start with a blank one or pick a template above."}
          </p>
        ) : (
          <ul className="raised sheet mt-4 overflow-hidden">
            {shown.map((d, i) => (
              <motion.li key={d.id} layout initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 14) * 0.03 }} className="border-t border-line first:border-t-0">
                <Link href={`/app/d/${d.id}`} className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-wash sm:px-5">
                  <span className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                    <DocIcon id={d.id} icon={d.icon} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-bold">{d.title || "Untitled"}</span>
                      {d.favorite && <Star className="size-3.5 shrink-0" fill="#ffbe0b" color="#ffbe0b" aria-label="Favourite" />}
                    </span>
                    <span className="block truncate text-sm text-ink-3">{d.excerpt || "Empty page"}</span>
                  </span>
                  <span className="hidden shrink-0 text-right text-xs text-ink-3 sm:block">
                    <span className="block">{now ? `Edited ${ago(d.updatedAt, now)}` : ""}</span>
                    {!d.owned && <span className="block">Shared by {d.ownerName}</span>}
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
