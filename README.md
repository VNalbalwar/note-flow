# Huddle

**Live:** https://viraj-huddle.vercel.app

Free collaborative documents. Several people write on one page at the same time, with live cursors, comments,
version history and strong account security. A rebuild of my older "Notion clone" on a current stack.

## What it does

- **Live editing** with text cursors, mouse pointers, a "who's here" list, and click-to-follow
- **Rich blocks:** headings, lists, checklists, toggles, tables, quotes, highlighted code, images, colours, `/` menu, drag to reorder
- **Comments** on selected text, with replies, reactions and resolve
- **Sharing:** owner, editor and viewer roles, email invites, expiring links
- **Version history:** automatic and named versions, preview and restore
- **Workspace:** templates, favourites, trash, `Ctrl+K` search across page text
- **Import and export:** Markdown in; Markdown, HTML and print/PDF out
- **AI summary** in 11 languages (needs the deployed sync server)
- **Accounts:** verified email, passkeys, two-step codes with backup codes, leaked-password check, device list and sign-out
- Light and dark themes, keyboard support, reduced-motion support

## Stack

| Part | Choice |
| --- | --- |
| Web app | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Motion |
| Editor | BlockNote 0.57 on Yjs |
| Live sync | Cloudflare Worker + one SQLite Durable Object per page (`y-partyserver`) |
| Accounts | Better Auth (with the passkey and two-factor plugins) |
| Database | Postgres with Drizzle: Docker locally, Neon in production |

```
Browser ──HTTPS──> Next.js ──SQL──> Postgres      accounts, pages, permissions
   │                  │ signed, single-purpose calls
   │                  ▼
   └──WebSocket──> Cloudflare Worker ──> one Durable Object per page
     60-second pass                      page text, comments, images, versions
```

## Run it on your laptop (no accounts needed)

You need Node 22+ and Docker.

```bash
npm install
```

```bash
npm run setup
```

```bash
npm run db:up
```

```bash
npm run db:migrate
```

Then run these two in separate terminals:

```bash
npm run dev:sync
```

```bash
npm run dev
```

Open http://localhost:3000. Without email settings, confirmation and reset links are **printed in the `npm run dev` terminal**.
To try collaboration, sign up two accounts and open one of them in a private window.

If `npm` or the font download fails with `EAI_AGAIN`, your network is failing IPv6 DNS lookups. Run commands as:

```bash
NODE_OPTIONS="--require ./scripts/ipv4.cjs" npm run dev
```

## Checks

```bash
npm run lint && npm run typecheck
```

With `npm run dev:sync` running, this attacks the sync server (viewer writes, spoofed identities, forged and reused
passes, other websites, removed users, fake image files) and checks merging and persistence:

```bash
npm run test:sync
```

## Put it online for free

Do these in order. Pick your Vercel project name first; the examples use `huddle-yourname`.

### 1. Database: Neon

In your Vercel project open **Storage**, create a **Neon** database on the Free plan and connect it to **Production** with
the prefix `DATABASE`, which creates `DATABASE_URL`. Huddle doesn't use Neon Auth or Realtime.

You don't create tables by hand: every production build runs the migrations first (`scripts/vercel-build.mjs`), so the
connection string never leaves Vercel. If you host elsewhere, run `DATABASE_URL='…' npm run db:migrate` yourself.

### 2. Sync server: Cloudflare

Create a free Cloudflare account. In `worker/wrangler.jsonc`, under `env.production`, set `APP_ORIGIN` to your exact web
address, for example `https://huddle-yourname.vercel.app`.

```bash
npx wrangler login
```

```bash
npx wrangler secret put SYNC_SECRET --config worker/wrangler.jsonc --env production
```

Paste a **new** random value (`openssl rand -base64 48`) and keep it for step 3.

```bash
npx wrangler deploy --config worker/wrangler.jsonc --env production
```

Note the address it prints, like `huddle-sync.yourname.workers.dev`.

### 3. Web app: Vercel

Import the GitHub repository at vercel.com and add these environment variables **before** the first deploy:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | added for you by the Neon connection |
| `APP_URL` | `https://huddle-yourname.vercel.app` |
| `BETTER_AUTH_SECRET` | new random value |
| `SYNC_SECRET` | the same value as step 2 |
| `SYNC_URL` | `https://huddle-sync.yourname.workers.dev` |
| `NEXT_PUBLIC_SYNC_HOST` | `huddle-sync.yourname.workers.dev` |
| `SMTP_USER`, `SMTP_PASSWORD` | a Gmail address and its app password |

Choose a Vercel function region close to your Neon region. If you change `NEXT_PUBLIC_SYNC_HOST`, redeploy.

Passkeys are tied to the address in `APP_URL`. If you move to another domain, people must add them again.

### Optional: GitHub or Google sign-in

Create an OAuth app and use `APP_URL/api/auth/callback/github` or `/google` as the callback address, then add the two
variables from `.env.example`. These sign-ins rely on that provider's own two-step verification; Huddle's two-step
code applies to password sign-in.

## Staying at zero cost

Limits as researched in November 2026. Providers change them, so check their pricing pages.

| Service | Free allowance that matters here |
| --- | --- |
| Vercel Hobby | 100 GB transfer and 1M function calls a month. Meant for personal, non-commercial use: check its fair-use terms. |
| Neon Free | 1 GB storage and 100 compute-hours per project. Sleeps when idle, so the first request can be slow. |
| Cloudflare Workers Free | About 100,000 requests a day and 5 GB of Durable Object storage. Over the daily limit, requests fail until reset. |
| Workers AI | About 10,000 "neurons" a day (third-party figure). Huddle caps each person at 8 summaries an hour. |
| Gmail SMTP | A few hundred emails a day. |

None of these needs a paid plan for a class project. Do not add a payment card and no service can bill you.

## How security works

- **One permission check** (`src/lib/server/access.ts`) guards every page, server action and API route. A missing page and a forbidden page look identical.
- **Live connections** need a 60-second signed pass for exactly one page. The Worker also checks the website origin.
- **Viewers can't write:** the sync server discards their changes, whatever their browser sends.
- **No impersonation:** the server rewrites each presence message with the verified name and colour.
- **Revocation:** removing someone, changing their role or deleting an account disconnects the open windows and rejects older passes. Every connection is re-checked at least every 15 minutes.
- **Invites** are claimed only by someone who has verified that email address, and the response never reveals whether an account exists.
- **Share links** are stored as hashes. The secret sits after `#`, which browsers don't send to servers.
- **Uploads** are identified by their bytes (no SVG), size-limited, and served only to people with access.
- **Browser protections:** nonce-based Content-Security-Policy, HttpOnly SameSite cookies, same-origin checks, framing blocked.
- **Abuse limits:** database-backed rate limits on sign-in, codes, invites, uploads, search and AI; message limits in the sync server.

### Known limits

- Anyone who can edit a page can also alter its comments through custom code, because comments live in the shared document.
- Restoring a version keeps comment threads but removes their highlight on the text.
- Offline edits survive a dropped connection only while the tab stays open.
- Images pasted by web address load from that website, which can see viewers' IP addresses.
- Pages are encrypted in transit and by the hosting providers at rest, but not end to end.
- This has had automated tests, not an independent security audit.

## The old version

The first version used Clerk, Liveblocks and Firestore, and is still in the git history. Its server actions did not check
who owned a document, and the browser read Firestore directly while sign-in was handled by Clerk, which suggests open
database rules. **If the old Firebase project still exists, lock its rules or delete it.**
