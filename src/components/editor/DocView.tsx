"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  CircleSlash,
  Download,
  Eye,
  FileCode2,
  FileText,
  FileUp,
  History,
  MessageSquare,
  MoreHorizontal,
  Printer,
  Share2,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { setFavorite, trashDocument, updateDetails } from "@/app/actions/docs";
import { Avatar } from "@/components/app/Avatar";
import { DOC_ICONS, DocIcon } from "@/components/app/DocIcon";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { toast } from "@/components/ui/Toasts";
import type { SyncRole } from "@/shared/sync";
import { AiDialog } from "./AiDialog";
import { exportHtml, exportMarkdown } from "./exporting";
import { HistoryPanel } from "./HistoryPanel";
import { LivePointers } from "./LivePointers";
import type { HuddleEditor } from "./schema";
import { ShareDialog } from "./ShareDialog";
import { usePeers, useRoom, type Peer, type RoomStatus } from "./useRoom";

const CollabEditor = dynamic(() => import("./CollabEditor"), { ssr: false });

export type DocViewProps = {
  docId: string;
  role: SyncRole;
  title: string;
  icon: string | null;
  favorite: boolean;
  trashed: boolean;
  pendingTemplate: string | null;
  me: { id: string; name: string; ink: string };
};

const STATUS: Record<RoomStatus, string> = {
  connecting: "Connecting",
  live: "Live",
  offline: "Offline. Keep this tab open and your changes will sync.",
  denied: "No access",
  deleted: "Deleted",
};

function StatusPill({ status }: { status: RoomStatus }) {
  const color = status === "live" ? "#12ac74" : status === "connecting" ? "#ffbe0b" : "#ff6b2c";
  return (
    <span role="status" className="flex min-w-0 items-center gap-2 text-xs font-semibold text-ink-3">
      <span className="relative grid size-2.5 shrink-0 place-items-center">
        {status === "live" && (
          <motion.span className="absolute inset-0 rounded-full" style={{ background: color }} animate={{ scale: [1, 2.4], opacity: [0.5, 0] }} transition={{ duration: 1.8, repeat: Infinity }} />
        )}
        <span className="size-2.5 rounded-full" style={{ background: color }} />
      </span>
      <span className={status === "offline" ? "truncate" : "hidden truncate sm:inline"}>{STATUS[status]}</span>
    </span>
  );
}

/** The faces of everyone here. Choosing one scrolls to where they're working. */
function Presence({ peers, me, onFollow }: { peers: Peer[]; me: DocViewProps["me"]; onFollow: (peer: Peer) => void }) {
  // One face per person, even with several tabs open.
  const people = [...new Map(peers.map((p) => [p.id, p])).values()].filter((p) => p.id !== me.id);
  return (
    <ul aria-label="People on this page" className="flex items-center -space-x-1.5">
      <li title={`${me.name} (you)`}>
        <Avatar name={me.name} ink={me.ink} ring />
        <span className="sr-only">{me.name} (you)</span>
      </li>
      <AnimatePresence>
        {people.slice(0, 6).map((p) => (
          <motion.li key={p.id} layout initial={{ scale: 0, y: -18 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0, y: 18 }} transition={{ type: "spring", stiffness: 460, damping: 22 }}>
            <button type="button" onClick={() => onFollow(p)} title={`Go to ${p.name}`} aria-label={`Go to where ${p.name} is`} className="tag block transition-transform hover:-translate-y-0.5">
              <Avatar name={p.name} ink={p.color} ring />
            </button>
          </motion.li>
        ))}
      </AnimatePresence>
      {people.length > 6 && <li className="pl-3 text-xs font-bold text-ink-3">+{people.length - 6}</li>}
    </ul>
  );
}

function IconPicker({ value, onPick }: { value: string | null; onPick: (icon: string | null) => void }) {
  return (
    <div role="group" aria-label="Page icon" className="flex flex-wrap gap-1.5">
      {Object.entries(DOC_ICONS).map(([key, Icon]) => (
        <button key={key} type="button" aria-label={`Use the ${key} icon`} aria-pressed={value === key} onClick={() => onPick(value === key ? null : key)} className={`tag grid size-9 place-items-center ${value === key ? "bg-brand text-on-brand" : "bg-wash hover:bg-wash-2"}`}>
          <Icon className="size-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

export function DocView(props: DocViewProps) {
  const { docId, role, me } = props;
  const router = useRouter();
  const [, startTransition] = useTransition();
  const refresh = useCallback(() => startTransition(() => router.refresh()), [router]);
  const { room, status, ready } = useRoom(docId, refresh);
  const peers = usePeers(room?.provider);

  const editable = role !== "viewer" && !props.trashed;
  const [editor, setEditor] = useState<HuddleEditor | null>(null);
  const [words, setWords] = useState(0);
  const [panel, setPanel] = useState<"share" | "history" | "ai" | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsTarget, setCommentsTarget] = useState<HTMLElement | null>(null);
  const [picking, setPicking] = useState(false);
  const surface = useRef<HTMLDivElement>(null);
  const importInput = useRef<HTMLInputElement>(null);

  /* ---- title and icon ---- */
  const [title, setTitle] = useState(props.title);
  const [icon, setIcon] = useState(props.icon);
  const [saved, setSaved] = useState({ title: props.title, icon: props.icon });
  const typing = useRef(false);
  // Adopt changes made by other people, unless this person is mid-edit.
  const [seen, setSeen] = useState({ title: props.title, icon: props.icon });
  if (seen.title !== props.title || seen.icon !== props.icon) {
    setSeen({ title: props.title, icon: props.icon });
    setTitle(props.title);
    setIcon(props.icon);
    setSaved({ title: props.title, icon: props.icon });
  }

  useEffect(() => {
    if (!editable || (title === saved.title && icon === saved.icon)) return;
    const timer = window.setTimeout(async () => {
      const result = await updateDetails({ id: docId, title, icon });
      if (result.ok) setSaved({ title, icon });
      else toast.error(result.error);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [title, icon, saved, editable, docId]);

  // Edits made while disconnected live only in this tab until the connection returns.
  useEffect(() => {
    if (status !== "offline" || !editable) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status, editable]);

  useEffect(() => {
    document.title = `${title || "Untitled"} | Huddle`;
  }, [title]);

  const follow = (peer: Peer) => {
    const box = surface.current?.getBoundingClientRect();
    if (!box) return;
    if (peer.pointer) {
      window.scrollTo({ top: window.scrollY + box.top + peer.pointer.y - window.innerHeight / 2, behavior: "smooth" });
    } else {
      toast.done(`${peer.name} is here but hasn't moved yet`);
    }
  };

  const importMarkdown = async (file: File) => {
    if (!editor) return;
    if (file.size > 500_000) return toast.error("Choose a Markdown file under 500 KB.");
    const blocks = await editor.tryParseMarkdownToBlocks(await file.text());
    if (!blocks.length) return toast.error("Nothing could be read from that file.");
    editor.insertBlocks(blocks, editor.document[editor.document.length - 1], "after");
    toast.done("Imported at the end of the page");
  };

  const menu: MenuItem[] = [
    { label: "Download as Markdown", icon: <Download className="size-4" />, onSelect: () => editor && void exportMarkdown(editor, title) },
    { label: "Download as HTML", icon: <FileCode2 className="size-4" />, onSelect: () => editor && void exportHtml(editor, title) },
    { label: "Print or save as PDF", icon: <Printer className="size-4" />, onSelect: () => window.print() },
    ...(editable ? [{ label: "Import a Markdown file", icon: <FileUp className="size-4" />, onSelect: () => importInput.current?.click() }] : []),
    ...(role === "owner" && !props.trashed
      ? ([
          "divider",
          {
            label: "Move to trash",
            icon: <Trash2 className="size-4" />,
            danger: true,
            onSelect: async () => {
              const result = await trashDocument(docId);
              if (!result.ok) return toast.error(result.error);
              toast.done("Moved to trash");
              router.push("/app/trash");
            },
          },
        ] as MenuItem[])
      : []),
  ];

  if (status === "denied" || status === "deleted") {
    return (
      <div className="grid flex-1 place-items-center px-6 py-24 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <CircleSlash className="mx-auto size-12 text-ink-3" aria-hidden="true" />
          <h1 className="display-tight mt-4 text-3xl">{status === "deleted" ? "This page was deleted" : "You no longer have access"}</h1>
          <p className="mt-2 text-ink-2">{status === "deleted" ? "Its owner removed it for good." : "Ask the page's owner to invite you again."}</p>
          <Link
            href="/app"
            className="btn btn-solid mt-6"
            onClick={() => router.refresh()}
          >
            Back to your pages
          </Link>
        </motion.div>
      </div>
    );
  }

  const tool = "tag flex h-9 items-center gap-2 px-2.5 text-sm font-semibold hover:bg-wash";

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-ground py-2 pl-14 pr-3 print:hidden md:px-5">
        <StatusPill status={status} />
        <span className="flex-1" />
        <Presence peers={peers} me={me} onFollow={follow} />
        <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-line sm:block" />
        <button type="button" className={tool} onClick={() => setCommentsOpen((v) => !v)} aria-pressed={commentsOpen} aria-label="Comments">
          <MessageSquare className="size-[1.1rem]" aria-hidden="true" />
          <span className="hidden xl:inline">Comments</span>
        </button>
        {editable && (
          <button type="button" className={tool} onClick={() => setPanel("history")} aria-label="Version history">
            <History className="size-[1.1rem]" aria-hidden="true" />
            <span className="hidden xl:inline">History</span>
          </button>
        )}
        <button type="button" className={tool} onClick={() => setPanel("ai")} aria-label="Summarise with AI">
          <Sparkles className="size-[1.1rem]" aria-hidden="true" />
          <span className="hidden xl:inline">Summarise</span>
        </button>
        <button type="button" className="btn btn-solid btn-sm" onClick={() => setPanel("share")}>
          <Share2 className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Share</span>
        </button>
        <Menu label="More page actions" trigger={<MoreHorizontal className="size-5" aria-hidden="true" />} items={menu} />
        <input
          ref={importInput}
          type="file"
          accept=".md,.markdown,text/markdown,text/plain"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void importMarkdown(file);
          }}
        />
      </div>

      <div className="flex min-w-0 flex-1 items-start gap-4 p-2 sm:p-4 md:p-6">
        <motion.article
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 190, damping: 24 }}
          className="raised sheet huddle-page mx-auto w-full min-w-0 max-w-[52rem]"
        >
          <div ref={surface} className="relative min-h-[calc(100dvh-9rem)] pb-24 pt-8 sm:pt-12">
            <header className="px-5 sm:px-[3.4rem]">
              <div className="flex items-start justify-between gap-3">
                <button type="button" onClick={() => editable && setPicking((v) => !v)} disabled={!editable} aria-expanded={picking} aria-label="Change page icon" className="tag print:hidden">
                  <DocIcon id={docId} icon={icon} size="lg" />
                </button>
                <div className="flex items-center gap-2 print:hidden">
                  {role === "viewer" && (
                    <span className="tag flex items-center gap-1.5 bg-wash px-3 py-1.5 text-xs font-bold">
                      <Eye className="size-3.5" aria-hidden="true" /> View only
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={props.favorite ? "Remove from favourites" : "Add to favourites"}
                    aria-pressed={props.favorite}
                    className="tag grid size-9 place-items-center hover:bg-wash"
                    onClick={async () => {
                      const result = await setFavorite({ id: docId, on: !props.favorite });
                      if (!result.ok) toast.error(result.error);
                      else router.refresh();
                    }}
                  >
                    <motion.span key={String(props.favorite)} initial={{ scale: 0.4, rotate: -40 }} animate={{ scale: 1, rotate: 0 }}>
                      <Star className="size-5" fill={props.favorite ? "#ffbe0b" : "none"} color={props.favorite ? "#ffbe0b" : "currentColor"} aria-hidden="true" />
                    </motion.span>
                  </button>
                </div>
              </div>
              <AnimatePresence>
                {picking && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="pt-3">
                      <IconPicker
                        value={icon}
                        onPick={(next) => {
                          setIcon(next);
                          setPicking(false);
                        }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <textarea
                aria-label="Page title"
                rows={1}
                maxLength={160}
                readOnly={!editable}
                value={title}
                placeholder="Untitled"
                onFocus={() => (typing.current = true)}
                onBlur={() => (typing.current = false)}
                onChange={(e) => setTitle(e.target.value.replace(/\n/g, " "))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    editor?.focus();
                  }
                }}
                className="display-tight mt-5 block w-full resize-none overflow-hidden bg-transparent text-4xl outline-none [field-sizing:content] placeholder:text-ink-3/50 sm:text-5xl"
              />
              <p className="mt-2 text-xs text-ink-3 print:hidden">
                {words} {words === 1 ? "word" : "words"}
                {words > 200 ? `, about ${Math.round(words / 220) || 1} min to read` : ""}
              </p>
            </header>

            <div className="mt-5">
              {room && ready ? (
                <CollabEditor
                  docId={docId}
                  room={room}
                  editable={editable}
                  me={me}
                  pendingTemplate={role === "owner" ? props.pendingTemplate : null}
                  commentsTarget={commentsTarget}
                  onReady={setEditor}
                  onWords={setWords}
                />
              ) : (
                <div className="space-y-4 px-5 sm:px-[3.4rem]">
                  <p className="sr-only">Loading the page</p>
                  {[88, 96, 72, 91, 54].map((w, i) => (
                    <motion.span key={w} aria-hidden="true" className="tag block h-4 bg-wash-2" style={{ width: `${w}%` }} animate={{ opacity: [0.35, 0.9, 0.35] }} transition={{ duration: 1.3, repeat: Infinity, delay: i * 0.12 }} />
                  ))}
                  {status === "offline" && <p className="pt-3 text-sm text-ink-2">Can&apos;t reach the live server yet. Still trying.</p>}
                </div>
              )}
            </div>
            {room && <LivePointers room={room} peers={peers} surface={surface} />}
          </div>
        </motion.article>

        <AnimatePresence>
          {commentsOpen && (
            <motion.aside
              aria-label="Comments"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="raised sheet fixed inset-x-2 bottom-2 z-40 flex max-h-[70dvh] flex-col print:hidden lg:sticky lg:inset-auto lg:top-[4.5rem] lg:z-10 lg:max-h-[calc(100dvh-6rem)] lg:w-80 lg:shrink-0"
            >
              <div className="flex items-center justify-between px-4 py-3">
                <h2 className="display-tight text-lg">Comments</h2>
                <button type="button" aria-label="Close comments" onClick={() => setCommentsOpen(false)} className="tag grid size-8 place-items-center hover:bg-wash">
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              <div ref={setCommentsTarget} className="huddle-comments min-h-0 flex-1 overflow-y-auto px-3 pb-4" />
              <p className="border-t border-line px-4 py-3 text-xs leading-relaxed text-ink-3">
                <FileText className="mr-1 inline size-3.5" aria-hidden="true" />
                {editable ? "Select words on the page, then choose the comment button in the toolbar." : "You can read comments. Editors can add them."}
              </p>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <ShareDialog docId={docId} open={panel === "share"} onClose={() => setPanel(null)} />
      <HistoryPanel docId={docId} editor={editor} open={panel === "history"} onClose={() => setPanel(null)} />
      <AiDialog docId={docId} editor={editor} editable={editable} open={panel === "ai"} onClose={() => setPanel(null)} />
    </div>
  );
}
