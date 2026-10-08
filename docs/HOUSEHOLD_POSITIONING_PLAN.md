# Household positioning and rollout

Working plan updated October 8, 2026. Code changes are local and have not been deployed by this task.

## Positioning

Keeply helps people organise household obligations. Bills, maintenance, purchases, warranties, renewals and important dates are the organising focus. Alerts support the experience and additional alert capacity remains the paid entitlement.

Homepage: **Your household, a little more organised.**

Supporting copy: Keep bills, maintenance, warranties, and renewals together, with the dates and details you need when something needs attention.

Actions: **Start for free** and **Explore a sample account**.

Use Keeply without a geographic brand suffix. Keep en-PH language metadata and en_PH Open Graph locale. Currency, actual provider names, source attribution and necessary jurisdiction context in official guides remain accurate. No em dashes in assistant replies or customer-facing copy.

The initial audience is the person managing several household obligations across providers and scattered records. Household organisation does not imply shared family accounts, budgeting, automatic bill imports, payments, or unrestricted document storage.

## Implemented locally

- Homepage leads with household organisation and a full sample account. Concrete examples link to an existing bill, appliance warranty with a fictional receipt, and home maintenance history.
- One category source determines the homepage directory, picker, item filters, form option groups and dashboard category order. Existing category identifiers, records and sample links remain stable.
- Order: bills/utilities, home maintenance/services, purchases/warranties, subscriptions/memberships, loans/installments, vehicles, insurance, health/appointments, education/school, IDs/important dates, other important dates.
- Home maintenance choices lead with aircon and home services. Purchase choices lead with appliances/home. Insurance choices lead with home, health and life. Streaming and household memberships precede software/AI subscriptions.
- Category entry links open the matching section of the existing add flow. Unknown category values fall back to the full directory.
- The sample overview leads with electricity, internet, an appliance warranty, home maintenance, an installment and a car. Fictional data, sample document and non-saving actions remain clearly identified.
- Navigation, onboarding, login and overview wording support household items and their details. Alert status and delivery controls remain explicit.
- Brand suffix removed from UI, application manifest, email layout, metadata and generated social previews. Locale, public URLs, sitemap and indexing rules retained.
- Pricing describes additional alert capacity accurately. Unsupported original-price displays and the blanket “best option” designation removed. Prices and paid entitlements remain as before.
- Disabled upcoming-SMS promotion removed from the homepage, pricing and alert settings. SMS remains unavailable.
- Narrow-screen sample details grid fixed; item editing has a visible icon when its text is hidden on mobile. Sample-account badge contrast corrected.

## Next steps, in order

1. **Hosted readiness review.** Confirm the deployed version and actual notification/checkout configuration. Run controlled tests on physical iPhone and Android devices where offered. Check email, push opt-in/denial/revocation, reminder links, completion, cancellation, schedule changes and failed delivery. Review queue delays/capacity. Test checkout success, cancellation, delayed verification, failed payments and expiration in the appropriate provider environment. Existing local tests are not evidence these hosted flows work. Do not market unverified capabilities.
2. **Deploy and verify this presentation change.** Use the established release process after review. Recheck the hosted homepage, category routes, sample-account links, social image, metadata, canonical URLs, private route guards and indexing. Already installed apps may refresh their displayed name according to platform behavior. Check existing deployment EMAIL_FROM and OPERATOR_NAME settings for old branding without exposing or changing credentials.
3. **Recruit 12 to 15 household organisers for an exploratory pilot.** Ask about the last bill, service, renewal or warranty task before showing Keeply. Observe a real setup and retrieval task without coaching. Compare the same task with their existing method where feasible. Research and outreach have not been performed by this code task.
4. **Follow up after two to four weeks and at later actual obligations.** Observe independent setup, additional items, retrieval of details, date maintenance, useful action and actual purchases when more capacity is needed. Daily visits and compliments alone are not success measures. Annual obligations require longer observation.
5. **Review economics before changing packaging.** Model net revenue after payment fees and delivery, hosting, storage, support and refunds, including ongoing permanent-pack costs. Evaluate a simpler annual option only with evidence. Honour existing purchased entitlements. Automatic renewal requires a complete verified integration and cancellation/recovery flow.
6. **Fix observed friction before expanding acquisition.** Keep the first experience focused on one useful household obligation. Use existing guides and sample-account demonstrations to attract relevant users. Broader marketing follows evidence of useful independent use, purchases and sustainable operating costs.

## Measurement and decision rules

Use consented research and existing privacy-respecting analytics first. Aggregate landing counts do not establish a full individual conversion journey. Do not collect item names, identity details, document contents or sensitive payment information for analytics.

Track first useful item/date/active-alert setup, additional relevant items, delivery failures/delays, useful follow-through, purchases among people needing additional capacity, support/refund reasons and return at the next relevant obligation. Provider acceptance and email opens do not prove delivery to a device or task completion.

Before the pilot, agree on provisional success criteria: most participants set up independently, several add obligations voluntarily, and some eligible users actually purchase more capacity. Record denominators and reasons. A small pilot provides directional evidence, not proof of product-market fit.

If organisation is useful but paid capacity is rarely needed, revisit packaging. If free tools are equally convenient, revisit the audience or proposition. Requests for automatic imports require separate integration research rather than a copy change.

## Verification

Local results and limits are recorded in artifacts/household-positioning. Browser-engine checks do not establish physical-device behavior or hosted delivery/payment reliability. Structured-data checks inspect rendered JSON, types, URLs, names and locale; external rich-result validation has not been performed. Lighthouse scores describe the local production preview rather than hosted performance.

### Local verification completed October 8, 2026

- Type checking, ESLint, production build and all 255 existing unit tests passed. Existing demo and timeline expectations were updated for wording and sample ordering.
- The existing HTTP smoke suite passed public/demo routes, signed-out private-route guards, cron authentication and upload-origin rejection.
- Chrome and Playwright WebKit passed at 320, 390, 768 and 1280 pixels: homepage/demo navigation, category order, selected-category entry, search and empty results, picker cancellation, item category filtering, sample preferences, pricing quantity, warranty details, sample receipt viewing, date-entry cancellation and demo upload guidance. No horizontal overflow remained in checked pages. WebKit checks waited for pending requests to settle between automated navigations; rapid forced navigation had produced canceled-prefetch access-control errors in the local HTTPS setup. This does not establish physical Safari/device behavior.
- Homepage, picker, sample account and generated social-preview screenshots were inspected. The social image response is PNG at 1200 by 630 pixels.
- Rendered metadata checked on all ten sitemap pages plus demo, add and login. Canonical URLs, language, private noindex rules, application manifest and sitemap/robots references passed. Rendered WebSite/WebApplication and Article/BreadcrumbList JSON were parsed and relevant fields checked. Existing Article dateModified values were preserved; no publication dates were invented. External schema/rich-result validation remains unperformed.
- Lighthouse on the local production preview: all ten public pages SEO 100; performance 96 to 98. Homepage and pricing accessibility 100. Warranty/vehicle/document tracker pages retain existing badge contrast warnings (96); LTO guide retains existing badge contrast warnings (97). These are not hosted scores.
- Local EMAIL_FROM and OPERATOR_NAME settings do not contain the old brand suffix. Hosted settings were not inspected.

Evidence: browser-checks.json, seo-checks.json, lighthouse-summary.json and page screenshots under artifacts/household-positioning.
