# Household activity history: rollout and verification

Release 1 of the approved household platform refactor. Public marketing, pricing, saved category identifiers, item IDs and existing document storage keys are preserved.

## Behavior

Item details show a chronological activity history with actual completion dates, optional actual PHP costs, notes and associations to existing ready documents on the same item. Recorded completion identifies an exact occurrence. Stable request IDs handle repeated clicks and lost-response retries. A late completion can resolve an unconfirmed historical occurrence without changing the current future schedule. Old completion callers remain supported and capture only facts explicitly recorded.

Corrections require a reason, retain the previous values and leave future schedules unchanged. The owner can inspect the latest 20 correction records; earlier audit records remain stored. Removing an activity retains it as removed and returns an associated completed occurrence to unconfirmed. Recording that occurrence again restores its activity with an audit entry. Unconfirmed occurrences can be explicitly skipped with a reason and reopened if the skip was mistaken. None of these review actions implies payment or changes the next scheduled date.

Fixed recurrence retains the original calendar anchor. A recurring service can explicitly switch to scheduling from completion; the recurring worker waits for actual completion for that policy. One-time service suggestions use the configured interval and are confirmed by the user. Warranties cannot acquire new assumed coverage. Completion can explicitly finish a schedule. Existing schedules default to fixed behavior.

An account-wide dashboard review section links to a paginated review page. Deep links can load a historical occurrence outside the initial 20-cycle detail preview without skipping intervening history pages. Archiving hides unresolved records from the dashboard review and blocks new activities. Existing histories remain readable.

## Hosted steps, before deploying

Hosted schema state has not been verified by this release. Local database tests do not apply migrations to Supabase.

1. Back up the database and stored objects and verify recovery. Record the deployed code version.
2. Run the complete `supabase/check-household-history-prerequisites.sql` in the existing project's Supabase SQL Editor. This is read-only and lists 32 migration markers in execution order.
3. Compare MISSING markers to actual migration history. Apply only confirmed missing prerequisite migrations in returned sequence order 1 through 31. The list covers core, items, history, entitlements, recurrence, categories, notification queues, provider fields, product types and public reactions. Do not rerun PRESENT or already confirmed migrations. Investigate discrepancies before proceeding.
4. Once prerequisites 1 through 31 are PRESENT, pause the notification and maintenance cron jobs. If row 32 is MISSING, run the complete `supabase/migrations/202610080031_household_activity_history.sql` in the SQL Editor. It is one transaction and includes a backfill of known completion facts. Do not rerun it if row 32 is PRESENT.
5. Rerun the read-only check. Every marker must be PRESENT before deploying matching code.
6. Deploy matching code to the controlled preview/staging environment. Verify authenticated completion, history, corrections, cancellation, errors, retry, late-cycle review, skip/reopen, document associations and account isolation. Test supported devices and ensure existing reminder links still work. Actual file upload/download, OAuth, notification delivery and payment checks remain provider-specific.
7. Restore both cron jobs after the compatible code and lifecycle behavior are verified. Confirm recurrence RPC execution and queue eligibility, then continue the established production release process.

No hosted migration or deployment was performed by local verification.

## Verification evidence

October 8, 2026: 262 unit tests and 158 isolated PostgreSQL integration tests passed. ESLint, TypeScript and the production build passed. The browser harness passed the actual completion, cost, service scheduling, correction audit, cancellation, removal, skip/reopen, late completion, validation, server failure and retry flows in desktop Chrome (1280px), mobile Chrome (390px), and mobile WebKit (390px). It also checked account-wide review links, historical occurrence links outside the initial preview, cycle pagination and horizontal overflow.

Existing HTTP smoke checks passed. Rendered public locale, canonical and structured-data presence, sample-account noindex, and private-route authentication checks passed. Public source pages and indexing rules are unchanged. Reports and screenshots are in `artifacts/household-history`. These local tests use Auth/REST stand-ins and do not verify hosted Supabase, actual Storage upload/download, Google OAuth, delivery/payment providers or physical devices.

## Local commands and scripts

Run from the repository root:

```sh
npm test
npm run lint
npm run typecheck
npm run test:db
npm run build
```

The modified `scripts/test-database.mjs` creates and removes an isolated local PostgreSQL database. It never connects to the configured hosted database. It runs the new `tests/database/household-history.mjs` module, including old-data migration fixtures, retries, concurrency, ownership, worker races, recurrence, corrections, document associations and pagination.

The new `tests/browser/household-history.mjs` runs real application pages and server actions against that isolated PostgreSQL database with local Auth and REST stand-ins. It starts and stops its own local Next.js server with local test credentials and delivery/payment flags disabled. It uses Chrome desktop/mobile and WebKit mobile. Google OAuth, hosted Supabase, real Storage uploads and physical devices are not verified by this harness.

With Playwright available as a module:

```sh
npm run test:household-ui
```

In this Codex workspace, use the supplied runtime module:

```sh
PLAYWRIGHT_MODULE=/Users/giancabrera/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs npm run test:household-ui
```

The harness uses local ports 34571 and 34572 and the existing PostgreSQL binary setting (`PG_TEST_BIN`, default Homebrew PostgreSQL 14). Chrome is the default Chromium channel; set `PLAYWRIGHT_CHROMIUM_CHANNEL=chromium` when using installed Playwright Chromium instead. Browser engines must already be available. Results and screenshots are saved to `artifacts/household-history`.

For HTTP smoke checks, start a separate local app and run:

```sh
SMOKE_URL=http://localhost:3000 npm run test:smoke
```

## Rollback

Retain the additive schema, audit records and legacy-completion capture trigger. Do not drop history tables or replay old migration definitions. An application rollback should preserve that trigger so old completion callers still record known history. Before using an older completion interface for service dates with `from_completion` policy, review those dates and return them to an explicitly agreed fixed policy, or keep the compatible completion service deployed.

## Delivery scope

This release completes the history/lifecycle foundation. Dashboard restructuring, shorter creation forms, readiness, payment forecasts, weekly briefs, expanded search and public demonstrations remain the subsequent releases in `docs/household-platform-refactor.md`.
