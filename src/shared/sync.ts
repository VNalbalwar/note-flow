/** Types and limits shared by the web app and the sync server. */

export type SyncRole = "owner" | "editor" | "viewer";

export type SyncPass = {
  /** user id */
  sub: string;
  /** document id this pass is for */
  doc: string;
  role: SyncRole;
  name: string;
  /** the person's colour */
  ink: string;
};

/** Close codes the sync server uses, so the client can explain what happened. */
export const CLOSE = {
  /** Access changed: reconnect and be checked again. */
  recheck: 4001,
  /** The page was deleted. */
  deleted: 4004,
  /** Sent too much, too fast. */
  abuse: 4008,
} as const;

export const LIMITS = {
  maxMessageBytes: 2 * 1024 * 1024,
  maxDocBytes: 20 * 1024 * 1024,
  maxFileBytes: 1_500_000,
  maxFilesPerDoc: 200,
  maxNamedVersions: 30,
  maxAutoVersions: 40,
} as const;

export type VersionInfo = {
  id: number;
  createdAt: number;
  label: string | null;
  author: string | null;
  size: number;
};

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;

/** Identify an image by its first bytes, never by its name or declared type. */
export function sniffImage(bytes: Uint8Array): (typeof IMAGE_TYPES)[number] | null {
  const at = (offset: number, ...sig: number[]) => sig.every((b, i) => bytes[offset + i] === b);
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x47, 0x49, 0x46, 0x38)) return "image/gif";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp";
  return null;
}
