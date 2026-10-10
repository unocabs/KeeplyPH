# Household Premium rollout

The October 10 release positions Premium around household planning. The sample dashboard links to a working year-ahead planner with monthly costs, saved obligations, clear estimates and missing amounts, and an editable sample amount. Core records, history, readiness, the weekly brief, alerts and next-30-day planning remain available after Premium expires.

## Installation gift

Install Keeply, then open it while signed in. The installed app automatically requests 30 days of full Premium and shows a happy, dismissible celebration with the account-local start and expiry time. There is no card, checkout or notification permission requirement. The app refreshes Premium access only when a new gift is created, so reopening an already-claimed gift cannot trigger repeated layout refreshes. The grant is serialized under the account lock and can be created only once per account, across devices and reinstallations. The dismissal is saved server-side. A failed activation shows a retry action without losing the gift.

Existing two-slot installation reward claimants can receive the new gift. Existing prepaid access is honoured and the gift starts after any remaining time. Existing permanent purchases retain Premium while Keeply operates. New Premium purchases cost ₱59 for 30 days or ₱499 for one year, are prepaid, and never charge automatically. Refund handling removes only the refunded purchased access and preserves the duration of later gift and paid periods. File-storage allowances are separate.

Installation is detected through the browser's standalone/minimal-ui display mode or iOS standalone signal. This is a client signal, not a cryptographic proof of installation. An authenticated person can imitate the signal; the account-wide database constraint still prevents repeated grants. The reward does not depend on push service configuration or notification permission. Chrome documents menu installation independently of the former service-worker fetch requirement in [its installation criteria update](https://developer.chrome.com/blog/update-install-criteria). Apple describes supported Mac installation in [Use Safari web apps on Mac](https://support.apple.com/en-ca/104996). [WebKit’s Safari 17.2 notes](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/) describe cookie copying on installation. These platform capabilities do not establish that Keeply’s hosted sign-in return path has passed a real-device test.

## Alerts and email capacity

Paid item-slot restrictions are retired. Saved opt-ins and custom alert timings are preserved. New dates default to one advance alert, with an optional due-day alert. New warranties default to 30 days before expiry. Bills and recurring payments default to one day before. Email jobs due on the same local day are grouped into one household email per account. No reminder email is generated on quiet days. Push follows the selected date timings independently.

The worker rechecks completion, amount, item name, due date, account preferences, email address, archive/deletion and delivery suppression before sending. Changed batches are cancelled and rebuilt from eligible records. Definitive provider rate-limit rejections can retry with the same immutable content and idempotency key. Ambiguous network/server outcomes are marked unknown and are not automatically resent. Delivery/bounce/complaint callbacks apply to every date in the group. Up to 20 dates are shown in the email; larger groups include an explicit remaining count and a link to the household overview.

Email content and snapshots are cleared by the normal maintenance job after two days once a batch is no longer sending or retrying. Final batch metadata is removed after 90 days. Account deletion cascades to gifts and batches.

The existing global email allowance remains 90 reserved attempts per UTC day, shared with optional ideas. Reservations include retries and claimed work that may be cancelled. Grouping reduces usage but does not guarantee capacity for unlimited accounts. Review Resend's current plan limits and queue usage before enabling delivery at scale. Due jobs that miss their account-local day are skipped instead of sending stale reminders. This implementation does not increase the provider plan or provision a paid email service.

## Required hosted steps, in order

Schema confirmation update, October 10, 2026: the owner supplied a prerequisite-check screenshot confirming migrations 034 and 035 as `PRESENT`, along with shared planning migration 036. Do not rerun these migrations. The original rollout steps below remain reference material for provider acceptance and worker cutover, which a schema-presence screenshot does not verify.

The owner confirmed all earlier 34 migrations as applied on October 9. Do not rerun them.

1. Pause the notifications cron (the existing `keeply-reminders` job in Supabase Cron, if using `supabase/schedule.sql`) and wait for any running HTTP invocation to finish. This prevents old workers from consuming individual jobs while the grouping schema and application change. For an existing live payment setup, retain `PAYMENTS_ENABLED=true`, the live PayMongo configuration and the live database billing mode so webhook fulfillment and reconciliation continue. The Premium migration retires creation of new slot orders while preserving already-created checkouts; the old checkout screen can be temporarily unavailable between migration and deployment. Keep the new Premium checkout gate disabled until its acceptance checks pass.
2. In the hosted Supabase SQL Editor, run the read-only [`supabase/check-household-premium-prerequisites.sql`](../supabase/check-household-premium-prerequisites.sql). Rows 1 through 34 must be PRESENT. If either new row is already PRESENT, do not rerun that migration. If an earlier prerequisite is unexpectedly missing, stop and reconcile that database's history first.
3. If row 35 is MISSING, run the complete [`supabase/migrations/202610100034_household_premium.sql`](../supabase/migrations/202610100034_household_premium.sql) in the SQL Editor. It creates Premium access, one-time installation grants, new payment products, planner queries and the new warranty timing default, while preserving earlier records and purchases.
4. If row 36 is MISSING, run the complete [`supabase/migrations/202610100035_household_email.sql`](../supabase/migrations/202610100035_household_email.sql) next. It creates durable household email batches, retires slot-expiry messages and the obsolete feedback slot promotion, and safely classifies unresolved legacy email work. Do not reverse this order.
5. Rerun the read-only prerequisite check and confirm all 36 rows are PRESENT. Both migrations have been applied only to disposable local PostgreSQL during this implementation. This chat has not applied them to hosted Supabase.
6. Deploy this application code. Set `PREMIUM_PAYMENTS_ENABLED=false` initially. It is an additional server-side gate alongside `PAYMENTS_ENABLED`. For existing live payments, keep `PAYMENTS_ENABLED=true` and `PAYMONGO_MODE=live`, with the matching live keys and database billing mode. Setting `PAYMENTS_ENABLED=false` also rejects payment webhooks and skips scheduled payment reconciliation. The Premium gate only blocks creation of new Premium checkouts. Leave existing unrelated configuration in place. The installation gift needs neither payment flag, a card nor a payment-provider key.
7. Run the hosted checks below. Resume the notifications cron with delivery enabled only after the grouped-email inbox and webhook checks pass. For payment acceptance, use a separate test-mode database whose `private.billing_settings.live` matches `PAYMONGO_MODE=test`. Enable both payment flags only in that test environment during testing. Enable new live Premium checkout only after provider verification and live configuration are complete.

These are the only new migrations for this release. They must precede the matching application deployment. Do not deploy the new worker against the previous schema or continue running the old worker against the new schema.

## Hosted and physical-device acceptance

These checks still need the owner's environment:

- In a real account, open `/planner?days=365` before claiming the gift. It should show the 30-day view and installation invitation. Confirm a direct longer-horizon request cannot bypass Premium.
- On an iPhone/iPad using Safari, Android using Chrome, and any desktop browser where installation will be advertised, install the real hosted site. Launch its installed icon, sign in if needed and confirm the celebration appears, Premium is immediately usable, and no card or notification permission is requested. Dismiss with the button and Escape where available. Reopen and reinstall, then try a second device. The gift must not repeat. Confirm blocked/off notifications do not prevent activation. Local emulation does not verify native installation or the installed OAuth return path.
- For an already-paid account, verify the gift is added after prepaid time and historical permanent access remains active. In a separate test account with expired Premium, verify records and alerts remain accessible and planning returns to 30 days.
- In a controlled inbox, save two reminders due to alert on the same local day. Run the normal cron after their scheduled time. Confirm one message includes both. Complete or edit a reminder between claim and preparation and confirm stale content is not sent. Verify delivered/bounced/complained events update all member jobs and suppression works. Do not send intentional bounces to real customers.
- In PayMongo test mode, verify 30-day and annual checkout, cancellation/return, pending checkout resume, verified webhook activation, webhook replay, reconciliation, failed provider requests and a full refund. Returning from checkout must never activate Premium by itself. This chat has not contacted PayMongo or sent real Resend messages.

## Local scripts and verification

[`scripts/test-database.mjs`](../scripts/test-database.mjs) was updated to test historical contracts, apply the two cutover migrations, then run the new [`tests/database/household-premium.mjs`](../tests/database/household-premium.mjs). This preserves historical regression coverage and checks the new schema separately. Email fixtures create future jobs before moving them into the delivery window so the checks work before and after the normal morning delivery hour. It creates and destroys an isolated PostgreSQL database, never connecting to hosted Supabase. Run:

```sh
npm run test:db
```

`PG_TEST_PREMIUM_ONLY=1 npm run test:db` applies the entire migration chain and runs just the new Premium cases for development. The full historical suite was also run during implementation.

[`tests/browser/household-history.mjs`](../tests/browser/household-history.mjs) was updated to test actual application server actions against isolated PostgreSQL with local Auth/REST stand-ins. It waits for streamed server-action POST responses to finish before forcing a new navigation, retains browser error diagnostics including recent failed requests, and covers the installation guide, simulated standalone activation, failed activation and retry, modal dismissal, duplicate prevention, Premium access and expiry, sample amount validation/cancellation, and responsive layouts. It does not prove native installation or hosted OAuth/provider behavior. Run after a successful build:

```sh
PLAYWRIGHT_MODULE=/Users/giancabrera/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs PG_TEST_PRODUCTION=1 npm run test:household-ui
```

The updated public browser script verifies rendered metadata, schema fields, public/sample navigation and indexing. Run:

```sh
PLAYWRIGHT_MODULE=/Users/giancabrera/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node tests/browser/public-experience.mjs
```

These browser commands require Node 22, OpenSSL, installed Chrome and Playwright WebKit. The private harness uses ports 34571, 34572 and 34574; the public harness uses 34575 and 34576. `PG_TEST_BIN` can override the existing Homebrew PostgreSQL 14 binaries. Both harnesses start and clean up their servers. Payment, analytics and message delivery are disabled during local browser tests.

[`scripts/smoke.mjs`](../scripts/smoke.mjs) was updated to include the sample planner and private planner guard. Start the built app in one terminal, then run the smoke command in another:

```sh
npm run start -- --port 34573
SMOKE_URL=http://localhost:34573 npm run test:smoke
```

The new [`tests/unit/household-premium.test.ts`](../tests/unit/household-premium.test.ts) covers planner projections, exact totals, safe sign-in intent, pending-checkout presentation, email escaping, grouped delivery, cancellation and provider errors. Run it with the existing unit suite:

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

These scripts are local validation tools and do not need to be run against the hosted database. Local results and remaining limits are recorded below.


## Verification results

All execution below used local production builds, isolated PostgreSQL and local Auth/REST stand-ins. Hosted Supabase was not changed.

- 294 unit tests and 191 database integration tests passed. ESLint, TypeScript and the production build passed.
- The final authenticated browser run passed Chrome at 1280 and 390 pixels, and Playwright WebKit at 390 pixels, with zero browser errors. The HTTP smoke checks also passed. Activation failure/retry, gift creation, dismissal, duplicate prevention, Premium expiry and the interactive sample planner were exercised. Physical installation and the hosted OAuth return path remain unverified.
- Public browser checks covered Chrome at 1280, 390 and 320 pixels, plus WebKit at 390 pixels. Rendered metadata and indexing were inspected on 15 routes. The ten public sitemap pages retained their canonical URLs; sample and private planner pages remain excluded. Rendered JSON-LD parsed successfully and the WebApplication feature list includes Premium household planning. This is local structured-data validation, not a Google Rich Results certification.
- Nine mobile Lighthouse audits ran against a local production HTTPS server. The eight audited public pages scored 96–98 for performance, 100 for best practices and 100 for SEO. Accessibility was 100 on home, pricing, terms, aircon and loan pages, and 96 on the existing document, vehicle and warranty pages because of badge colour contrast. The sample dashboard scored 88 for performance and 100 for accessibility and best practices. Its SEO score of 66 reflects intentional noindex. Lighthouse scores vary with machine load.
- The gift effect and amount-editor saves use the React action-transition pattern required by the installed Next.js guides. This was added while investigating WebKit request errors during historical amount-editor navigation. Request tracing showed that the browser harness was cancelling a still-streaming server-action POST when it forced the next page load after visible success. The harness now drains pending action responses before navigation and continues to fail on browser errors.
- Screenshots were inspected for the celebration modal, sample dashboard and planner on desktop and mobile. No horizontal overflow was found in the checked browser widths.

The retained evidence is in `artifacts/household-premium/`, including the Lighthouse summary and complete reports. No real PayMongo checkout, Resend send or physical-device installation was performed. Keep the new paid checkout gate disabled until the hosted acceptance checks above pass.
