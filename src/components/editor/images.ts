import { LIMITS } from "@/shared/sync";

const MAX_SIDE = 1800;

/** Shrinks large photos in the browser so they fit the free storage limit. */
async function shrink(file: File): Promise<Blob> {
  if (file.type === "image/gif" || file.size <= 250_000) return file;
  const bitmap = await createImageBitmap(file);
  let side = Math.min(MAX_SIDE, Math.max(bitmap.width, bitmap.height));
  for (let attempt = 0; attempt < 4; attempt++) {
    const scale = side / Math.max(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/webp", 0.84));
    if (blob && blob.size <= LIMITS.maxFileBytes) return blob;
    side = Math.round(side * 0.72);
  }
  return file;
}

export async function uploadImage(docId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Only images can be uploaded.");
  const body = await shrink(file);
  if (body.size > LIMITS.maxFileBytes) throw new Error("That image is too large. Try one under 1.5 MB.");
  const res = await fetch(`/api/docs/${docId}/files`, {
    method: "POST",
    headers: { "content-type": "application/octet-stream" },
    body,
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed. Try again.");
  return data.url;
}
