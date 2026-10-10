# Bill tracker landing page

Planned October 11, 2026. Build this page in the existing Keeply application, using its established routes, records and account flow.

## Purpose and positioning

Create `/bill-tracker` for people looking for a bill tracker app, bill reminder app or a way to organise household bills. Explain why Keeply is a strong choice for someone who wants records, dates, amounts and payment history together, with the rest of their household admin close by.

Keeply does not have independent evidence that it is the best app overall. Use a visible question about finding the best bill tracker for a household, then answer with fit and actual capabilities. Do not invent ratings, awards, customer quotes, savings, user counts or competitor comparisons.

The primary action opens the existing bill category: `/add?category=bills`. The general sample CTA remains “Explore a sample account.” All extra category links use the existing category identifiers. No new bill-tracking functionality or integrations are required.

## Page outline

1. A quiet header with KeeplyPH.com, product navigation and existing sign-in.
2. Hero: “Your bills, organised. Your household, too.” State clearly that Keeply is a bill tracker and reminder app within a household admin app. Add start and sample CTAs, a restrained generated photo and an HTML example drawn from the actual fictional sample records.
3. Concrete reasons to choose Keeply: keep the bill context with the date, plan using saved amounts with estimates identified, record payments already made, and find their history later. Avoid decorative features that look actionable but do nothing.
4. A short setup sequence: choose a bill, enter its current date and amount if known, choose alerts, then record completed payments. Explain how changing utility bills differ from fixed schedules.
5. “One household. More than bills.” A second editorial image and links to the existing categories, beginning with bills, home maintenance and purchases/warranties. Include other obligations and custom dates without implying shared household accounts.
6. Free account and Premium planning context, with a pricing link. Do not imply bank connections, automatic bill importing, bill payment, automatic subscriptions or unlimited file storage.
7. Accessible FAQ disclosures covering what a bill tracker is, reminders, changing bills, free access, fit, payments/imports and other household records.
8. Final CTA with existing account and sample flows, followed by public policy/contact links.

## Visual system

Use warm off-white surfaces, dark plum text and restrained purple accents. Large editorial headings, ample space and asymmetric photo/text layouts should provide the premium feel. Use rules, quiet rows and concise labels rather than a grid of identical feature cards. Keep the existing logo and shared header name.

The two photos are simple still lifes with natural window light, ordinary physical materials and no people. They provide atmosphere; useful text and product examples remain HTML. Use generated assets saved under `public/images/bills/`, compressed to WebP and served with responsive image sizing.

### Image prompts

Built-in image generation, new assets, no input references. Final assets are `public/images/bills/bills-desk.webp` (88 KB) and `public/images/bills/household-records.webp` (61 KB). Original PNGs remain in the Codex generated-images directory. The WebP copies preserve the generated compositions.

**Hero prompt:** Use case: photorealistic-natural. Asset type: editorial still-life photograph for the bills landing page of Keeply, a household admin app. Create one landscape 3:2 photograph, not a collage. On a warm, lightly textured off-white table: a slim pale lilac paper folder, two plain off-white sheets of household paperwork, one partly tucked inside, and a simple graphite pencil. The sheets have a few faint grey typographic rules or lines, never legible text. A small natural crease and slightly irregular alignment make the scene believable. Quiet contemporary editorial photography, natural window light from the side, soft ordinary shadows, subtle paper fibres. Shoot from a slightly elevated close viewpoint with generous breathing room around the few objects, objects mainly toward the centre and upper half so an HTML card can overlap the lower edge. Restrained cream, pale lilac and graphite palette. No people, hands, laptop, phone, UI, logos, numbers, lettering, watermark, coins, floating objects, glossy 3D rendering, saturated gradients or elaborate styling. Simple, physically plausible and understated, like a real editorial product photo.

**Household prompt:** Use case: photorealistic-natural. Asset type: editorial still-life photograph for the broader household section of Keeply, a household admin app. Create one landscape 3:2 photograph, not a collage, matching a quiet premium stationery editorial. A pale warm off-white tabletop with a very slim pale lilac paper folder, a plain cream warranty envelope partly tucked into it, a single small ordinary brushed metal house key resting beside the folder, and the corner of one simple off-white appliance manual with no legible writing. Only these few objects. Natural side window light, subtle paper texture, a soft believable shadow and a slight natural imperfection in the envelope. Use an intimate slightly angled top-down composition, generous space and an understated cream, lilac and silver palette. The photo should suggest keeping everyday home records together, never a staged luxury desk or a futuristic productivity concept. No people, hands, UI, phones, screens, logos, legible text, numbers, watermark, excessive props, floating objects, dramatic light, plastic 3D effects or saturated gradients.

1. Bills desk: a pale lilac paper folder, two plain pieces of household paperwork and a graphite pencil on a lightly textured warm off-white table. Natural window light, generous negative space, a believable slight imperfection. No legible text, logos, screens, coins, hands, floating objects or glossy 3D effects.
2. Household records: an understated home still life connecting paperwork and ordinary household objects. An off-white tabletop, a simple paper folder, a small metal house key and a plain warranty envelope. Natural light and the same quiet material palette. No people, text, brands, futuristic effects or excessive props.

## Search and AI-search foundations

- Title: `Bill Tracker & Bill Reminder App · Keeply`.
- Description explains household bills, payment history, optional alerts and broader household admin.
- Canonical: `https://www.keeplyph.com/bill-tracker`.
- Preserve `en-PH` and `en_PH`.
- Add the public URL to the sitemap and contextual links from the homepage and existing tools.
- Render useful copy and FAQ answers in server HTML. Add WebPage and BreadcrumbList JSON-LD with a reference to the existing Keeply application identity.
- No keyword meta tag, invented review markup or promise of AI citations. Existing crawl access stays intact; demo/private routes retain noindex.

## Completion checks

Check all links and category destinations, sample account consistency, keyboard navigation and FAQ open/close. Check success navigation and back navigation without creating private records. Test Chrome and WebKit at narrow mobile, typical mobile and desktop sizes. Inspect images and screenshots. Check public metadata, canonical, indexing, sitemap, structured-data vocabulary and references. Run production build, lint, type checking and Lighthouse on affected public pages. Record limitations, including the difference between local browser checks and hosted integrations or real devices.

Show the completed page in the app’s browser panel and include a screenshot preview. Do not deploy the existing production site as part of this local build request.

## Implementation and verification

Completed locally October 11, 2026. The new page is `/bill-tracker`, with contextual links from the homepage and the existing tracker pages. The public sitemap now includes 11 URLs. The existing KeeplyPH.com header and saved category identifiers are retained.

- `npm run build`, `npm run lint` and `npm run typecheck` passed.
- The existing `tests/browser/public-experience.mjs` suite was extended for the bill page and run against the local production build over HTTPS. Chrome at 1280, 390 and 320 pixels and WebKit at 390 pixels passed, including image loading, sample records, category ordering, keyboard FAQ toggling, bill entry and return navigation. Existing public/sample flows passed as well. No runtime errors occurred. Recorded request failures were navigation cancellations of prefetches or metrics requests.
- Rendered SEO checks covered 18 routes, including all 11 public sitemap URLs and protected/sample indexing behavior. Checked titles, descriptions, canonical URLs, language, Open Graph locale, robots and sitemap. The new Open Graph image resolves to the generated bills photograph.
- Rendered homepage and bill page JSON-LD passed local checks against the official Schema.org vocabulary: recognised types and properties, applicable property domains and resolved entity references. This is not an external rich-result certification.
- Lighthouse 13.5.0 on the final local production build: bill page Performance 96, Accessibility 100, Best Practices 100, SEO 100. Homepage Performance 96, Accessibility 100, Best Practices 100, SEO 100. The initial contrast finding on section numbers was corrected and checked again.
- After that CSS correction, focused final layout, image, keyboard and entry/return checks passed in Chrome at 1440, 390 and 320 pixels and WebKit at 390 pixels. Desktop and mobile screenshots were visually inspected. Reports and screenshots are in `artifacts/bills-page/`.

To repeat the extended browser suite after building, use `PLAYWRIGHT_MODULE=/Users/giancabrera/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node tests/browser/public-experience.mjs`. It requires local Chrome, the Playwright WebKit runtime and OpenSSL. It has already been run locally; there is no outstanding execution step for this page.

Preview: `http://localhost:3000/bill-tracker`, opened in the Codex browser panel. The development server is left running for review. The page has not been deployed. Browser sizes are simulated, not physical-device tests. Hosted sign-in, private storage and alert delivery were not exercised by this marketing-page change. Search rankings, indexing and AI-search citations have not been established. Useful server-rendered copy, clear entities, internal links and crawl access provide foundations, not a placement guarantee.

## Isolated main release verification

Before pushing, the 18 files from this chat were assembled against the existing remote main commit in a separate temporary checkout. Premium feature code, database migrations, environment edits, privacy edits, dashboard changes and verification artifacts from the shared workspace were excluded. Only the bill-page additions were included from the mixed browser test file.

The isolated snapshot passed production build, lint, TypeScript and the full public browser suite in Chrome at 1280, 390 and 320 pixels and WebKit at 390 pixels. Rendered SEO checks passed on 18 routes; the homepage and bills JSON-LD matched the previously validated graphs. Lighthouse for the isolated bill page scored 91 Performance, 100 Accessibility, 100 Best Practices and 100 SEO. Detailed reports remain local in `artifacts/bills-page/isolated-main/` and `artifacts/bills-page/lighthouse-isolated-main.json`.
