import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";

/**
 * "Awareness" carries who is here and where their cursor is. The sync library
 * relays whatever a client sends, so without this step anyone connected, even a
 * viewer, could pose as someone else or erase their cursor. Here every message
 * is rebuilt: identity comes from the verified pass, and only known fields survive.
 */

export type Identity = { id: string; name: string; color: string };

const MAX_ENTRIES = 64;
const MAX_OWN_IDS = 2;
const MAX_STATE_CHARS = 4_000;

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function cleanState(raw: unknown, who: Identity) {
  const clean: Record<string, unknown> = { user: { id: who.id, name: who.name, color: who.color } };
  if (!raw || typeof raw !== "object") return clean;
  const state = raw as Record<string, unknown>;

  // Text cursor: two opaque Yjs positions.
  const cursor = state.cursor as { anchor?: unknown; head?: unknown } | null | undefined;
  if (cursor === null) clean.cursor = null;
  else if (cursor && typeof cursor === "object" && cursor.anchor && cursor.head) {
    clean.cursor = { anchor: cursor.anchor, head: cursor.head };
  }
  // Mouse pointer: x as a fraction of the page width, y in pixels from its top.
  const pointer = state.pointer as { x?: unknown; y?: unknown } | null | undefined;
  if (pointer && isFiniteNumber(pointer.x) && isFiniteNumber(pointer.y)) {
    clean.pointer = {
      x: Math.min(1.2, Math.max(-0.2, pointer.x)),
      y: Math.min(1_000_000, Math.max(0, pointer.y)),
    };
  }
  return clean;
}

/**
 * Rebuild an awareness payload. `owned` are the client ids this connection has
 * already used; `taken` belong to other connections and are dropped.
 */
export function sanitizeAwareness(
  payload: Uint8Array,
  who: Identity,
  owned: ReadonlySet<number>,
  taken: ReadonlySet<number>,
): Uint8Array | null {
  const decoder = decoding.createDecoder(payload);
  const count = decoding.readVarUint(decoder);
  if (count > MAX_ENTRIES) return null;

  const mine = new Set(owned);
  const kept: { client: number; clock: number; json: string }[] = [];
  for (let i = 0; i < count; i++) {
    const client = decoding.readVarUint(decoder);
    const clock = decoding.readVarUint(decoder);
    const json = decoding.readVarString(decoder);
    if (taken.has(client)) continue;
    const isNew = !mine.has(client);
    if (isNew && mine.size >= MAX_OWN_IDS) continue;

    let state: unknown = null;
    if (json !== "null") {
      if (json.length > MAX_STATE_CHARS) continue;
      state = cleanState(JSON.parse(json), who);
    } else if (isNew) {
      continue;
    }
    mine.add(client);
    kept.push({ client, clock, json: JSON.stringify(state) });
  }
  if (kept.length === 0) return null;

  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, kept.length);
  for (const entry of kept) {
    encoding.writeVarUint(encoder, entry.client);
    encoding.writeVarUint(encoder, entry.clock);
    encoding.writeVarString(encoder, entry.json);
  }
  return encoding.toUint8Array(encoder);
}
