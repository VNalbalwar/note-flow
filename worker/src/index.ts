import { jwtVerify } from "jose";
import { getServerByName, routePartykitRequest } from "partyserver";
import type { SyncPass } from "../../src/shared/sync";
import { summarise } from "./ai";
import type { Env } from "./env";
import { PASS_HEADER } from "./room";

export { DocRoom } from "./room";

const ROOM = /^[A-Za-z0-9_-]{16,40}$/;

const secretKey = (env: Env) => {
  // Refuse to run with a weak or missing secret.
  if (!env.SYNC_SECRET || env.SYNC_SECRET.length < 32) throw new Error("SYNC_SECRET is not configured");
  return new TextEncoder().encode(env.SYNC_SECRET);
};

const refuse = (status: number) => new Response("Refused", { status });

/** Calls from the web app's server. Each signature names one room and one action. */
async function admin(request: Request, env: Env, room: string, action: string) {
  if (request.method !== "POST") return refuse(405);
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return refuse(401);
  try {
    const { payload } = await jwtVerify(token, secretKey(env), {
      algorithms: ["HS256"],
      audience: "huddle-admin",
      maxTokenAge: "60s",
    });
    if (payload.room !== room || payload.action !== action) return refuse(403);
  } catch {
    return refuse(401);
  }
  if (action === "ai") return summarise(env, request);

  const stub = await getServerByName(env.Doc, room);
  const url = new URL(request.url);
  const headers = new Headers({ "content-type": request.headers.get("content-type") ?? "application/octet-stream" });
  return stub.fetch(
    new Request(`https://room.internal/internal/${action}${url.search}`, {
      method: "POST",
      headers,
      body: request.body,
    }),
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") return new Response("ok");

    const command = /^\/admin\/([^/]+)\/([a-z-]+)$/.exec(url.pathname);
    if (command) {
      return ROOM.test(command[1]) ? admin(request, env, command[1], command[2]) : refuse(400);
    }

    const response = await routePartykitRequest(request, env as unknown as Cloudflare.Env, {
      async onBeforeConnect(req, lobby) {
        // Browsers send Origin on WebSocket handshakes; other sites are turned away.
        const allowed = env.APP_ORIGIN.split(",").map((o) => o.trim());
        const origin = req.headers.get("origin");
        if (!origin || !allowed.includes(origin)) return refuse(403);
        if (lobby.party !== "doc" || !ROOM.test(lobby.name)) return refuse(404);

        const token = new URL(req.url).searchParams.get("token");
        if (!token) return refuse(401);
        try {
          const { payload } = await jwtVerify(token, secretKey(env), {
            algorithms: ["HS256"],
            audience: "huddle-sync",
            maxTokenAge: "90s",
          });
          const pass = payload as unknown as SyncPass & { iat: number };
          // A pass opens exactly the page it was issued for.
          if (pass.doc !== lobby.name) return refuse(403);

          const headers = new Headers(req.headers);
          // Overwrites anything the client may have sent under this name.
          headers.set(
            PASS_HEADER,
            encodeURIComponent(
              JSON.stringify({ sub: pass.sub, doc: pass.doc, role: pass.role, name: pass.name, ink: pass.ink, iat: pass.iat }),
            ),
          );
          return new Request(req, { headers });
        } catch {
          return refuse(401);
        }
      },
      // Rooms accept live connections only. Everything else must use /admin.
      onBeforeRequest: () => refuse(404),
    });

    return response ?? refuse(404);
  },
} satisfies ExportedHandler<Env>;
