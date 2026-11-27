// Creates .env.local and worker/.dev.vars with fresh random secrets. Never overwrites.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const secret = () => randomBytes(48).toString("base64url");
if (existsSync(".env.local") || existsSync("worker/.dev.vars")) {
  console.log("Local settings already exist. Nothing changed.");
} else {
  const auth = secret();
  const sync = secret();
  const env = readFileSync(".env.example", "utf8")
    .replace("BETTER_AUTH_SECRET=\n", `BETTER_AUTH_SECRET=${auth}\n`)
    .replace("SYNC_SECRET=\n", `SYNC_SECRET=${sync}\n`);
  writeFileSync(".env.local", env, { mode: 0o600 });
  writeFileSync("worker/.dev.vars", `SYNC_SECRET=${sync}\nAPP_ORIGIN=http://localhost:3000\n`, { mode: 0o600 });
  console.log("Created .env.local and worker/.dev.vars");
}
