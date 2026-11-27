"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Dialog } from "@/components/ui/Dialog";
import { toast } from "@/components/ui/Toasts";
import { AI_LANGUAGES, type AiLanguage } from "@/shared/ai";
import type { HuddleEditor, HuddlePartialBlock } from "./schema";

/** Summarise the page in a chosen language (the old app's translate feature). */
export function AiDialog({ docId, editor, editable, open, onClose }: { docId: string; editor: HuddleEditor | null; editable: boolean; open: boolean; onClose: () => void }) {
  const [language, setLanguage] = useState<AiLanguage>("English");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    if (!editor) return;
    setBusy(true);
    setError("");
    setSummary("");
    try {
      const text = (await editor.blocksToMarkdownLossy(editor.document)).trim().slice(0, 12_000);
      if (!text) {
        setError("This page is empty. Write something first.");
        return;
      }
      const res = await fetch(`/api/docs/${docId}/ai`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ language, text }),
      });
      const data = (await res.json().catch(() => ({}))) as { summary?: string; error?: string };
      if (res.ok && data.summary) setSummary(data.summary);
      else setError(data.error ?? "The AI helper couldn't answer.");
    } finally {
      setBusy(false);
    }
  };

  const insert = () => {
    if (!editor) return;
    const blocks = [
      { type: "heading", props: { level: 2 }, content: `Summary (${language})` },
      ...summary
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({ type: line.startsWith("- ") ? "bulletListItem" : "paragraph", content: line.replace(/^- /, "") })),
    ] as unknown as HuddlePartialBlock[];
    editor.insertBlocks(blocks, editor.document[editor.document.length - 1], "after");
    toast.done("Summary added to the end of the page");
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Summarise this page" description="The page's text is sent to Cloudflare's AI to write a short summary. It can get things wrong, so check it.">
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="ai-language">
          Language of the summary
        </label>
        <select id="ai-language" className="field" value={language} onChange={(e) => setLanguage(e.target.value as AiLanguage)}>
          {AI_LANGUAGES.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <button type="button" className="btn btn-solid shrink-0" onClick={ask} disabled={busy || !editor}>
          {busy ? "Reading…" : "Summarise"}
        </button>
      </div>
      {busy && (
        <div className="mt-5 space-y-3" aria-hidden="true">
          {[92, 78, 85].map((w, i) => (
            <motion.span key={w} className="tag block h-4 bg-wash-2" style={{ width: `${w}%` }} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }} />
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm leading-relaxed text-danger">
          {error}
        </p>
      )}
      {summary && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
          <p className="sheet whitespace-pre-wrap border border-line bg-wash p-4 text-sm leading-relaxed">{summary}</p>
          {editable && (
            <button type="button" className="btn btn-line btn-sm mt-3" onClick={insert}>
              Add to the page
            </button>
          )}
        </motion.div>
      )}
    </Dialog>
  );
}
