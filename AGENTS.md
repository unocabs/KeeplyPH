<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Reminders for new scripts and migrations

Whenever you create a new script or database migration, explicitly mention it in your final response and link to the file. Explain its purpose, give the exact command or steps to run it, and state whether it has already been run and in which environment. Clearly identify anything the user still needs to run, including SQL migrations in Supabase, and when it must be run (for example, before deploying). Local tests do not mean a migration has been applied to the user's Supabase project. Always provide this reminder without waiting for the user to ask.
