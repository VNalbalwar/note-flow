// Vercel runs this ("vercel-build") instead of plain `next build`.
// Production builds first bring the database tables up to date, so the database
// password stays inside Vercel and never has to be copied to a laptop.
import { execSync } from "node:child_process";

const run = (command) => execSync(command, { stdio: "inherit" });

if (process.env.VERCEL_ENV === "production" && (process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL)) {
  console.log("[huddle] applying database migrations");
  run("npx drizzle-kit migrate");
} else {
  console.log("[huddle] skipping database migrations (not a production build with a database)");
}

run("npx next build");
