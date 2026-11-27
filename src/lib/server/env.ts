import "server-only";
import { z } from "zod";

const optional = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined));

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is missing"),
  /** Public address of this app, for example http://localhost:3000 */
  APP_URL: z.url("APP_URL must be a full URL"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  /** Shared with the sync server; signs the short-lived connection passes. */
  SYNC_SECRET: z.string().min(32, "SYNC_SECRET must be at least 32 characters"),
  /** Where this app reaches the sync server, for example http://127.0.0.1:8787 */
  SYNC_URL: z.url("SYNC_URL must be a full URL"),
  SMTP_USER: optional,
  SMTP_PASSWORD: optional,
  SMTP_HOST: optional,
  GITHUB_CLIENT_ID: optional,
  GITHUB_CLIENT_SECRET: optional,
  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,
});

type Env = z.infer<typeof schema>;
let cached: Env | undefined;

function load(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Environment is not set up. See .env.example.\n${problems}`);
  }
  cached = parsed.data;
  return cached;
}

// Read lazily, so building the app does not require secrets.
export const env = new Proxy({} as Env, { get: (_, key: string) => load()[key as keyof Env] });
