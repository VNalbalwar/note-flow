"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArchiveRestore, Trash2 } from "lucide-react";
import { deleteForever, restoreDocument } from "@/app/actions/docs";
import { Dialog } from "@/components/ui/Dialog";
import { toast } from "@/components/ui/Toasts";
import { DocIcon } from "./DocIcon";

type Item = { id: string; title: string; icon: string | null; trashedAt: Date | null };

export function TrashView({ items }: { items: Item[] }) {
  const router = useRouter();
  const [doomed, setDoomed] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex-1 px-4 pb-16 pt-16 sm:px-8 md:pt-12 lg:px-12">
      <h1 className="display text-5xl sm:text-6xl">Trash</h1>
      <p className="mt-3 max-w-[56ch] text-ink-2">Only you can see these. Restore a page to give its members access again.</p>

      {items.length === 0 ? (
        <p className="sheet mt-8 max-w-2xl border border-dashed border-line px-6 py-10 text-center text-ink-2">The trash is empty.</p>
      ) : (
        <ul className="mt-8 max-w-3xl space-y-2.5">
          <AnimatePresence>
            {items.map((d) => (
              <motion.li key={d.id} layout exit={{ opacity: 0, x: 60 }} className="raised sheet flex flex-wrap items-center gap-3 p-3.5">
                <DocIcon id={d.id} icon={d.icon} />
                <span className="min-w-0 flex-1 truncate font-bold">{d.title || "Untitled"}</span>
                <button
                  type="button"
                  className="btn btn-line btn-sm"
                  onClick={async () => {
                    const result = await restoreDocument(d.id);
                    if (!result.ok) return toast.error(result.error);
                    toast.done("Page restored");
                    router.refresh();
                  }}
                >
                  <ArchiveRestore className="size-4" aria-hidden="true" /> Restore
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setDoomed(d)}>
                  <Trash2 className="size-4" aria-hidden="true" /> Delete forever
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <Dialog
        open={Boolean(doomed)}
        onClose={() => setDoomed(null)}
        title="Delete this page forever?"
        description={`"${doomed?.title || "Untitled"}", its comments, images and version history will be erased. This can't be undone.`}
      >
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-line btn-sm" onClick={() => setDoomed(null)}>
            Keep it
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            disabled={busy}
            onClick={async () => {
              if (!doomed) return;
              setBusy(true);
              const result = await deleteForever(doomed.id);
              setBusy(false);
              if (!result.ok) return toast.error(result.error);
              setDoomed(null);
              toast.done("Page deleted");
              router.refresh();
            }}
          >
            {busy ? "Deleting…" : "Delete forever"}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
