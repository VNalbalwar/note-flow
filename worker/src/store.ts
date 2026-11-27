import { LIMITS, type VersionInfo } from "../../src/shared/sync";

/** SQLite storage for one page. Large values are split to fit row limits. */
const CHUNK = 900_000;

function split(bytes: Uint8Array) {
  const parts: ArrayBuffer[] = [];
  for (let at = 0; at < bytes.byteLength; at += CHUNK) {
    parts.push(bytes.slice(at, at + CHUNK).buffer as ArrayBuffer);
  }
  return parts;
}

function join(rows: { data: ArrayBuffer }[]) {
  const total = rows.reduce((n, r) => n + r.data.byteLength, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const row of rows) {
    out.set(new Uint8Array(row.data), at);
    at += row.data.byteLength;
  }
  return out;
}

export class Store {
  constructor(private storage: DurableObjectStorage) {}

  private get sql() {
    return this.storage.sql;
  }

  prepare() {
    const statements = [
      "CREATE TABLE IF NOT EXISTS state (i INTEGER PRIMARY KEY, data BLOB NOT NULL)",
      "CREATE TABLE IF NOT EXISTS versions (id INTEGER PRIMARY KEY AUTOINCREMENT, created INTEGER NOT NULL, label TEXT, author TEXT, size INTEGER NOT NULL)",
      "CREATE TABLE IF NOT EXISTS version_chunks (version INTEGER NOT NULL, i INTEGER NOT NULL, data BLOB NOT NULL, PRIMARY KEY (version, i))",
      "CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, mime TEXT NOT NULL, size INTEGER NOT NULL)",
      "CREATE TABLE IF NOT EXISTS file_chunks (file TEXT NOT NULL, i INTEGER NOT NULL, data BLOB NOT NULL, PRIMARY KEY (file, i))",
      "CREATE TABLE IF NOT EXISTS revoked (subject TEXT PRIMARY KEY, at INTEGER NOT NULL)",
      "CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
    ];
    for (const statement of statements) this.sql.exec(statement);
  }

  private meta(key: string) {
    const [row] = this.sql.exec<{ value: string }>("SELECT value FROM meta WHERE key = ?", key).toArray();
    return row?.value;
  }

  private setMeta(key: string, value: string) {
    this.sql.exec("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", key, value);
  }

  get deleted() {
    return this.meta("deleted") === "1";
  }

  loadState() {
    const rows = this.sql.exec<{ data: ArrayBuffer }>("SELECT data FROM state ORDER BY i").toArray();
    return rows.length ? join(rows) : null;
  }

  saveState(update: Uint8Array) {
    this.storage.transactionSync(() => {
      this.sql.exec("DELETE FROM state");
      split(update).forEach((part, i) => this.sql.exec("INSERT INTO state (i, data) VALUES (?, ?)", i, part));
    });
  }

  /* ---- versions ---- */

  listVersions(): VersionInfo[] {
    return this.sql
      .exec<{ id: number; created: number; label: string | null; author: string | null; size: number }>(
        "SELECT id, created, label, author, size FROM versions ORDER BY id DESC",
      )
      .toArray()
      .map((v) => ({ id: v.id, createdAt: v.created, label: v.label, author: v.author, size: v.size }));
  }

  lastAutoVersionAt() {
    return Number(this.meta("lastAuto") ?? 0);
  }

  namedVersionCount() {
    return this.sql.exec<{ n: number }>("SELECT COUNT(*) AS n FROM versions WHERE label IS NOT NULL").one().n;
  }

  addVersion(update: Uint8Array, label: string | null, author: string | null) {
    return this.storage.transactionSync(() => {
      const now = Date.now();
      const { id } = this.sql
        .exec<{ id: number }>(
          "INSERT INTO versions (created, label, author, size) VALUES (?, ?, ?, ?) RETURNING id",
          now,
          label,
          author,
          update.byteLength,
        )
        .one();
      split(update).forEach((part, i) =>
        this.sql.exec("INSERT INTO version_chunks (version, i, data) VALUES (?, ?, ?)", id, i, part),
      );
      if (label === null) {
        this.setMeta("lastAuto", String(now));
        const old = this.sql
          .exec<{ id: number }>(
            "SELECT id FROM versions WHERE label IS NULL ORDER BY id DESC LIMIT -1 OFFSET ?",
            LIMITS.maxAutoVersions,
          )
          .toArray();
        for (const row of old) {
          this.sql.exec("DELETE FROM version_chunks WHERE version = ?", row.id);
          this.sql.exec("DELETE FROM versions WHERE id = ?", row.id);
        }
      }
      return id;
    });
  }

  getVersion(id: number) {
    const rows = this.sql
      .exec<{ data: ArrayBuffer }>("SELECT data FROM version_chunks WHERE version = ? ORDER BY i", id)
      .toArray();
    return rows.length ? join(rows) : null;
  }

  /* ---- images ---- */

  fileCount() {
    return this.sql.exec<{ n: number }>("SELECT COUNT(*) AS n FROM files").one().n;
  }

  putFile(id: string, mime: string, bytes: Uint8Array) {
    this.storage.transactionSync(() => {
      this.sql.exec("INSERT INTO files (id, mime, size) VALUES (?, ?, ?)", id, mime, bytes.byteLength);
      split(bytes).forEach((part, i) => this.sql.exec("INSERT INTO file_chunks (file, i, data) VALUES (?, ?, ?)", id, i, part));
    });
  }

  getFile(id: string) {
    const [file] = this.sql.exec<{ mime: string }>("SELECT mime FROM files WHERE id = ?", id).toArray();
    if (!file) return null;
    const rows = this.sql.exec<{ data: ArrayBuffer }>("SELECT data FROM file_chunks WHERE file = ? ORDER BY i", id).toArray();
    return { mime: file.mime, bytes: join(rows) };
  }

  /* ---- access revocation ---- */

  /** Refuse passes issued at or before now, for one person or for everyone ("*"). */
  revoke(subject: string) {
    this.sql.exec(
      "INSERT INTO revoked (subject, at) VALUES (?, ?) ON CONFLICT(subject) DO UPDATE SET at = excluded.at",
      subject,
      Math.floor(Date.now() / 1000),
    );
  }

  isRevoked(userId: string, issuedAtSeconds: number) {
    const [row] = this.sql
      .exec<{ at: number | null }>("SELECT MAX(at) AS at FROM revoked WHERE subject IN (?, '*')", userId)
      .toArray();
    return row?.at != null && issuedAtSeconds <= row.at;
  }

  /** Erase the page and remember that it is gone. */
  async destroy() {
    await this.storage.deleteAll();
    this.prepare();
    this.setMeta("deleted", "1");
  }
}
