<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Premium feature quality

The owner wants Keeply to feel premium. Do not add extra or new features unless they provide a complete, polished, reliable experience. Prefer fewer finished features over half-baked ideas, placeholders, or functionality that requires awkward workarounds.

Before implementing a feature, check whether the entire intended user flow will actually work on the devices, browsers, and environments where it will be offered. Validate platform limitations and integration prerequisites. File downloads followed by manual imports, such as ICS calendar exports, do not meet the owner's hassle-free requirement.

Before considering a feature ready, verify its end-to-end behavior, including success, cancellation, errors, and relevant device/browser differences. Unit tests or a successful build alone do not establish that a real device or external integration works. State what was tested and any remaining limitations honestly; never describe untested behavior as verified.

If a feature cannot meet this standard, omit it or remove the incomplete functionality. Offer it only in contexts where its complete experience has been verified; hide unsupported or unverified actions. Do not add replacement features or expand scope just to compensate for a removal.

## Preserve SEO

When changing public pages, preserve or intentionally update titles, descriptions, canonical URLs, indexing directives, structured data, and sitemap entries. Verify the rendered output. Run Lighthouse for changes that could affect public-page SEO or performance, and validate affected structured data. Report what was checked and any limitations. Private dashboard changes only require checking that public pages and indexing rules remain unaffected.

## Reminders for new scripts and migrations

Whenever you create a new script or database migration, explicitly mention it in your final response and link to the file. Explain its purpose, give the exact command or steps to run it, and state whether it has already been run and in which environment. Clearly identify anything the user still needs to run, including SQL migrations in Supabase, and when it must be run (for example, before deploying). Local tests do not mean a migration has been applied to the user's Supabase project. Always provide this reminder without waiting for the user to ask.

This requirement also applies when you modify a script or migration and the user needs to run it again, or when the current change depends on an earlier migration that has not yet been confirmed as applied. Include all outstanding prerequisites and the exact execution order; do not tell the user to run only the newest migration when earlier migrations are required. If the hosted schema state is unknown, provide a read-only prerequisite check before recommending migration execution. Do not ask the user to rerun a migration already confirmed as successful.

When there is no new script or migration and no outstanding execution required for the current change, proceed silently on this topic. Do not add statements such as "No Supabase migration needed" or "No new scripts required" to progress updates or the final response. Answer normally if the user explicitly asks about migration or script requirements.
