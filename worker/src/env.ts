import type { DocRoom } from "./room";

export type Env = {
  Doc: DurableObjectNamespace<DocRoom>;
  /** Shared with the web app. Set with `wrangler secret put SYNC_SECRET`. */
  SYNC_SECRET: string;
  /** Web origins allowed to open live connections, comma separated. */
  APP_ORIGIN: string;
  AI?: { run(model: string, input: unknown): Promise<unknown> };
  AI_MODEL?: string;
};
