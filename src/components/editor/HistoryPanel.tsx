"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import * as Y from "yjs";
import { BlockNoteEditor } from "@blocknote/core";
import { yXmlFragmentToBlocks } from "@blocknote/core/yjs";
import { BlockNoteView } from "@blocknote/mantine";
import { RotateCcw } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { toast } from "@/components/ui/Toasts";
import { useTheme } from "@/lib/useTheme";
import type { VersionInfo } from "@/shared/sync";
import { FRAGMENT, schema, type HuddleBlock, type HuddleEditor } from "./schema";

const when = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

type Preview = { version: VersionInfo; blocks: HuddleBlock[]; viewer: HuddleEditor };

export function HistoryPanel({ docId, editor, open, onClose }: { docId: string; editor: HuddleEditor | null; open: boolean; onClose: () => void }) {
  const theme = useTheme();
  const [versions, setVersions] = useState<VersionInfo[] | null>(null);
  const [failed, setFailed] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/docs/${docId}/versions`);
    const data = (await res.json().catch(() => ({}))) as { versions?: VersionInfo[]; error?: string };
    if (res.ok && data.versions) {
      setVersions(data.versions);
      setFailed("");
    } else setFailed(data.error ?? "Version history is unavailable right now.");
  }, [docId]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setPreview(null);
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, load]);

  const saveNamed = async (name: string) => {
    const res = await fetch(`/api/docs/${docId}/versions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: name }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? "That version couldn't be saved.");
    }
  };

  const view = async (version: VersionInfo) => {
    if (!editor) return;
    const res = await fetch(`/api/docs/${docId}/versions/${version.id}`);
    if (!res.ok) return toast.error("That version couldn't be opened.");
    const old = new Y.Doc();
    Y.applyUpdate(old, new Uint8Array(await res.arrayBuffer()));
    const blocks = yXmlFragmentToBlocks(editor, old.getXmlFragment(FRAGMENT)) as HuddleBlock[];
    old.destroy();
    const viewer = BlockNoteEditor.create({
      schema,
      initialContent: blocks.length ? blocks : undefined,
    }) as unknown as HuddleEditor;
    setPreview({ version, blocks, viewer });
  };

  const restore = async () => {
    if (!editor || !preview) return;
    setBusy(true);
    try {
      // Keep what's there now, so a restore can itself be undone.
      await saveNamed(`Before restoring ${when.format(preview.version.createdAt)}`).catch(() => {});
      editor.replaceBlocks(editor.document, preview.blocks.length ? preview.blocks : [{ type: "paragraph" }]);
      toast.done("Version restored. Everyone on the page sees it now.");
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      side
      wide={Boolean(preview)}
      title={preview ? when.format(preview.version.createdAt) : "Version history"}
      description={preview ? (preview.version.label ?? "Saved automatically") : "Versions are kept as you work. Name one to keep it."}
    >
      {preview ? (
        <div>
          <p className="mb-3 text-xs leading-relaxed text-ink-3">
            Restoring brings back the text and formatting. Comment threads stay in the comments panel, but they lose their
            highlight on the text. The current page is saved as a version first.
          </p>
          <div className="sticky top-0 z-10 flex flex-wrap gap-2 bg-sheet pb-3">
            <button type="button" className="btn btn-solid btn-sm" onClick={restore} disabled={busy}>
              <RotateCcw className="size-4" aria-hidden="true" />
              {busy ? "Restoring…" : "Restore this version"}
            </button>
            <button type="button" className="btn btn-line btn-sm" onClick={() => setPreview(null)}>
              Back to all versions
            </button>
          </div>
          <div className="sheet border border-line py-3">
            <BlockNoteView editor={preview.viewer} editable={false} theme={theme} className="huddle-editor" />
          </div>
        </div>
      ) : (
        <>
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!label.trim()) return;
              setBusy(true);
              try {
                await saveNamed(label.trim());
                setLabel("");
                toast.done("Version saved");
                await load();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "That version couldn't be saved.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="sr-only" htmlFor="version-name">
              Name this version
            </label>
            <input id="version-name" className="field" placeholder="Name the page as it is now" maxLength={80} value={label} onChange={(e) => setLabel(e.target.value)} />
            <button type="submit" className="btn btn-solid btn-sm shrink-0" disabled={busy || !label.trim()}>
              Save
            </button>
          </form>

          {failed && <p className="mt-5 text-sm text-danger">{failed}</p>}
          {!failed && versions === null && <p className="mt-5 text-sm text-ink-3">Loading versions…</p>}
          {versions?.length === 0 && (
            <p className="mt-5 text-sm leading-relaxed text-ink-2">
              No versions yet. The first one is kept automatically a few seconds after you start writing.
            </p>
          )}
          <ol className="mt-5">
            {versions?.map((v, i) => (
              <motion.li key={v.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 12) * 0.035 }} className="relative pl-7">
                <span aria-hidden="true" className="absolute bottom-0 left-[0.45rem] top-0 w-px bg-line" />
                <span aria-hidden="true" className={`tag absolute left-0 top-4 size-4 ${v.label ? "bg-brand" : "border border-ink-3 bg-sheet"}`} />
                <button type="button" onClick={() => view(v)} className="tag w-full px-3 py-3 text-left hover:bg-wash">
                  <span className="block text-sm font-semibold">{v.label ?? "Saved automatically"}</span>
                  <span className="block text-xs text-ink-3">
                    {when.format(v.createdAt)}
                    {v.author ? ` by ${v.author}` : ""}
                  </span>
                </button>
              </motion.li>
            ))}
          </ol>
        </>
      )}
    </Dialog>
  );
}
