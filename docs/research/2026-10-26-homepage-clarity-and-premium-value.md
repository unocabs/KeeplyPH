# Homepage clarity and Premium value

Date: 26 October 2026. Owner authorised focused implementation after reviewing the problem-first plan. The earlier image concept remains discarded.

## Problems and evidence

1. The supplied homepage screenshot places decorative artwork around a large introduction before showing the product. A visitor has to scroll to understand how dates, outcomes and records connect.
2. The homepage presents many categories and repeated explanations at similar prominence, increasing the amount to interpret before starting with one useful item.
3. The public Premium offer lists longer planning and insights but gives limited explanation of the practical decision they support. The previous three-month example included a partial current month alongside complete months and listed next payments rather than the expenses behind a higher monthly total.

These are owner feedback and interface/source observations. They are not validated claims about conversion or customer demand. The research index and baseline sections 2, 5.3, 10 and 11 informed the interpretation.

## Changes and expected outcomes

- Replace decorative homepage artwork with a compact preview using the same sample records, occurrence amounts and payment totals as the application. Keep the existing headline, overall visual identity, clear sample labelling and general demo CTA.
- Reduce the supporting explanation to bills, maintenance and purchase/warranty records, each with actual sample content and a working route into the sample account. Keep item artwork and names together. Retain the public bill, maintenance and warranty guides.
- Show the three household priority categories first. Keep all other category identifiers and destinations available in an ordinary keyboard-accessible disclosure.
- Use one shared Premium example on the homepage and pricing page. Compare the next two complete calendar months, retain estimates and missing amounts, show some contributing expenses with artwork, and link to the matching sample month and total. A partial current month is never compared with a complete month in this marketing example.
- Explain the difference between Free and Premium, reword existing paid benefits around preparation, and expose installation instructions and Free continuity at expiry on pricing. Keep prices, entitlements, installation eligibility and checkout logic unchanged.
- Use Keeply in the shared wordmark and accessible name, preserving the existing logo and date.
- Keep item artwork in the Outlook contributor list and highest-cost summary, using available row identities and the existing icon fallback.

Expected benefit: visitors can understand the everyday task, start with one item and explain a practical reason to choose Premium with less interpretation. This remains a hypothesis until observed with households.

## Journey issue found during review

Local production WebKit checks reproduced a public plan link carrying a different product through sign-in. Waiting for the page to settle did not resolve it; an independent reproduction also observed the wrong product. Public plan entry links now use a native document navigation so the clicked URL reaches the server directly. Authenticated checkout forms, server prices and order processing are unchanged. Installed Next.js Link/prefetch guides and the find-docs lookup informed this narrow fix; the precise framework cause has not been established.

The 320 px doubled-text check also found overflow in public navigation, the hero heading and the footer. Public headers and the homepage footer now wrap, and homepage/pricing content permits long words to wrap when necessary.

## Technical validation

Production build, lint and all 409 unit tests passed locally. The [validation summary](../../artifacts/homepage-clarity/validation.json) links the evidence through files in the same folder. Focused browser journey assertions passed in Chrome at 1280, 768, 390 and 320 px and WebKit at 390 px. Both engines passed doubled text at 320 px and failed-image fallbacks at 390 px. The tested flows include category disclosure, item identities, matching sample month/totals, both paid-plan sign-in intents and the installation destination.

The updated [public-experience checks](../../tests/browser/public-experience.mjs) cover the revised presentation, preserved sample flows and sign-in intents. They were run locally against the production build with:

```sh
npm run build
PUBLIC_TEST_OUTPUT=artifacts/homepage-clarity node tests/browser/public-experience.mjs
```

All broader journey assertions completed in Chrome at 1280/390/320 px and WebKit at 390 px, including sample receipts, history, editing/cancellation, search, checkup and Outlook navigation. The complete suite still exits with failure because the strict console check sees local WebKit fetch/access-control diagnostics around same-origin RSC prefetch cancellation. Focused checks retained similar diagnostics. The raw outputs are preserved; these results do not establish a fully clean Safari verification. The precise cause and physical-device impact remain unverified. The final test source keeps the strict error assertion.

Rendered SEO checks passed across 18 routes, with public titles/descriptions/canonicals, en-PH/en_PH metadata, homepage JSON-LD, 11 public sitemap entries and private/sample noindex directives preserved. Structured data was parsed and checked locally; an external Rich Results Test was not run.

Lighthouse performance scores were 95 mobile and 100 desktop on the homepage, and 97 mobile and 100 desktop on pricing. Accessibility, best practices and SEO scored 100 in all four runs, with zero layout shift. These weighted scores are not an accessibility certification: the existing experimental shared-brand label-content-name mismatch finding remains. Standard unused-code and delivery recommendations are retained in the reports.

Desktop, mobile and pricing screenshots were visually reviewed. The earlier image proposal was not implemented. No further test execution or setup is required from the owner for this local review; the command above is for reproducing the checks and its known limitation.

## Household validation to run after technical review

Recruit a small initial group beyond enthusiastic existing users. Treat this as qualitative usability work, not an estimate of national demand. Obtain consent and avoid retaining private account details, financial documents or household-sensitive records.

Give participants these tasks without coaching:

1. After looking at the homepage, explain what Keeply helps you do and choose where you would start.
2. Explain what Free includes, what Premium changes and whether either fits a recent household problem. Use the sample account to investigate their own question about an upcoming month.
3. Save one real obligation in their own account, find it again and explain its date, amount and next action. Participants may keep private details off screen and omit uploads.
4. At the next relevant obligation date, check whether they return, record the outcome and can retrieve the record. Include corrections and recovery where they naturally occur.
5. After using Premium, record a voluntary purchase or decline and the participant's reason. Follow actual purchasers through renewal and expiry. Keep installation gifts separate from paid purchases.

Record misunderstandings, needed prompts, task completion, useful outcomes, purchase/renewal behaviour and reasons for declining. Do not interpret demo clicks, gift activations or positive comments as willingness to pay. Use findings to revise the explanation or the existing flow before proposing features or changing Free benefits and prices.

## Limits

Browser emulation and local checks do not establish physical-device behaviour or hosted Google OAuth, installed-app activation, paid checkout settlement and renewal. No real household usability study, new analytics collection or hosted deployment is included in this change. No claim about increased sales, reduced missed obligations or reduced mental effort has been validated.
