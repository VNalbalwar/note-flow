"use client";

import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { CommentsExtension, DefaultThreadStoreAuth, ThreadStoreAuth } from "@blocknote/core/comments";
import { withCollaboration, YjsThreadStore } from "@blocknote/core/yjs";
import { syntaxHighlighter } from "@blocknote/code-block";
import { BlockNoteViewEditor, ThreadsSidebar, useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { finishTemplate, saveSearchText } from "@/app/actions/docs";
import { toast } from "@/components/ui/Toasts";
import { inkFor, initials } from "@/lib/people";
import { templateById } from "@/lib/templates";
import { useTheme } from "@/lib/useTheme";
import { FRAGMENT, schema, type HuddleEditor, type HuddlePartialBlock } from "./schema";
import { uploadImage } from "./images";
import type { Room } from "./useRoom";

/** Viewers can read threads and nothing else. The server enforces the same. */
class ReadOnlyThreads extends ThreadStoreAuth {
  canCreateThread = () => false;
  canAddComment = () => false;
  canUpdateComment = () => false;
  canDeleteComment = () => false;
  canDeleteThread = () => false;
  canResolveThread = () => false;
  canUnresolveThread = () => false;
  canAddReaction = () => false;
  canDeleteReaction = () => false;
}

function avatarFor(id: string, name: string) {
  const person = inkFor(id);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><path fill="${person.ink}" d="M0 5a5 5 0 0 1 5-5h15a20 20 0 0 1 0 40A20 20 0 0 1 0 20z"/><text x="20" y="25" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="${person.on}">${initials(name).replace(/[<>&]/g, "")}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export type CollabEditorProps = {
  docId: string;
  room: Room;
  editable: boolean;
  me: { id: string; name: string; ink: string };
  pendingTemplate: string | null;
  /** Where the comment list should render, when the comment panel is open. */
  commentsTarget: HTMLElement | null;
  onReady: (editor: HuddleEditor | null) => void;
  onWords: (count: number) => void;
};

export default function CollabEditor({
  docId,
  room,
  editable,
  me,
  pendingTemplate,
  commentsTarget,
  onReady,
  onWords,
}: CollabEditorProps) {
  const theme = useTheme();

  const options = useMemo(
    () => {
      const threads = new YjsThreadStore(
        me.id,
        room.doc.getMap("threads"),
        editable ? new DefaultThreadStoreAuth(me.id, "editor") : new ReadOnlyThreads(),
      );
      return withCollaboration({
        schema,
        collaboration: {
          provider: room.provider,
          fragment: room.doc.getXmlFragment(FRAGMENT),
          user: { name: me.name, color: me.ink },
          showCursorLabels: "activity" as const,
        },
        extensions: [
          syntaxHighlighter,
          CommentsExtension({
            threadStore: threads,
            resolveUsers: async (ids: string[]) => {
              const query = new URLSearchParams(ids.slice(0, 50).map((id) => ["id", id]));
              const res = await fetch(`/api/docs/${docId}/people?${query}`);
              const found = res.ok ? ((await res.json()) as { people: { id: string; name: string }[] }).people : [];
              return ids.map((id) => {
                const name = found.find((p) => p.id === id)?.name ?? "Former member";
                return { id, username: name, avatarUrl: avatarFor(id, name) };
              });
            },
          }),
        ],
        tables: { splitCells: true, cellBackgroundColor: true, cellTextColor: true, headers: true },
        uploadFile: async (file: File) => {
          try {
            return await uploadImage(docId, file);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Upload failed.");
            throw error;
          }
        },
      });
    },
    // `me` is fixed for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [room, docId, editable],
  );
  const editor = useCreateBlockNote(options, [options]) as unknown as HuddleEditor;

  useEffect(() => {
    onReady(editor);
    return () => onReady(null);
  }, [editor, onReady]);

  // A page made from a template is filled in once, by the person who made it.
  const poured = useRef(false);
  useEffect(() => {
    if (poured.current || !pendingTemplate || !editable) return;
    const timer = window.setTimeout(() => {
      // Marked only when it runs: development mode mounts effects twice.
      poured.current = true;
      const preset = templateById(pendingTemplate);
      const [first, ...rest] = editor.document;
      const blank = rest.length === 0 && first?.type === "paragraph" && (!first.content || (first.content as unknown[]).length === 0);
      if (preset && blank) editor.replaceBlocks(editor.document, preset.blocks as unknown as HuddlePartialBlock[]);
      void finishTemplate(docId);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [editor, pendingTemplate, editable, docId]);

  // Word count, and a plain-text copy for search.
  useEffect(() => {
    let countTimer = 0;
    let saveTimer = 0;
    const plain = async () => (await editor.blocksToMarkdownLossy(editor.document)).replace(/[#*_`>|\\-]+/g, " ").replace(/\s+/g, " ").trim();
    const count = async () => {
      const text = await plain();
      onWords(text ? text.split(" ").length : 0);
    };
    void count();
    const unsubscribe = editor.onChange((_, context) => {
      window.clearTimeout(countTimer);
      countTimer = window.setTimeout(count, 600);
      // Only the person who typed saves the search copy.
      const mine = context.getChanges().some((change) => change.source.type !== "yjs-remote");
      if (!editable || !mine) return;
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(async () => void saveSearchText({ id: docId, text: await plain() }), 4000);
    });
    return () => {
      window.clearTimeout(countTimer);
      window.clearTimeout(saveTimer);
      unsubscribe?.();
    };
  }, [editor, editable, docId, onWords]);

  return (
    <BlockNoteView editor={editor} editable={editable} theme={theme} className="huddle-editor" renderEditor={false}>
      <BlockNoteViewEditor />
      {commentsTarget &&
        createPortal(
          // The list lives outside the editor's box, so it carries the same style scope.
          <div className="bn-root bn-mantine huddle-comment-scope" data-color-scheme={theme} data-mantine-color-scheme={theme}>
            <ThreadsSidebar filter="all" sort="position" />
          </div>,
          commentsTarget,
        )}
    </BlockNoteView>
  );
}
