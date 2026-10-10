# Keeply search positioning and AI visibility

Reviewed October 11, 2026 (Asia/Manila). Presentation changes are local until deployed.

## What the product does

Keeply is a household admin app for organising bills, home maintenance, purchases, receipts, warranties and renewals. A saved item connects useful details, important dates, optional documents, chosen alerts and a history of completed payments or services. Planning totals use the amounts and schedules the user enters. Free planning covers 30 days; Premium extends planning up to a year.

The intended user is the person who keeps track of household obligations. The product also accommodates vehicle records, subscriptions, loans, insurance, IDs, appointments and school deadlines. It does not require home ownership or family membership.

This conclusion comes from the current category directory, saved-item and activity models, payment planning, sample account, purchase flow and Premium products. It is a product description, not a claim that one phrase has the highest search volume.

## Category decision

Use **household admin app** to explain Keeply, supported immediately by concrete examples. Keep the existing headline, **Your household, a little more organised.**

“Household organiser” remains an understandable umbrella but is too broad to be the sole search target. Current [Cozi](https://www.cozi.com/) and [Domus](https://trydomus.app/) descriptions lead with shared calendars, shopping, chores and family coordination. Keeply does not currently offer those workflows.

“Home management app” overlaps with maintenance and warranties, but also attracts property inventory, renovation and home valuation needs. [HomeZada](https://www.homezada.com/homeowners/) illustrates that broader category. “Home records app” describes retrieval but misses bills, recurring dates and planning. “Reminder app” understates the records and history. “Budgeting app,” “bill payment app,” “shared family organiser” and “AI assistant” imply capabilities that Keeply does not offer.

These comparisons are qualitative evidence about product expectations. No keyword-volume, difficulty or conversion dataset was available. Do not treat them as demand estimates.

## Search targets by existing page

| Page | Main intent | Supporting terms and boundaries |
| --- | --- | --- |
| `/` | Keep household admin together | household admin app, household bills tracker, household records, home maintenance records, receipts, warranties, renewals |
| `/warranty-tracker` | Retrieve receipts and track warranty dates | receipt organiser, appliance warranty tracker, purchase records, warranty expiry reminders |
| `/aircon-cleaning-schedule` | Decide when to clean an aircon | aircon cleaning schedule, cleaning frequency, filter care, published cleaning prices; preserve manufacturer sources and local context |
| `/loan-payment-reminder` | Keep a loan payment schedule and history | loan payment reminders, recurring payment tracker, installment dates; no loan balances, interest calculations or payments |
| `/vehicle-registration-reminder` | Keep vehicle obligations and service history | vehicle registration reminder, car maintenance tracker, motorcycle registration, insurance renewal dates |
| `/lto-registration-renewal` | Find the official renewal process and standard window | LTO registration renewal, plate number schedule, renewal requirements, date calculator; preserve the exact agency and jurisdiction |
| `/document-expiry-tracker` | Track dates on documents | document expiry tracker, passport expiry reminder, driver’s license renewal reminder, ID expiry dates; no identity scans |
| `/pricing` | Understand Free and Premium | household admin pricing, free household records, Premium planning; retain actual PHP prices and prepaid terms |

Bill tracking and general home maintenance are central product jobs but do not have dedicated public landing pages. The homepage currently carries those intents. Start by measuring it. Add a dedicated page only if query evidence justifies original, useful content and a complete matching product flow. Do not create many thin keyword pages.

Use natural English spelling consistently. Search queries may use “organizer” or “organiser”; repeating both in headings adds clutter. Google ignores the [meta keywords tag](https://developers.google.com/search/docs/crawling-indexing/special-tags), so no keyword list was added to page metadata.

## Implemented changes

- Homepage title explicitly identifies the app and its main jobs. The title is absolute so the rendered document, social title and structured-data page name include Keeply consistently. The former root-page title rendered without the brand suffix.
- Opening copy explains household admin with concrete examples. FAQs answer what Keeply is, what it organises and what the free account includes. Bills, maintenance and purchases come first.
- Receipt, vehicle, document and loan pages have descriptive titles, opening headings and page-specific social metadata. Existing URLs and their canonical targets remain stable.
- Homepage links directly to the receipt, vehicle and document pages, alongside existing loan and guide links. Important public pages can be found through ordinary HTML links.
- Homepage JSON-LD connects WebSite, WebApplication, Organization and WebPage through stable IDs. Its features describe the implemented product. No ratings, awards, reviews or external endorsements were invented.
- The LTO guide identifies Keeply consistently as an independent household admin app. Official renewal guidance, sources, dates and jurisdiction remain intact.

## GEO and crawl access

Here GEO means visibility in generative search answers, such as Google AI Overviews, ChatGPT search and Claude web search. [Google’s guidance](https://developers.google.com/search/docs/appearance/ai-features) says normal SEO foundations apply: indexable pages, useful text, internal links, accessible crawling and structured data that matches visible content. Eligibility does not guarantee inclusion.

[OpenAI documents OAI-SearchBot](https://developers.openai.com/api/docs/bots) as its search crawler. [Anthropic documents Claude-SearchBot](https://privacy.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) for search. Keeply’s current wildcard robots rule allows both, along with Googlebot and Bingbot. Adding duplicate bot-specific groups is unnecessary. Search crawler access and model-training permissions are separate settings; this change does not alter the existing permissions.

The initial hosted read-only checks returned HTTP 200 for the homepage, pricing, all four tracker pages, robots and sitemap. Requests naming Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot and PerplexityBot also returned normal homepage HTML without a detected challenge. The bare domain redirects to the `www` canonical host. This is evidence of responses to these requests, not verification of genuine crawler IP access, indexing or citations. The web research tool could not retrieve Keeply directly, while ordinary HTTPS requests succeeded. Its failure alone does not establish a crawler block.

The ten public sitemap URLs remain unchanged. Demo and private pages keep their noindex directives. No special AI text file or FAQ rich-result promise was added. [Google’s software-app rich results](https://developers.google.com/search/docs/appearance/structured-data/software-app) have additional eligibility requirements, including genuine rating or review data. The application graph describes the product; it is not a claim of rich-result eligibility.

## Hosted follow-up

1. Deploy the reviewed presentation changes through the established release process. Deployment was not performed by this task.
2. In Google Search Console, inspect the homepage and changed tracker URLs. Confirm the Google-selected canonical and fetched HTML, submit the existing sitemap if needed, and request a recrawl of changed pages.
3. In Bing Webmaster Tools, inspect the same URLs and sitemap. Check hosting security logs if actual crawler traffic is blocked. A user-agent string alone is not proof that a visitor is a genuine crawler.
4. Establish a query baseline using Search Console impressions, clicks, CTR and landing pages. Compare the concrete job terms above, branded searches and broad category terms over a meaningful period. Test “household admin” against observed queries before expanding it across campaigns.
5. Record a small fixed set of relevant AI-search questions, their date, tool, answer and cited URLs. Examples: “How can I keep appliance receipts and warranty dates together?”, “How do I track household bills and home maintenance in one place?” and “How do I remember passport expiry and vehicle renewals?” Repeated checks are directional because answers vary. Review available referral data and actual sign-ups alongside citations.

Search Console ownership, Bing ownership, query volumes, real crawler logs and AI citation performance were not available in this review. There is no verified claim that Keeply currently ranks for these terms or appears in an AI answer.

## Verification

Evidence is saved separately in `artifacts/seo-geo/` so earlier product verification reports are not overwritten.

- Production build, ESLint, TypeScript and whitespace checks passed.
- The existing public browser suite passed Chrome at 1280, 390 and 320 pixels and Playwright WebKit at 390 pixels. It exercised public navigation, sample account, payment/history cancellation, search, record completeness, pricing and FAQ disclosures. Rendered metadata was checked on all ten sitemap pages and seven sample/private destinations. Private routes redirected to sign-in with noindex; sample routes retained noindex.
- A further 20 page/browser combinations checked the changed homepage and four tracker pages. Each had one H1, matching document/Open Graph/Twitter titles, matching descriptions, the correct social URL and no horizontal overflow. All six relevant tracker/guide destinations were linked from the homepage. Both new FAQs opened and closed. Hero screenshots at 320, 390 and 1280 pixels were inspected.
- Rendered homepage JSON-LD passed JSON parsing, known-type/property checks against the current Schema.org vocabulary, property inheritance/domain and value-range checks, unique IDs, resolved references and matching page metadata. The logo returned a PNG. This is vocabulary and rendered-output validation, not external Google rich-result certification.
- Lighthouse SEO scored 100 on all ten public sitemap pages. The six changed pages also received performance, accessibility and best-practices audits, shown below. Lighthouse used a local production preview over HTTPS with simulated mobile conditions. It reports technical audit scores, not keyword relevance, ranking potential or hosted Core Web Vitals.

| Changed page | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| Home | 95 | 100 | 100 | 100 |
| Receipts and warranties | 98 | 96 | 100 | 100 |
| Loan payments | 97 | 100 | 100 | 100 |
| Vehicle records | 98 | 96 | 100 | 100 |
| Document expiry | 98 | 96 | 100 | 100 |
| LTO guide | 97 | 97 | 100 | 100 |

The three shared tracker pages retain an existing contrast warning on the small “Example” badge (4.46:1 against a 4.5:1 requirement). The LTO guide retains existing badge contrast warnings. These were recorded rather than included in this positioning change. Simulated browser checks do not verify physical devices, hosted authentication, checkout or alert delivery.

Detailed reports are retained locally in `artifacts/seo-geo/`. Verification artifacts are excluded from the release commit to keep it limited to this chat’s source, generated page assets, documentation and browser checks. The subsequent bills page work is described in [the bills page plan](bills-page-plan.md).
