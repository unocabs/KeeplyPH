# Household public experience

Release 4 connects Keeply’s public presentation to the household features delivered in Releases 1 through 3. The existing headline, light lavender design, public URLs and general “Explore a sample account” CTA remain in place.

## What changed

The homepage shows calendar planning and the weekly brief, separate payment totals by certainty, actual maintenance history and category-aware readiness. Previews derive from the same fictional records and calculation functions as the sample account. Dates move with the sample account’s current day. The homepage links directly to those flows and a working sample receipt. The three-step explanation now follows keeping a record, reviewing attention and remembering completed work. FAQ answers explain amount confirmation and readiness without implying payments are made or household safety is assessed.

The sample dashboard has a shortcut to its capability guide and direct links to payment planning, maintenance history, receipts and warranties, readiness, the household brief and search. Calendar remains the default and List remains the second view. Sample changes are explicitly described as unsaved previews.

Homepage structured data lists the implemented capabilities. Titles, descriptions, canonicals, en-PH language, en_PH locale, public sitemap entries and private/demo noindex directives are preserved.

## Local verification

Passed locally on October 9, 2026: lint, typecheck, 272 unit tests, production build and HTTP smoke checks. Production browser checks passed in all four contexts below with zero page errors. The local HTTPS proxy forwards its secure protocol and host, and the harness waits for completed client navigation before starting another page load.

Rendered SEO checks passed on all ten public sitemap pages, the sample dashboard and payment plan, and the protected private payment route. JSON-LD parsed successfully and required WebSite/WebApplication fields and the new feature list were checked locally. This is not external rich-result certification.

Local mobile Lighthouse scores:

| Page | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| Homepage | 97 | 100 | 100 | 100 |
| Sample dashboard | 90 | 100 | 100 | 66 |

The demo SEO deduction is the intentional noindex directive. Measurements use a local production build and simulated mobile throttling, not the hosted site or physical devices. Browser reports, rendered SEO evidence, Lighthouse JSON and screenshots are saved in `artifacts/household-public/`. The script and audit commands below have already been run locally and are optional regression checks for the owner.

The new `tests/browser/public-experience.mjs` checks the production build over temporary local HTTPS, keeping the application’s production security policy enabled. It starts and stops the local app and proxy, creates and removes a temporary certificate, and accepts that certificate only in its browser contexts. It disables analytics, payments and notification delivery for the local server.

Run from the repository root after building:

```sh
npm run build
PLAYWRIGHT_MODULE=/Users/giancabrera/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node tests/browser/public-experience.mjs
```

The script requires Node 22, OpenSSL, installed Chrome and Playwright WebKit. Ports 34575 and 34576 must be free. If Playwright is installed in the project, the module override may be omitted. The optional `PLAYWRIGHT_CHROMIUM_CHANNEL` selects an installed Chromium channel, with `chrome` as the default.

It verifies desktop Chrome at 1280 px, mobile Chrome and WebKit at 390 px, and narrow Chrome at 320 px. Checks include matching preview/demo figures, keyboard navigation, Calendar/List switching, capability links, payment/history cancellation, search, readiness filtering, the sample receipt opening and FAQ disclosure controls. It also verifies rendered metadata on all ten public sitemap pages, demo noindex, the signed-out private route guard, structured-data fields, robots and sitemap output. Reports and screenshots are saved to `artifacts/household-public/`.

For optional Lighthouse checks, add `PUBLIC_TEST_HOLD=true` to the browser command to leave its local HTTPS server running after successful checks. In a second terminal, run:

```sh
npx lighthouse@13.5.0 https://localhost:34576/ --chrome-flags="--headless --no-sandbox --ignore-certificate-errors" --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=artifacts/household-public/lighthouse-home.json --quiet
npx lighthouse@13.5.0 https://localhost:34576/demo --chrome-flags="--headless --no-sandbox --ignore-certificate-errors" --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=artifacts/household-public/lighthouse-demo.json --quiet
```

Stop the held browser command with Ctrl+C afterwards. Its cleanup stops the local server and removes the temporary certificate. Test certificate trust does not change the application’s security headers or system certificate trust.

## Deployment status

On October 9, 2026, the owner confirmed all 34 migrations are applied in hosted Supabase and supplied the prerequisite output showing the current migration markers as PRESENT. Do not rerun confirmed migrations.

The application has not been deployed by this chat. After deploying the matching code, verify real private-account persistence and the public/sample pages on the hosted site. Hosted OAuth, private Storage, payment providers, delivery and physical devices are separate checks; local browser emulation does not establish those integrations.

All four planned implementation releases are complete locally. Deployment and hosted acceptance checks are the remaining rollout work.
