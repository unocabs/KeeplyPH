# Keeply Google Analytics

Updated 29 October 2026.

## Purpose and scope

Help the owner identify where people move from a public guide or sample account to checking a schedule and saving a real reminder. This is owner-requested measurement, not evidence that those clicks improve household outcomes. Compare results with actual feedback and save reliability before changing the product. Declined consent, blocked tags and disabled account measurement leave gaps in the funnel.

The GA4 property is `561290459` in account `413873710`. The GA4 web stream supplied and verified in the owner's Analytics screen is `G-MWGXHE0FDJ`, for `https://www.keeplyph.com`. It is a public identifier. Keep credentials and Measurement Protocol secrets out of browser code.

## Deployment configuration

These **server runtime environment variables** were saved to the Production environment of Vercel project `keeply-ph` on 29 October 2026. Vercel confirmed that a new deployment is needed for them to take effect:

```dotenv
GOOGLE_ANALYTICS_MEASUREMENT_ID=G-MWGXHE0FDJ
GOOGLE_ANALYTICS_ENABLED=true
```

Deploy this source change through the normal release flow to activate tracking. The existing hosted deployment has not been replaced. Leave `GOOGLE_ANALYTICS_ENABLED=false` on development and preview deployments. The local ignored `.env.local` contains the verified ID with collection disabled. `ANALYTICS_ENABLED` continues to control Keeply's separate internal counters. It is independent of Google Analytics.

No default production property is hardcoded in application code. Missing or invalid configuration renders no Google integration or consent control. A configured integration loads Google's script only after explicit browser consent. The existing CSP nonce authorizes the script; the CSP permits only the Google endpoints used by this integration.

## Events

| Event | Trigger | GA4 key event |
| --- | --- | --- |
| `calculator_anchor_click` | A link to `/lto-registration-renewal#renewal-calculator`, including the homepage, hero, contents, guide and heading links | Yes |
| `check_schedule` | Activation of the calculator submit button, including an implicit Enter-key submission and invalid input attempts | Yes |
| `set_reminder_click` | An enabled reminder link in the calculator or guide | Yes |
| `calculator_result` | A submitted calculation produces a valid schedule | No |
| `calculator_error` | A calculation fails validation, including native year validation | No |
| `sample_account_open` | A link into the sample account | No |
| `reminder_saved` | A successfully acknowledged new date-bearing household record, a new date added to an existing vehicle, or a new purchase with a warranty | Yes |
| `page_view` | Initial permitted page load or a different normalized route | No |

Existing-record edits, failed saves, cancellations, records without a date and sample reviews never count as `reminder_saved`. A form only emits its successful-save event once. The integration does not claim that an enabled alert was delivered. Repeated schedule checks are events, not unique people.

The curated `surface` parameter identifies `home`, `guide_hero`, `guide_navigation`, `guide_overview`, `calculator`, `guide_faq`, `guide_costs`, `guide_footer`, `public_page`, or `app`. No link text, arbitrary dataset values or form values are sent. Page paths and titles use static labels. Private record IDs become `/items/record` or `/purchases/record`, with an optional `/edit`. Sample routes collapse to `/demo`. Unknown routes are excluded. Hash-only and query-only navigation does not add a page view.

## GA4 administration

**Configured in GA4 on 29 October 2026:** all four key events below, session/event counting as described, no default monetary values, the event-scoped CTA location dimension, Philippines time, PHP currency, two-month user and event retention with activity-based retention reset off, Google signals off, user-provided data collection off, and ads personalization disallowed in all 307 regions. Enhanced measurement is off.

For this stream, keep **Enhanced measurement** disabled. The app supplies manual page views and its explicit events. Automatic form interaction, search, outbound-link and history tracking can collect unwanted values or create duplicates. Also leave Google signals and advertising personalization off.

In Admin, Events, register these exact case-sensitive key event names, without creating page-view-based copies:

```text
calculator_anchor_click
check_schedule
set_reminder_click
reminder_saved
```

Use once-per-session key-event counting for the three intent events, and once-per-event for successful saves. Normal event counts still show repeat actions. Do not assign a monetary value to these events. Register one event-scoped custom dimension named **CTA location**, with event parameter `surface`.

Use Philippines reporting time and PHP currency. Set event-data retention to two months and review data-sharing preferences. Retention does not apply to every aggregate report. Keep Google Ads and other advertising integrations disconnected unless separately authorized.

Start with Reports for traffic acquisition and device categories, then use an Exploration with guide page view, calculator anchor, valid result, reminder CTA and successful save. A person can skip the anchor or save without using the calculator; do not interpret an enforced sequence as every visitor's journey. Public and account opt-ins are different, so a missing save event does not by itself establish abandonment.

## Consent and data boundaries

The browser remembers an explicit choice for 180 days. Analytics cookies expire after 90 days and may renew on later visits. The initial consent prompt closes after Allow or Decline, with no persistent floating button. Analytics choices remains available in Settings under Analytics in this browser, in sample Settings, and on the public Privacy page without signing in. The controls appear only when the integration is configured and enabled. Declining disables collection and clears this site's `_ga` cookies. A storage failure falls back to a page-session choice. Withdrawal in another tab updates the current page.

Private routes and successful saves additionally require the signed-in account's existing `analytics_enabled` preference. A failed preference lookup disables private measurement. The existing setting never grants Google consent by itself. Turning it off does not promise deletion of historical Google records. Google receives technical connection data to provide Analytics; this is described separately from Keeply's account-linked internal events.

Page queries and hashes are removed. Only public landing `utm_source`, `utm_medium` and `utm_campaign` slugs matching letters, digits, underscores and hyphens, up to 50 characters, are passed for attribution. Do not put personal information in campaign tags. External referrers are reduced to origins; internal referrers use normalized routes. Do not enable automatic user-provided-data collection, User-ID, or additional automatic event collection.

## Verification

Run the unit checks and production browser fixture:

```sh
npm test
npm run lint
npm run typecheck
npm run build
node tests/browser/google-analytics.mjs
```

The new browser script requires installed Playwright, its WebKit runtime, Chrome and OpenSSL. It starts temporary local servers on ports 34621 through 34623 and removes them when finished. It uses an isolated Auth/save API stand-in and a Google command-queue stand-in, never the hosted database or real Google collection. It writes reports and screenshots to `artifacts/google-analytics/`.

After deployment, allow analytics in a clean browser and verify the real stream in Realtime or DebugView. Check each requested key event, route transitions, a consented account's real save, declined consent and withdrawal. Check actual Google request payloads for sanitized locations and absent household details. Google’s installation checker alone does not verify custom-event receipt or the saved-reminder funnel. Record hosted verification separately from local fixture results.

## Local verification result, 29 October 2026

The production build, lint, type checking and all 415 unit tests passed. The browser script passed in Chrome at 1280, 390 and 320 px and WebKit at 390 px. It checks consent, reload persistence, withdrawal, cross-tab updates, failed script/storage handling, calculator anchor links, exact event counts, keyboard submission, invalid/valid calculations, reminder CTA navigation, sample review/cancellation, private preference gating and a failed real server action followed by a successful retry against the local save fixture. The two mobile engines exercised that retry. There were no unexpected page errors. Six narrowly matched WebKit cancellations of local self-signed HTTPS RSC prefetches were preserved as navigation diagnostics. These are not clean physical Safari verification.

Rendered homepage, calculator and privacy canonicals, language, Open Graph locale and parseable structured data were checked. Existing public metadata and structured-data content were preserved. Mobile Lighthouse results (performance/accessibility/best practices/SEO) were home 97/100/100/100, calculator 94/97/100/100 and privacy 96/100/100/100. The pre-existing calculator badge contrast and experimental shared-brand accessible-name findings remain. The first home Lighthouse run saw a local origin mismatch on the existing metrics endpoint; correcting the local APP_URL and rerunning removed that console finding.

See [browser verification](../artifacts/google-analytics/validation.json) and [the real-tag check](../artifacts/google-analytics/real-tag-check.json). The latter uses the real Google tag with synthetic local test data and debug-mode commands. Google returned HTTP 204 for page_view, check_schedule and calculator_result with sanitized locations. After withdrawal, no further Google collection requests appeared and Analytics cookies were removed. Chromium also reported aborted-request lifecycle notifications for those beacons; the observed HTTP responses are preserved in the report. GA4 DebugView had not yet listed a test device when checked, so report receipt remains unconfirmed. Production deployment, hosted OAuth/database saves, physical devices and real household outcomes remain unverified.

## Analytics control placement, 30 October 2026

The owner requested removal of the floating Analytics choices control after answering. The persistent control is now in Settings under Analytics in this browser, sample Settings, and the public Privacy page. Existing stored choices remain valid. Opening and closing the controls does not change consent; answering closes the prompt and restores focus to the opening button.

The production build, lint, type checking and all 426 unit tests passed. The updated existing browser command above was run with `GOOGLE_ANALYTICS_TEST_OUTPUT=artifacts/analytics-choice-placement`. Chrome at 1280/390/320px and WebKit at 390px passed both-choice persistence, absence of the floating button, Settings and Privacy access, cancellation/focus, withdrawal, cross-tab changes, blocked storage and the existing tracking/save fixture checks. Zero unexpected page errors and four narrowly matched WebKit prefetch-cancellation diagnostics are recorded in [the browser report](../artifacts/analytics-choice-placement/validation.json). Mobile Lighthouse performance was 95 on home and 97 on Privacy, with 100 accessibility, best practices and SEO on both; existing experimental shared-brand accessible-name and back/forward-cache findings remain. Public metadata and sitemap checks passed. This local run used Google/Auth/save stand-ins. Hosted deployment, physical devices and real provider delivery were not verified.
