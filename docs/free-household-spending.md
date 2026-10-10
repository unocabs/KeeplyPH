# Free household spending clarity

Milestone 1B of the approved experience plan improves the existing Free spending summary and amount editors. It uses the shared planning foundation from milestone 1A.

The dashboard uses “Your Total Household Spending” and “Based on the expenses you've added to Keeply.” It shows the account-local start and end dates for the existing inclusive 30-day range. Totals still come from the full account, independently of the current page of payment rows.

Estimated costs show their peso contribution to the total. Older saved amounts retain their existing certainty and are described separately from confirmed amounts. Payment rows and the record amount editor label confirmed and estimated costs explicitly.

No upcoming expenses, expenses with unknown amounts, and known zero costs have distinct messages. Missing amounts receive guidance and a link to the existing Free payment editor. The empty summary links to the existing bills chooser. Missing-cost guidance counts only dates already recognised by the payment plan, including applicable saved costs. It does not assume that every household date has a cost or invent a household spending completeness percentage. The separate record-details checklist is unchanged.

Saving an amount still affects only the selected date, preserves its schedule, and does not record a payment or completion. Blank means unknown; zero means a known zero cost. Estimated amounts can be replaced with confirmed amounts. The existing explicit payment action, cancellation, validation, retry, history, projected-date restrictions, and schedule reset remain available.

## Verification and commands

The modified [private browser suite](../tests/browser/household-history.mjs) runs through [the isolated database harness](../scripts/test-database.mjs). Its new flow checks the empty summary's bills link, unknown amounts, zero, estimated-to-confirmed changes, a return to unknown, persisted certainty, unchanged schedule amounts, and absence of invented payment history. It also reruns existing cancellation, validation, failed-save retry, payment, history, Premium, and sample flows.

The modified [public browser suite](../tests/browser/public-experience.mjs) compares the shared sample total using the updated wording and checks public navigation, responsive layouts, metadata, indexing, structured-data fields, and sitemap entries.

Run from the repository root with the available local Playwright runtime:

```sh
npm test
npm run lint
npm run typecheck
npm run build
export PLAYWRIGHT_MODULE=/Users/giancabrera/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs
PG_TEST_PRODUCTION=1 npm run test:household-ui
node tests/browser/public-experience.mjs
```

The private browser command creates and destroys disposable local PostgreSQL data. Auth and REST are local stand-ins; application server actions and SQL functions are real. The public command starts temporary local production servers. Neither command writes to hosted Supabase or verifies physical devices or external providers.

The unit suite passed 320 tests, including all-unknown, saved-zero, zero-estimate, and full-account missing-count states. Lint, TypeScript, and the production build passed locally on October 10, 2026. The database suite passed 213 checks. Public production browser checks passed in Chrome at 1280, 390, and 320 px and WebKit at 390 px; rendered SEO checks covered 15 pages. Structured data was parsed and its required fields checked locally, without external rich-result certification.

The full private production browser suite passed in desktop Chrome (1280 px), mobile Chrome (390 px), and mobile WebKit (390 px), including the new Free amount states and existing cancellation, validation, failed-save retry, payment/completion history, trial activation, and expiry flows. An initial run timed out waiting for a trial action response before navigation; an isolated full rerun passed. The navigation timeout now includes pending request URLs and whether they are server actions to make future failures diagnosable. See the [private browser results](../artifacts/household-spending/private-browser-checks.json), [public browser results](../artifacts/household-spending/public-browser-checks.json), and [rendered SEO checks](../artifacts/household-spending/seo-checks.json).

[The local mobile Lighthouse audit](../artifacts/household-spending/lighthouse-demo.json) scored 91 for performance, 100 for accessibility, 100 for best practices, and 66 for SEO. The sample remains intentionally `noindex`. Public metadata, canonical URLs, indexing rules, structured data, and sitemap code are unchanged.

Visual review covered the [desktop summary](../artifacts/household-spending/chromium-1280-summary.png), [390 px summary](../artifacts/household-spending/chromium-390-summary.png), and [320 px summary](../artifacts/household-spending/chromium-320-summary.png), with no horizontal overflow. These are local browser sizes, not physical-device verification.

## Before deployment

On October 10, 2026, the owner confirmed the required foundation migrations 034, 035, and 036 as `PRESENT` with a prerequisite-check screenshot. Do not rerun them. No hosted SQL or deployment was performed by the agent. See the [recorded foundation confirmation](household-planning-setup.md#hosted-prerequisites-and-deployment-order). The subsequent Checkup release follows its separate [deployment instructions](household-spending-checkup.md#hosted-deployment).
