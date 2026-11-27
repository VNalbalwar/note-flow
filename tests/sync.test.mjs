// Security tests for the sync server. Start it first (npm run dev:sync), then: npm run test:sync
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { SignJWT } from "jose";
import * as Y from "yjs";
import YProvider from "y-partyserver/provider";

const vars = Object.fromEntries(
  (existsSync("worker/.dev.vars") ? readFileSync("worker/.dev.vars", "utf8") : "")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const HOST = process.env.SYNC_HOST ?? "127.0.0.1:8787";
const ORIGIN = vars.APP_ORIGIN ?? "http://localhost:3000";
const key = new TextEncoder().encode(vars.SYNC_SECRET);
const room = () => randomBytes(16).toString("base64url");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const opened = [];

const pass = (doc, sub, role, { audience = "huddle-sync", expires = "60s", secret = key } = {}) =>
  new SignJWT({ sub, doc, role, name: `Name of ${sub}`, ink: "#1f66db" })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(secret);

/** Node's WebSocket needs the Origin header set the way a browser would. */
const socketFrom = (origin) =>
  class extends WebSocket {
    constructor(url) {
      super(url, { headers: origin ? { origin } : {} });
    }
  };

function join(doc, token, { origin = ORIGIN } = {}) {
  const ydoc = new Y.Doc();
  const provider = new YProvider(HOST, doc, ydoc, {
    party: "doc",
    protocol: "ws",
    disableBc: true,
    params: { token },
    WebSocketPolyfill: socketFrom(origin),
    connect: false,
  });
  const closes = [];
  provider.on("connection-close", (event) => {
    closes.push(event?.code);
    provider.shouldConnect = false;
  });
  provider.connect();
  opened.push(provider);
  return { ydoc, provider, closes, text: () => ydoc.getText("t").toString() };
}

async function until(check, what, timeout = 6000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (check()) return;
    await sleep(40);
  }
  assert.fail(`timed out waiting for ${what}`);
}

async function admin(doc, action, { body, sign = {}, auth = true, query = "" } = {}) {
  const token = await new SignJWT({ room: sign.room ?? doc, action: sign.action ?? action })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("huddle-admin")
    .setIssuedAt()
    .setExpirationTime("30s")
    .sign(key);
  return fetch(`http://${HOST}/admin/${doc}/${action}${query}`, {
    method: "POST",
    headers: auth ? { authorization: `Bearer ${token}` } : {},
    body,
  });
}

after(() => {
  for (const p of opened) p.destroy();
});

test("two editors see each other's typing", async () => {
  const doc = room();
  const a = join(doc, await pass(doc, "alice", "owner"));
  const b = join(doc, await pass(doc, "bob", "editor"));
  await until(() => a.provider.synced && b.provider.synced, "both synced");
  a.ydoc.getText("t").insert(0, "hello");
  await until(() => b.text() === "hello", "bob to receive");
  b.ydoc.getText("t").insert(5, " world");
  await until(() => a.text() === "hello world", "alice to receive");
});

test("edits made while disconnected merge when the connection returns", async () => {
  const doc = room();
  const a = join(doc, await pass(doc, "alice", "owner"));
  const b = join(doc, await pass(doc, "bob", "editor"));
  await until(() => a.provider.synced && b.provider.synced, "synced");
  a.ydoc.getText("t").insert(0, "The test ran.");
  await until(() => b.text() === "The test ran.", "shared start");
  b.provider.disconnect();
  await until(() => b.provider.ws === null, "the close handshake to finish", 4000);
  a.ydoc.getText("t").insert(12, " ten times");
  b.ydoc.getText("t").insert(0, "Today: ");
  await sleep(500);
  assert.ok(!a.text().startsWith("Today"), "really disconnected");
  await b.provider.connect();
  await until(() => a.text() === b.text() && a.text() === "Today: The test ran ten times.", `merge, got "${a.text()}" and "${b.text()}"`);
});

test("a viewer receives edits but cannot make them", async () => {
  const doc = room();
  const a = join(doc, await pass(doc, "alice", "owner"));
  const v = join(doc, await pass(doc, "vic", "viewer"));
  await until(() => a.provider.synced && v.provider.synced, "synced");
  a.ydoc.getText("t").insert(0, "original");
  await until(() => v.text() === "original", "viewer to receive");
  v.ydoc.getText("t").insert(0, "VANDALISM ");
  await sleep(900);
  assert.equal(a.text(), "original");
  const fresh = join(doc, await pass(doc, "bob", "editor"));
  await until(() => fresh.provider.synced, "fresh client");
  await sleep(300);
  assert.equal(fresh.text(), "original", "server kept the viewer's change out");
});

test("nobody can pose as someone else or erase their cursor", async () => {
  const doc = room();
  const a = join(doc, await pass(doc, "alice", "owner"));
  const m = join(doc, await pass(doc, "mallory", "viewer"));
  await until(() => a.provider.synced && m.provider.synced, "synced");
  a.provider.awareness.setLocalState({ user: { name: "x" } });
  m.provider.awareness.setLocalState({
    user: { id: "alice", name: "Alice (admin)", color: "red" },
    evil: "<img src=x onerror=alert(1)>",
  });
  await until(() => a.provider.awareness.getStates().has(m.ydoc.clientID), "mallory's presence");
  const seen = a.provider.awareness.getStates().get(m.ydoc.clientID);
  assert.deepEqual(seen.user, { id: "mallory", name: "Name of mallory", color: "#1f66db" });
  assert.equal(seen.evil, undefined, "unknown fields are dropped");
});

test("connections without a valid pass are refused", async () => {
  const doc = room();
  const other = room();
  const attempts = {
    "no token": join(doc, ""),
    "pass for another page": join(doc, await pass(other, "alice", "owner")),
    "forged signature": join(doc, await pass(doc, "alice", "owner", { secret: new TextEncoder().encode("x".repeat(48)) })),
    "admin token reused as pass": join(doc, await pass(doc, "alice", "owner", { audience: "huddle-admin" })),
    "expired pass": join(doc, await pass(doc, "alice", "owner", { expires: "-1s" })),
    "another website's origin": join(doc, await pass(doc, "alice", "owner"), { origin: "https://evil.example" }),
    "no origin": join(doc, await pass(doc, "alice", "owner"), { origin: null }),
  };
  await sleep(1500);
  for (const [name, client] of Object.entries(attempts)) assert.equal(client.provider.synced, false, name);
});

test("removing someone disconnects them and their old pass stops working", async () => {
  const doc = room();
  const a = join(doc, await pass(doc, "alice", "owner"));
  const oldPass = await pass(doc, "bob", "editor");
  const b = join(doc, oldPass);
  await until(() => a.provider.synced && b.provider.synced, "synced");
  const res = await admin(doc, "kick", { body: JSON.stringify({ userId: "bob" }) });
  assert.equal(res.status, 200);
  await until(() => b.closes.includes(4001), "bob to be disconnected");
  const again = join(doc, oldPass);
  await sleep(1200);
  assert.equal(again.provider.synced, false, "old pass refused after removal");
  assert.ok(again.closes.includes(4001), `told to recheck, saw ${JSON.stringify(again.closes)}`);
  a.ydoc.getText("t").insert(0, "secret written after removal");
  await sleep(900);
  assert.equal(again.text(), "", "a refused socket is sent nothing");
  assert.equal(b.text(), "", "a removed person receives nothing new");
  assert.equal(a.provider.wsconnected, true, "others stay connected");
});

test("admin commands need a signature for that exact page and action", async () => {
  const doc = room();
  assert.equal((await admin(doc, "versions", { auth: false })).status, 401);
  assert.equal((await admin(doc, "versions", { sign: { room: room() } })).status, 403);
  assert.equal((await admin(doc, "purge", { sign: { action: "versions" } })).status, 403);
  assert.equal((await fetch(`http://${HOST}/parties/doc/${doc}`, { method: "POST" })).status, 404);
  assert.equal((await fetch(`http://${HOST}/parties/doc/${doc}/internal/purge`, { method: "POST" })).status, 404);
});

test("versions are saved, content persists, and deletion is final", async () => {
  const doc = room();
  const a = join(doc, await pass(doc, "alice", "owner"));
  await until(() => a.provider.synced, "synced");
  a.ydoc.getText("t").insert(0, "keep me");
  await sleep(2200);
  assert.equal((await admin(doc, "version-create", { body: JSON.stringify({ label: "Draft one", author: "Alice" }) })).status, 200);
  const { versions } = await (await admin(doc, "versions")).json();
  const named = versions.find((v) => v.label === "Draft one");
  assert.ok(named);
  const bytes = new Uint8Array(await (await admin(doc, "version-get", { query: `?id=${named.id}` })).arrayBuffer());
  const old = new Y.Doc();
  Y.applyUpdate(old, bytes);
  assert.equal(old.getText("t").toString(), "keep me");

  a.provider.destroy();
  await sleep(600);
  const again = join(doc, await pass(doc, "alice", "owner"));
  await until(() => again.text() === "keep me", "content after reconnect");

  assert.equal((await admin(doc, "purge")).status, 200);
  await until(() => again.closes.includes(4004), "disconnect on delete");
  const ghost = join(doc, await pass(doc, "alice", "owner"));
  await sleep(1200);
  assert.equal(ghost.text(), "");
  assert.ok(ghost.closes.includes(4004), `close codes seen: ${JSON.stringify(ghost.closes)}`);
});

test("only real images are stored", async () => {
  const doc = room();
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  assert.equal((await admin(doc, "file-put", { body: svg })).status, 415);
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
  const put = await admin(doc, "file-put", { body: png });
  assert.equal(put.status, 200);
  const { id } = await put.json();
  const got = await admin(doc, "file-get", { query: `?id=${id}` });
  assert.equal(got.headers.get("content-type"), "image/png");
});
