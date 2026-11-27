# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People who write one document together. Confirmed by the owner: students, developers, and other audiences as well, so no single group may be assumed in wording or features.

- Students and study groups: shared lecture notes, lab reports, project documentation, usually close to a deadline.
- Developers and project teams: specs, meeting notes, code-heavy documents.
- Everyone else who needs a shared page: clubs, event teams, small groups.

They arrive on laptops to write and often on phones to read or check.

## Product Purpose

Huddle is a collaborative document workspace. Several people edit the same page at the same time, see who is there and where they are, format rich content, comment, and control who gets in. It is a rebuild of the owner's older "Notion clone" project on a current stack. Success: a group can sign up, make a page, invite each other and finish real work without paying anything, and the owner can run it forever at no cost.

## Positioning

Live collaboration with no paid tier, no seat limit sold back to the user, and account security (two-factor codes, passkeys, session control) included for everyone.

## Operating Context

- Core loop: sign in, create or open a page, write, share it by email invite or link, edit together, comment, export.
- Roles on a page: owner, editor, viewer.
- Hosting must be free: Next.js on Vercel Hobby, Postgres on Neon Free, live sync on Cloudflare Workers Free (Durable Objects).
- The whole app must also run on one laptop with no external accounts.

## Capabilities and Constraints

- Mandatory: real-time collaborative editing, presence, rich formatting, sharing and permissions, strong authentication and security.
- Built with Next.js 16, Tailwind CSS, Motion (framer-motion), Better Auth, Yjs.
- Zero cost is a hard constraint. No service that needs a payment card.
- Light and dark themes.
- AI helpers (summarise, translate), which the old app had, must run on a free allowance and degrade cleanly when unavailable.

## Brand Commitments

- Name: Huddle.
- Must not read as Notion: no borrowing of its design language.
- The owner wants visible, polished motion: animations, transitions and motion graphics, with bold, distinctive typography. Plain and static has been rejected on earlier projects.

## Evidence on Hand

- The old codebase (git history) defines the original feature set.
- There are no users, customers, testimonials, benchmarks or usage numbers. Do not invent any. Demonstration content on marketing pages must be recognisably a demo.

## Product Principles

1. Writing comes first: the editor stays calm even where the rest of the product is expressive.
2. Always show who is here and what changed.
3. Permissions are enforced on the server, never only in the interface.
4. Free forever: if a feature needs a paid service, it is not built that way.

## Accessibility & Inclusion

Keyboard usable, visible focus, readable contrast in both themes, and reduced-motion preferences respected.
