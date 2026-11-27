import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import type { Connection, ConnectionContext, WSMessage } from "partyserver";
import { YServer } from "y-partyserver";
import * as Y from "yjs";
import { CLOSE, LIMITS, IMAGE_TYPES, sniffImage, type SyncPass } from "../../src/shared/sync";
import { sanitizeAwareness } from "./awareness";
import type { Env } from "./env";
import { Store } from "./store";

export const PASS_HEADER = "x-huddle-pass";

type ConnState = {
  pass?: SyncPass & { iat: number };
  /** set when the connection was turned away */
  refused?: number;
  since: number;
  /** written by the sync library */
  __ypsAwarenessIds?: number[];
};

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
/** A connection is re-checked against the database at least this often. */
const MAX_CONNECTION_MS = 15 * 60 * 1000;
const RATE_WINDOW_MS = 10_000;
const RATE_MAX_MESSAGES = 800;
const MAX_CONNECTIONS = 60;
const AUTO_VERSION_EVERY_MS = 10 * 60 * 1000;

const json = (data: unknown, status = 200) => Response.json(data, { status });

export class DocRoom extends YServer<Env> {
  static options = { hibernate: true };
  static callbackOptions = { debounceWait: 1500, debounceMaxWait: 8000 };

  private store = new Store(this.ctx.storage);
  private rates = new Map<string, { start: number; count: number }>();
  private full = false;
  private lastSavedVector = "";

  async onStart() {
    this.store.prepare();
    await super.onStart();
  }

  async onLoad() {
    const state = this.store.loadState();
    if (state) {
      Y.applyUpdate(this.document, state);
      this.full = state.byteLength > LIMITS.maxDocBytes;
    }
  }

  async onSave() {
    if (this.store.deleted) return;
    const update = Y.encodeStateAsUpdate(this.document);
    this.full = update.byteLength > LIMITS.maxDocBytes;
    if (update.byteLength > LIMITS.maxDocBytes + LIMITS.maxMessageBytes) {
      console.error(`page ${this.name} is too large to save (${update.byteLength} bytes)`);
      return;
    }
    this.store.saveState(update);

    const vector = Y.encodeStateVector(this.document).join(",");
    if (vector !== this.lastSavedVector && Date.now() - this.store.lastAutoVersionAt() > AUTO_VERSION_EVERY_MS) {
      this.store.addVersion(update, null, null);
      this.lastSavedVector = vector;
    }
  }

  /** Fails closed: a connection without a verified pass can change nothing. */
  isReadOnly(connection: Connection) {
    const pass = (connection.state as ConnState | null)?.pass;
    return !pass || pass.role === "viewer" || this.full;
  }

  onConnect(connection: Connection, ctx: ConnectionContext) {
    const header = ctx.request.headers.get(PASS_HEADER);
    // The Worker sets this header only after verifying the pass.
    const pass = header ? (JSON.parse(decodeURIComponent(header)) as NonNullable<ConnState["pass"]>) : null;
    const refusal = this.refusal(pass);
    if (refusal || !pass) {
      const code = refusal ?? CLOSE.recheck;
      connection.setState({ refused: code, since: Date.now() } satisfies ConnState);
      // Closing before the handshake response is delivered stalls the close, so wait a beat.
      setTimeout(() => connection.close(code, "refused"), 50);
      return;
    }
    connection.setState({ pass, since: Date.now() } satisfies ConnState);
    super.onConnect(connection, ctx);
  }

  private refusal(pass: ConnState["pass"] | null) {
    if (!pass || pass.doc !== this.name) return CLOSE.recheck;
    if (this.store.deleted) return CLOSE.deleted;
    if (this.store.isRevoked(pass.sub, pass.iat)) return CLOSE.recheck;
    if ([...this.getConnections()].length > MAX_CONNECTIONS) return CLOSE.abuse;
    return null;
  }

  /** Only verified connections are ever sent anything. */
  *getConnections<T = unknown>(tag?: string): Generator<Connection<T>> {
    for (const connection of super.getConnections<T>(tag)) {
      if ((connection.state as ConnState | null)?.pass) yield connection;
    }
  }

  /** Close connections that are old enough to need their access checked again. */
  private expireOldConnections() {
    const cutoff = Date.now() - MAX_CONNECTION_MS;
    for (const c of this.getConnections()) {
      const state = c.state as ConnState | null;
      if (!state?.pass || state.since < cutoff) c.close(CLOSE.recheck, "recheck access");
    }
  }

  private tooFast(connection: Connection) {
    const now = Date.now();
    const rate = this.rates.get(connection.id);
    if (!rate || now - rate.start > RATE_WINDOW_MS) {
      this.rates.set(connection.id, { start: now, count: 1 });
      return false;
    }
    return ++rate.count > RATE_MAX_MESSAGES;
  }

  handleMessage(connection: Connection, message: WSMessage) {
    this.expireOldConnections();
    const state = connection.state as ConnState | null;
    if (!state?.pass) {
      // A close sent during the handshake can be lost, so say it again.
      connection.close(state?.refused ?? CLOSE.recheck, "refused");
      return;
    }
    if (Date.now() - state.since > MAX_CONNECTION_MS) return;

    if (typeof message === "string") return; // clients have nothing to say in text
    if (message.byteLength > LIMITS.maxMessageBytes || this.tooFast(connection)) {
      connection.close(CLOSE.abuse, "too much data");
      return;
    }

    const bytes =
      message instanceof ArrayBuffer
        ? new Uint8Array(message)
        : new Uint8Array(message.buffer, message.byteOffset, message.byteLength);

    try {
      const decoder = decoding.createDecoder(bytes);
      const type = decoding.readVarUint(decoder);
      if (type === MESSAGE_SYNC) {
        super.handleMessage(connection, bytes);
        return;
      }
      if (type !== MESSAGE_AWARENESS) return;

      const owned = new Set(state.__ypsAwarenessIds ?? []);
      const taken = new Set<number>();
      for (const other of this.getConnections()) {
        if (other.id === connection.id) continue;
        for (const id of (other.state as ConnState | null)?.__ypsAwarenessIds ?? []) taken.add(id);
      }
      const clean = sanitizeAwareness(
        decoding.readVarUint8Array(decoder),
        { id: state.pass.sub, name: state.pass.name, color: state.pass.ink },
        owned,
        taken,
      );
      if (!clean) return;
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(encoder, clean);
      super.handleMessage(connection, encoding.toUint8Array(encoder));
    } catch (error) {
      console.warn("dropped a malformed message", error);
    }
  }

  onCustomMessage() {}

  async onClose(connection: Connection, code: number, reason: string, wasClean: boolean) {
    // Answer the close, or the other side waits and can't reconnect promptly.
    try {
      // 1005 and 1006 only describe a close; they can't be sent.
      connection.close(code === 1005 || code === 1006 ? 1000 : code, reason);
    } catch {
      // Already closed.
    }
    this.rates.delete(connection.id);
    super.onClose(connection, code, reason, wasClean);
    // The last person left: write now instead of waiting for the timer.
    const others = [...this.getConnections()].some((c) => c.id !== connection.id);
    if (!others) await this.onSave();
  }

  /**
   * Internal commands from the web app. Only reachable through the Worker's
   * signed /admin route; public HTTP requests never reach a room.
   */
  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const action = url.pathname.split("/").pop();
    if (request.method !== "POST") return json({ error: "method" }, 405);

    if (action === "purge") {
      for (const c of this.getConnections()) c.close(CLOSE.deleted, "deleted");
      await this.store.destroy();
      this.document.transact(() => {
        const fragment = this.document.getXmlFragment("document-store");
        fragment.delete(0, fragment.length);
      });
      return json({ ok: true });
    }
    if (this.store.deleted) return json({ error: "deleted" }, 410);

    switch (action) {
      case "kick": {
        const { userId } = (await request.json()) as { userId?: string };
        this.store.revoke(userId ?? "*");
        for (const c of this.getConnections()) {
          const pass = (c.state as ConnState | null)?.pass;
          if (!userId || pass?.sub === userId) c.close(CLOSE.recheck, "access changed");
        }
        return json({ ok: true });
      }
      case "notify":
        this.broadcastCustomMessage("refresh");
        return json({ ok: true });
      case "versions":
        return json({ versions: this.store.listVersions() });
      case "version-get": {
        const update = this.store.getVersion(Number(url.searchParams.get("id")));
        return update
          ? new Response(update, { headers: { "content-type": "application/octet-stream" } })
          : json({ error: "not found" }, 404);
      }
      case "version-create": {
        const { label, author } = (await request.json()) as { label: string; author: string };
        if (this.store.namedVersionCount() >= LIMITS.maxNamedVersions) return json({ error: "limit" }, 409);
        const id = this.store.addVersion(
          Y.encodeStateAsUpdate(this.document),
          String(label).slice(0, 80),
          String(author).slice(0, 60),
        );
        return json({ id });
      }
      case "file-put": {
        const bytes = new Uint8Array(await request.arrayBuffer());
        const type = sniffImage(bytes);
        if (!type || bytes.byteLength > LIMITS.maxFileBytes) return json({ error: "refused" }, 415);
        if (this.store.fileCount() >= LIMITS.maxFilesPerDoc) return json({ error: "limit" }, 409);
        const id = crypto.randomUUID().replaceAll("-", "");
        this.store.putFile(id, type, bytes);
        return json({ id });
      }
      case "file-get": {
        const file = this.store.getFile(url.searchParams.get("id") ?? "");
        if (!file || !(IMAGE_TYPES as readonly string[]).includes(file.mime)) return json({ error: "not found" }, 404);
        return new Response(file.bytes, { headers: { "content-type": file.mime } });
      }
      default:
        return json({ error: "unknown action" }, 404);
    }
  }
}
