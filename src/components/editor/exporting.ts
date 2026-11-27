import type { HuddleEditor } from "./schema";

function download(name: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function fileName(title: string) {
  return (title || "untitled").replace(/[^\p{L}\p{N}\- _]/gu, "").trim().replace(/\s+/g, "-").slice(0, 60) || "untitled";
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function exportMarkdown(editor: HuddleEditor, title: string) {
  const body = await editor.blocksToMarkdownLossy(editor.document);
  download(`${fileName(title)}.md`, "text/markdown;charset=utf-8", `# ${title || "Untitled"}\n\n${body}`);
}

export async function exportHtml(editor: HuddleEditor, title: string) {
  const body = await editor.blocksToHTMLLossy(editor.document);
  const heading = escapeHtml(title || "Untitled");
  download(
    `${fileName(title)}.html`,
    "text/html;charset=utf-8",
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${heading}</title><style>body{font-family:system-ui,sans-serif;max-width:46rem;margin:3rem auto;padding:0 1rem;line-height:1.65}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:.4rem .7rem}pre{background:#f4f4f8;padding:1rem;overflow:auto}img{max-width:100%}</style></head><body><h1>${heading}</h1>${body}</body></html>`,
  );
}
