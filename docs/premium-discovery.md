# Premium discovery, trial experience and measurement

This release completes milestone 4 of the approved experience plan. It keeps a single Premium invitation on each dashboard, after the populated household's Free calendar and spending summary. Empty accounts still see their first-item action before the invitation. The invitation explains the 30-Day Spending Checkup and links to a clearly fictional sample. Billing and public plan cards now describe the Checkup, source expenses, monthly comparisons and extended Outlook together.

The gift celebration uses Keeply consistently and opens the Spending Checkup. That navigation waits for the acknowledgement response before leaving, so navigation does not cancel the acknowledgement. Escape and close still dismiss the celebration. Dismissing while that response is pending prevents later navigation. A failed acknowledgement does not remove Premium access or prevent opening the Checkup; it can be retried on the next visit without a second automatic attempt during close. Activation, prices, entitlement duration, stacking, once-per-account rules, prepaid terms, storage and legacy purchases are unchanged.

Expired access has an explicit state on the dashboard, Checkup invitation, planner invitation and billing. Trial expiry is identified using the authoritative installation period and the latest entitlement end, rather than assuming every former trial member has just lost a trial. Active paid, queued and permanent access suppress expired-trial messaging. Billing formats the expiry label on the server and passes it as text, avoiding different server and Safari locale separators during hydration. Claimed gifts are not offered again. The Free calendar, amounts, record actions, history and optional alerts remain available.

## Optional measurement

The existing Help improve Keeply preference controls linked measurement. The new private events store only a random receipt ID, account ID, event, coarse screen, optional 30/90/365-day horizon, optional insight kind, optional experiment variant and occurrence time. They never store household amounts, record IDs, names, household due dates, files, URLs, IPs or referrers.

- Actual visibility of at least a quarter of an invitation records a preview exposure. Rendering below the viewport does not count as exposure. A preview and expiry message are each counted once within the current screen/horizon visit.
- Private Checkup, Free planner, extended planner and billing opens are measured. Changing a contributor filter or cursor does not itself create another feature-open event. Source inspection records only the insight kind, without the record ID or link URL.
- Optional client requests are separate bounded POST requests, not Server Actions that queue behind the household's saves. Failed measurement is dropped without blocking the task. The endpoint checks origin, authentication, a strict field allowlist and a 1 KB body limit. The database checks consent again and limits volume. Receipt IDs deduplicate retries. Clients cannot report verified purchases or trial activation.
- Trial activations and verified Premium purchases are measured by a trigger on authoritative new entitlement grants. Reopening a gift, replaying a webhook or returning from checkout cannot create another activation event. Existing periods are not backfilled. These server events follow account consent, matching existing database-triggered save/completion measurement. The `ANALYTICS_ENABLED` environment flag controls client requests, not existing or new database-triggered events.
- Checkout starts, verified buyers, repeat purchases and trial-to-paid outcomes are derived from the billing and entitlement ledger in the private report. A checkout means an attached provider checkout, not a button click or an unfulfilled draft. Current verified purchase counts exclude refunded orders and orders from the other billing mode. The purchase path and its lock ordering are unchanged.
- Opt-out serializes with event writes and deletes new events and experiment assignments along with existing linked measurement data. Re-enabling does not backfill activity while consent was off. Account deletion cascades. Existing scheduled maintenance removes raw events after 90 days. No new job or worker cutover is needed.

Existing Free save, alert opt-in, completion and return-cohort measurements remain the guardrails for core use. Measurement is optional and cannot establish that a purchase or feature use was caused by a presentation change.

## Presentation experiment

The default is the contextual placement below Free planning. `PREMIUM_DISCOVERY_EXPERIMENT_ENABLED` defaults to off. Do not enable it for this rollout.

When explicitly enabled alongside `ANALYTICS_ENABLED=true`, consenting accounts receive a stable account assignment. Control shows the single invitation before the calendar; contextual shows it after the calendar. Empty accounts keep their first-item action ahead of the invitation in both presentations. Both receive identical features, copy, prices and trial rules. Nonconsenting accounts always receive the contextual placement, without an assignment or exposure event. No browser identifier or additional cookie is used. The minimal assignment persists until opt-out or account deletion, keeping presentation stable across visits and devices.

The implementation can support a later limited placement experiment, but it has not been launched on hosted accounts. First collect baseline exposure, repeat feature use, verified conversion and Free guardrails. Before launch, fix the eligible cohort, minimum detectable effect, sample size, observation period and stopping rule using that baseline. Do not repeatedly stop when a favourable result appears. No conversion improvement is claimed by this release.

Operators can inspect the reports in Supabase SQL Editor with their existing privileged access:

```sql
select * from private.premium_engagement_daily order by day desc, event, surface;
select * from private.premium_conversion_report order by variant nulls first;
```

Both reports are private. The conversion denominator is consenting accounts with a measured dashboard preview in the retained 90-day event window. `variant IS NULL` is the baseline with the experiment off. An account can appear in baseline and assigned cohorts if the experiment setting changed during the retained window. Purchases must have been created after the cohort's first exposure. Repeat buyers have at least two currently paid purchases after that exposure. Trial-to-paid additionally requires a nonrevoked installation period beginning before the qualifying purchase. These are observational, bounded cohorts, not lifetime or causal conversion statistics.

## Hosted rollout

On October 11, 2026, the owner confirmed the previous Outlook rollout, including migration 038 and all 39 prerequisites. Do not rerun migrations 034 through 038. The agent has not independently inspected hosted state or verified installation on physical devices.

Before deploying this release:

1. Run the complete [read-only prerequisite query](../supabase/check-premium-discovery-prerequisites.sql) in hosted Supabase SQL Editor. There are 40 rows. Reconcile any unexpectedly missing earlier prerequisite before applying a later migration.
2. If rows 1 through 39 are `PRESENT` and row 40 is `MISSING`, run the complete [202610110039_premium_discovery.sql](../supabase/migrations/202610110039_premium_discovery.sql). It adds private optional measurement, reporting, stable experiment assignments, and expiry fields to the existing usage response. It preserves existing usage fields and RPC signatures. Skip migration 039 if already present.
3. Rerun the prerequisite query and require all 40 rows to be `PRESENT` before deploying matching application code.
4. Keep the existing analytics preference and `ANALYTICS_ENABLED` configuration. Leave `PREMIUM_DISCOVERY_EXPERIMENT_ENABLED` unset or `false`. Preserve existing payment and delivery configuration. This release does not establish hosted payment, email, push or installation acceptance.
5. On the hosted site, check Free, active Premium and expired trial accounts, sample navigation, settings opt-out and the new billing explanation. Physical installation, OAuth return and payment-provider acceptance still require controlled checks on the supported real devices and providers before enabling unverified actions.

Migration 039 and the before/after prerequisite checks were exercised only in disposable local PostgreSQL. Hosted SQL and application deployment have not been performed by the agent, and migration 039 is not yet confirmed on hosted Supabase.

## Local verification

The updated [database harness](../scripts/test-database.mjs) invokes the new [Premium discovery database module](../tests/database/premium-discovery.mjs), which is not standalone. It covers consent, concurrent assignment and retry deduplication, ownership, execution grants, input validation, server-generated activation, purchase replay, current-mode/refund reporting, baseline reporting, opt-out races, retention through existing maintenance, account deletion, and trial/paid/permanent/queued entitlement states.

The updated [private browser suite](../tests/browser/household-history.mjs) checks calendar priority, one invitation, keyboard sample navigation, measurement failure without interrupted navigation, explicit expiry, claimed-gift suppression, billing, consented engagement, source navigation, both experiment placements, consent changes through Settings, opt-out deletion and subsequent client navigation, gift CTA failure/retry and cancellation while acknowledgement is pending. Network faults and delayed acknowledgements are controlled by the local REST stand-in. The existing [public suite](../tests/browser/public-experience.mjs) checks the fictional sample and rendered marketing SEO.

Run from the repository root:

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm run test:db
export PLAYWRIGHT_MODULE=/Users/giancabrera/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs
PG_TEST_PRODUCTION=1 PG_TEST_DISCOVERY_EXPERIMENT=1 npm run test:household-ui
node tests/browser/public-experience.mjs
```

For concurrent local runs, private browser ports can be selected with `PG_TEST_API_PORT`, `PG_TEST_APP_PORT` and `PG_TEST_TLS_PORT`. Public browser ports use `PUBLIC_TEST_APP_PORT` and `PUBLIC_TEST_TLS_PORT`. Defaults remain unchanged. A stable isolated build copy is needed when another task is rebuilding the shared checkout.

The browser harness uses local Auth and REST stand-ins, real server actions, and disposable PostgreSQL. Browser viewports and standalone detection are simulations. They do not verify physical installation, hosted OAuth, real PayMongo checkout, Resend or push delivery. This Premium release preserves public metadata and indexing rules. Separate public-page work appeared in the shared checkout during verification and was preserved; later edits outside the tested snapshot are not covered by these results.

The local HTTPS WebKit harness retains cancelled-prefetch diagnostics separately. Classification requires a same-origin RSC prefetch error within 200 ms of a document navigation and at least two same-origin cancelled RSC requests within 100 ms. Other page errors, including hydration mismatches, still fail the run. These diagnostics do not establish behaviour on a physical Safari device with the hosted site's certificate.

## Verification evidence, October 11, 2026

- Production build, TypeScript and lint passed. All 346 unit tests and 242 disposable PostgreSQL integration checks passed, including migration 039 and its before/after prerequisite checks.
- [Private browser results](../artifacts/premium-discovery/private-browser-checks.json) cover Chrome at 1280 and 390 px and WebKit at 390 px, with zero unexpected page errors. All feature assertions completed. WebKit retained 13 correlated cancelled-prefetch diagnostics. Its harness also completed HTTP smoke checks. The Chromium test copy initially omitted a generated Sharp package alias; restoring that copied build file and independently rerunning the [HTTP smoke checks](../artifacts/premium-discovery/http-smoke.txt) passed. This repair restored only generated test-build files.
- [Public browser results](../artifacts/premium-discovery/public-browser-checks.json) passed Chrome at 1280, 390 and 320 px and WebKit at 390 px, with zero page errors. The [rendered SEO checks](../artifacts/premium-discovery/public-seo-checks.json) covered 17 routes and the ten sitemap entries in the tested snapshot. Canonical URLs, indexing, en-PH/en_PH metadata and structured-data fields were checked locally. This is not external rich-result certification. Later concurrent bill-page work and its additional sitemap entry are outside this snapshot.
- Local mobile Lighthouse scored [pricing](../artifacts/premium-discovery/lighthouse-pricing.report.html) 100 for performance, accessibility, best practices and SEO; [privacy](../artifacts/premium-discovery/lighthouse-privacy.report.html) scored 98/100/100/100. The [sample dashboard](../artifacts/premium-discovery/lighthouse-demo.report.html) scored 89/100/100/66. Its SEO score reflects the intended `noindex, nofollow` directive. These are local production measurements over a test HTTPS proxy, not hosted or physical-device results.

Screenshots for dashboard priority, expiry, active/expired billing, pricing and the gift celebration are retained in `artifacts/premium-discovery`. [The source manifest](../artifacts/premium-discovery/tested-source-sha256.json) confirms that the 29 Premium source, migration and private/database test files match the isolated build snapshot. The shared public browser harness received additional bill-page checks afterward; those concurrent changes were preserved.

The next approved milestone is the periodic Household Review. It can follow as a separate release after this rollout; optional spending-change snapshots and what-if scenarios remain deferred.
