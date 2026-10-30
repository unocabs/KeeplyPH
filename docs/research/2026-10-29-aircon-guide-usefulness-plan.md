# Aircon guide: final usefulness and design plan

Prepared and finalized 29 October 2026 (Asia/Manila). The owner subsequently approved implementation. Implemented locally on the same date; verification and remaining limitations are recorded below. Production deployment has not been performed.

## User problem

What real-world problem are we solving?

A person responsible for a household aircon needs to decide what to do next, arrange the appropriate service without unexpected exclusions, and retain enough information for a follow-up and the next visit. The current guide provides substantial information but leaves readers to translate it into a personal date and a comparable quote.

The public page and local source already include filter versus professional care, manufacturer usage bands, window versus split service, symptoms, prices, a quote-request template, before/after checklists, unknown prior service history, and Keeply setup instructions. Improving their usefulness should take priority over adding more general explanation.

The difficulty of translating the guide into a plan is an assistant hypothesis. Public discussions below suggest questions worth testing; they do not establish their prevalence or demonstrate Keeply customer demand.

## Evidence reviewed

Sources accessed 29 October 2026. Manufacturer and provider claims describe their own guidance or offers, not universal rules or an independent market survey.

| Evidence type | Source and finding | Implication |
| --- | --- | --- |
| Keeply source and public-page observation | [Current guide](https://www.keeplyph.com/aircon-cleaning-schedule), `src/app/aircon-cleaning-schedule/page.tsx`: the worked example is static; the date calculation described in setup lives in the item form. | Consider making the existing planning concept available before sign-in. |
| Manufacturer guidance | [Midea Philippines cleaning guide](https://www.midea.com/ph/news/aircon-cleaning-schedule-in-the-philippines--filters--self-cleaning--and-professional-deep-cleaning): separates filter care, self-cleaning and professional cleaning; publishes usage bands with a six-hour overlap and gaps for some operating patterns. | Keep the tasks distinct. Do not invent precise intervals for unlisted usage or make one brand's table a universal rule. |
| Manufacturer guidance | [Panasonic Philippines](https://www.panasonic.com/ph/air-solutions/learn-more/how-to-clean-your-ac-unit-servicing.html): different filter types have different care instructions; recommends servicing at least every six months. [Daikin](https://www.daikin.com/products/ac/services/maintenance_tips) recommends two-week filter cleaning and professional help for noticeable dirt behind the filter. | A model's manual and the technician's assessment should guide the household's interval. Avoid treating all filters as washable. |
| Provider documentation | [Teko](https://www.teko.ph/accredited-aircon-cleaning-services): window cleaning PHP 990, split cleaning PHP 1,775; listed window surcharges and a separate PHP 4,500 pull-down addition. The current page lists inspection, pressure washing, filter and drain-line cleaning but does not explicitly promise outdoor-unit cleaning. | Correct Keeply's claim that indoor and outdoor cleaning are explicitly listed. Mark outdoor coverage as something to confirm. |
| Provider documentation | [EZY Lifestyle](https://ezy-lifestyle.com/our-services/aircon-cleaning/): window PHP 1,320 and split PHP 1,650, subject to VAT and transportation fees. Its scope explicitly mentions outdoor components; repairs and refrigerant charges are excluded. | A second dated example makes extra fees and differences in scope concrete. These offers are not equivalent totals or national averages. |
| Manufacturer troubleshooting | [Samsung Philippines leakage guidance](https://www.samsung.com/ph/support/home-appliances/what-should-i-do-when-water-drops-fall-from-my-air-conditioner/) describes multiple causes, including installation and drainage. | Water leakage should lead to an inspection request, not an automatic conclusion that another clean is needed. Keep repair instructions outside this household planning guide. |
| Anecdotal public discussion | [AdultingPH discussion, May 2024](https://www.reddit.com/r/adultingph/comments/1cx05ia/how_often_do_you_have_your_splittype_aircon/): uncertainty about frequency and recurring expense. [Service-business AMA, March 2026](https://www.reddit.com/r/PinoyAskMeAnything/comments/1rrs0re/i_run_an_aircon_cleaning_service_business_ama/): participants describe problems appearing after cleaning, including leakage. | Investigate planning and follow-up comprehension. Do not use comments as maintenance instructions, price benchmarks, or evidence that a fault is the cleaner's responsibility. |

## Final scope and order

### 1. Correct and simplify the existing guidance

Correct the Teko outdoor-scope claim first. Recheck all displayed prices, source links and review dates at implementation. Put a compact next-step selector near the top with ordinary anchor links: plan routine cleaning, compare a quote, or get help with a problem. Keep useful answers available in server-rendered HTML.

Shorten repeated explanations. Retain the two-task distinction and the existing source table as optional reference. Unknown service history must remain unknown, with a prompt to request records or an assessment.

### 2. Add one public next-cleaning-date planner

Purpose: remove manual calendar arithmetic and the need to sign in just to work out a date.

- Inputs: last professional-cleaning date and the interval recommended for the reader's unit. Offer common month values and a supported custom interval without preselecting a manufacturer recommendation. Provide an explicit unknown-history route.
- Result: a planned next date, the arithmetic used, and an editable route into Keeply. A date in the past means the chosen plan's date has passed; it is not a diagnosis or an official overdue status.
- Example: last professional clean on 29 October 2026 plus an agreed four-month interval gives 28 February 2027. End-of-month behaviour must be explicit and consistent with the item form.
- Explain that a filter rinse or self-clean cycle does not restart the professional-service interval. Do not infer a precise interval from inverter status, horsepower or daily hours alone.
- Keep calculation usable without an account. Show an honest sign-in disclosure only on the save action. Preserve the planned date and chosen interval through the existing sign-in and review flow, with no saved record until submission.
- Source observation: `addIntent` currently permits a suggested date only for car registration. Aircon prefill and its sign-in round trip require deliberate implementation and end-to-end verification; they cannot be assumed to work from the current link.
- Reuse existing calendar arithmetic and item-form conventions where applicable. Do not automatically create a completed service-history entry from a calculator input.
- If the complete handoff cannot be made reliable, ship the editorial improvements first and defer the tool. Do not expose a save action that loses the reader's plan.

This is the only proposed new interactive feature. Its expected benefit remains unvalidated.

### 3. Make price comparison about the total and scope

Replace the single-provider impression with two compact, dated provider examples. For each show service area, unit type, published base rate, explicit inclusions, unspecified scope, VAT/transport treatment, and stated extras. Do not rank providers or describe a national average.

Improve the existing quote-request template with explicit questions about outdoor cleaning, access/removal, VAT, transport, pull-down justification, extra-work approval, receipt/service report and follow-up terms. Keep the text selectable. A copy button is optional only if tested with a manual-selection fallback and truthful success/failure feedback.

Do not add a price estimator, provider directory, booking service or claimed savings.

### 4. Strengthen the existing before/after checklist

Keep the checklist brief and usable during a visit. Beforehand, record any existing symptom, agree access and total charges, and check building/landlord requirements. Before the technician leaves, ask for a demonstration of operation and drainage, the work actually done, findings, amount paid and follow-up terms.

Add a short recovery section for a new problem after cleaning: note when it started, capture the symptom if safe, retain the receipt/service report and contact the provider for an assessment. Link the manufacturer's support guidance where appropriate. Avoid assuming cause, fault, a guaranteed callback or warranty coverage.

### 5. Connect the completed visit to the existing record

Keep the final explanation focused on the current app: identify the unit, record the completed service and actual amount, keep the receipt/findings/provider contact, and review the next planned date. Use existing notes and attachments rather than proposing new data fields.

Any sample individual aircon must retain a recognisable item/category icon alongside its name, with the existing shared identity components and image fallback. Show ordinary entered amounts normally; label estimates and missing amounts only. The general sample CTA is “Explore a sample account”.

## Final design direction

The owner requests a premium design informed by the existing LTO and bills SEO pages. The visual objective serves the household task: readers should identify the relevant action quickly, understand the information without excessive reading, and use the planner and service checklist comfortably on a phone.

### References actually reviewed

Reviewed the live desktop bills, LTO and aircon pages in the browser, including the bills hero and LTO calculator. Also read their local page markup and CSS. This establishes the current desktop visual references; it is not a mobile usability test or validation of the planned design.

- [Bills landing page](https://www.keeplyph.com/bill-tracker): use its warm ivory background, dark plum text, purple serif accent, natural-light photography, ample spacing, restrained borders and mix of editorial columns and compact numbered rows. Reuse the existing font stack and brand elements.
- [LTO guide](https://www.keeplyph.com/lto-registration-renewal): use its clear tool destination, explicit form labels, numbered reference sections, useful jump links, explanatory source notes and visible distinction between guidance and a saved plan.
- Current aircon guide: preserve its useful source-backed content, Filipino question-led headline, ordinary HTML navigation and accessible disclosures. Its repeated full-width text sections and shaded boxes can be consolidated into fewer, more distinct reading areas.

This direction changes the aircon page only. The reference pages remain reference material.

### Visual specifications

| Element | Final direction | Household benefit |
| --- | --- | --- |
| Palette | Warm ivory `#fdfcf9`, plum `#302a3d`, muted text around `#6d6577`, purple `#6349c5`, fine neutral borders around `#e7e2e9`, restrained lilac around `#f3f0f7`. Check actual text/background contrast in the rendered page. | Familiar Keeply identity with clear emphasis and readable supporting text. |
| Type | Existing sans-serif body and headings, with Georgia/serif italic on one short hero phrase as on bills. Desktop H1 approximately 52–60 px, mobile 36–40 px; H2 approximately 30–38 px. Main guide text 16–18 px, supporting labels/source notes 12–14 px, body line height around 1.7. | Clear hierarchy without shrinking practical guidance to the smallest reference-page labels. |
| Width and spacing | Outer content width approximately 1120 px; prose blocks around 60–70 characters per line. Desktop section spacing 72–88 px, mobile 40–56 px. Mobile side padding approximately 20 px, adaptable at 320 px. | Easier scanning and a calmer reading rhythm on long guidance. |
| Surfaces | One pale-lilac planner area and one restrained final record CTA. Use white for forms/results and hairline separators for the main guidance. Typical corners 12–18 px with a light shadow only where it clarifies the tool or photography. | Direct attention to the primary task while keeping reference material easy to scan. |
| Buttons | One prominent purple action for the current step, quiet text or outlined secondary actions, minimum 44 px touch targets. Visible keyboard focus and readable errors. | A clear next step with comfortable mobile controls. |
| Motion | Brief colour/focus feedback only, respecting reduced-motion preferences. Keep results stable and announce them accessibly. | Predictable form use and less distraction. |

### Hero and photograph

Use a compact two-column desktop hero: headline and brief explanation on the left, one realistic natural-light household photo on the right. Retain “Kailan magpapalinis ng aircon?” and use a short serif-accent second line, “Plan the next clean.” Keep the final H1 as readable HTML.

The image should show a simple unbranded wall-mounted aircon in an ordinary cared-for room, with quiet neutral materials and daylight. It establishes the household context. Use accurate equipment proportions and avoid implying that Keeply supplies cleaning services or that a fictional image proves cleanliness. No provider endorsement or invented product branding.

Use one new optimized image for the whole page, with responsive crops, reserved dimensions and an appropriate text alternative. Do not reuse bills or car paperwork as aircon imagery. Target a compressed WebP around 80–150 KB if acceptable visual quality permits. Actual loading priority and final sizes depend on the rendered layout and Lighthouse results.

Primary hero action: “Plan my next clean”, linking to the planner. Secondary action: “Compare cleaning quotes”. Put the reviewed date and linked source context below the description. Keep the general sample CTA for the lower account section.

On mobile, stack the copy, a short pair of filter/professional-care facts, and the planner before the full photo. The photo can sit after the planner as a supporting editorial break. Keep its visual proportions natural and avoid creating an extra full-screen barrier before the useful tool. This order must be explicit in semantic layout and checked with keyboard and assistive navigation.

### Main tool design

Place the planner directly after the short-answer strip and compact job navigation. It is the primary practical feature of the page. On desktop, place the two labelled inputs on the left and the result area on the right within one pale-lilac section. On mobile, stack inputs, calculate action, result and save action in that order.

The initial result area contains a simple explanation of what the tool will produce. After valid calculation, show “Next planned professional clean” and the date as the strongest type, followed by the chosen interval and last-service basis. Keep all supporting labels readable. Invalid entries receive an inline error tied to the relevant control. Editing an input clears or visibly invalidates the old result so it cannot be saved as if current.

Show “Save this plan in Keeply” after a valid result, with the sign-in explanation adjacent. The unknown-history path presents useful guidance without fabricating a date. Keep the fields directly editable rather than adding a wizard. Do not add reactions, accounts, uploads or a second budget calculator to this public tool.

### Guide sections and responsive presentation

- Schedule explanation: present filter care and professional service as two concise, clearly labelled rows, then the existing source-attributed usage table. Keep the non-universal nature of the intervals beside the table.
- Quotes: use a compact comparison table on desktop, with provider, published base rate, included scope and extra charges. On phones, show the same information as provider blocks with repeated labels. Do not squeeze four dense columns into the viewport or duplicate accessible reading content. Treat both providers neutrally.
- Quote request: a plain, selectable message block with enough space for long model and location details. Retain the useful template without adding a required interaction.
- Before/after service: two editorial columns on desktop, stacked in chronological order on mobile. Use numbered or tick-marked guidance rows that are clearly informational. Place the short new-problem recovery instructions immediately after the after-service list.
- Filter care and service types: use concise text and dividers, with small consistent icons only where they help distinguish tasks. Keep important distinctions visible; reserve disclosures for secondary detail and FAQs.
- Saved-record example: one restrained HTML example using the real shared aircon/category identity component next to “Bedroom aircon”. Show completed service, actual amount and next planned date as separate labelled facts. Clearly mark it as an illustration; it must match current app capabilities.
- Closing account section: “Keep the service record with the aircon”, a short explanation, a relevant create-record action, and “Explore a sample account”. Avoid repeating the full feature or Premium offer elsewhere on the page.

Use a compact wrapping jump navigation with four job labels: plan a clean, compare quotes, prepare for service, and care between visits. Secondary reference sections remain reachable through contextual links. Keep navigation in normal page flow so it does not compete with the form on mobile.

### Final page sequence

1. Compact editorial hero and source-review note.
2. Two-task short answer and job navigation.
3. Public next-cleaning-date planner.
4. Short source-backed schedule explanation, with the single photo placed after the planner on mobile.
5. Dated quote comparison and selectable request message.
6. Before/after visit guidance and post-service recovery.
7. Filter-care and service-scope reference.
8. Existing Keeply service-record example and account/sample actions.
9. Focused FAQs, source list and public footer.

### Final implementation sequence

First correct source claims and consolidate the copy. Next build the visual layout and one optimized photo, then implement the planner and its complete sign-in/save handoff. Finish with responsive and accessibility verification, functional edge cases, rendered SEO checks, structured data and Lighthouse. Read the installed Next.js guides before application code changes, as required by AGENTS.md.

Retain the current route, canonical, sitemap inclusion, language and locale. Keep Article and BreadcrumbList data accurate, including an honest modification date. Existing analytics work elsewhere in the shared checkout is outside this plan. Any later measurement should use approved existing events without collecting planner inputs or household details.

## Validation before release

1. Run a small formative task check with approximately five household aircon owners or renters. Ask them to find a next date from a known interval, handle unknown history, distinguish a filter rinse from full service, compare a base price with a VAT/transport quote, and explain what to do about new dripping after a visit. This is usability evidence, not a representative demand study.
2. Compare task completion, hesitation, mistakes and confidence with the existing guide. Success means clearer correct next actions, not more features or more reminder clicks. Failure includes mistaking the planned date for a diagnosis or the base price for an all-inclusive quote.
3. If the planner is implemented, verify invalid/future/missing dates, supported interval bounds, month ends, leap years, past planned dates and local date display. Test editing, cancellation, sign-in retry/error, preserved values, saving once, and no fabricated completion history. Verify Chrome and WebKit, keyboard use, narrow screens, zoom, JavaScript fallback and hosted authentication before calling the complete handoff verified. State physical-device or hosted limitations explicitly.
4. Preserve or intentionally update title, description, canonical, language, Open Graph locale, indexing, Article/BreadcrumbList structured data and sitemap inclusion. Check rendered output and structured-data validity and run mobile Lighthouse after public-page changes. Keep useful source-backed content available without running the planner.
5. Monitor relevant Search Console queries and guide-to-record usage when suitable analytics are available. Do not claim search demand, ranking improvements, conversion gains or actual household benefit from this desk research alone. Recheck published prices before release.

## Decision and uncertainty

The planning decision was to prioritise the source correction, one complete date-planning flow and clearer quote/follow-up guidance. The expected outcome is less calendar arithmetic, fewer assumptions about quotes, and more useful service records. The planning research did not include a household task study or feature verification. Implementation checks below are separate from that desk research. No provider endorsement or claim of category search volume is made. The LTO page is outside scope.

## Local implementation, 29 October 2026

The owner approved this finalized plan. The aircon guide now uses the bills-inspired ivory, plum and purple visual system, a single household photo, larger readable guidance, a prominent public date planner, responsive provider comparisons, chronological visit guidance and an existing-capability service-record illustration with the shared aircon icon.

The Teko outdoor-scope attribution was corrected, both provider offers were rechecked, and the dates/source references were updated. The canonical URL, title, language, locale, sitemap inclusion and Article/BreadcrumbList identities remain stable. The description and social image intentionally reflect the new planner and photograph.

The planner requires a completed professional-cleaning date and an explicit whole-month interval. It uses the shared month-end arithmetic, handles invalid/future input, identifies past planned dates without declaring a diagnosis, clears stale results on edits, and offers an unknown-history path. Without JavaScript, the interactive controls are hidden and a calendar example and the full guide remain available.

The next date and interval pass through the existing add/sign-in/callback/sample flows. The account form leaves alerts off, recurring service unset, and past-service history empty. Only the user's final save submits the record. Cancellation clears the intentional-leave guard. Failed sign-in and token exchange retain sanitized onboarding intent for retry. Existing car-registration intent is preserved.

### Image asset and reproducibility

Generated with the built-in imagegen tool. Original output remains in the Codex generated-images directory. The project asset is [household-aircon.webp](../../public/images/aircon/household-aircon.webp), 1448 × 1086 px and 72,566 bytes, optimized with the existing Sharp dependency. The source note identifies it as AI-generated.

Final generation prompt:

Use case: photorealistic-natural. Asset type: responsive editorial photograph for Keeply's aircon cleaning guide. Scene: an ordinary cared-for Philippine household room in soft natural morning daylight. Primary subject: a realistically proportioned unbranded white wall-mounted split air conditioner high on a warm ivory plaster wall, clearly visible with its proper horizontal outlet and understated controls. Below it, a quiet corner with a pale oak sideboard and the edge of a simple linen curtain, minimal household detail. Composition: landscape 4:3 photograph, air conditioner prominent in the upper middle with enough room around it for responsive cropping, camera level, no extreme wide angle. Mood: calm, practical, premium editorial photography, real materials and gentle daylight shadows, neutral cream and light wood palette, a small muted lilac accent in a folded cloth on the sideboard. Avoid text, logos, people, tools, cleaning action, water spraying, ornate luxury interiors, glossy CGI, fake interfaces, excessive props and watermark. This is household context, not proof of a service.

### Repeat the focused browser verification

New script: [tests/browser/aircon-guide.mjs](../../tests/browser/aircon-guide.mjs). It starts a local production server, a temporary HTTPS proxy and isolated Auth/OAuth/save fixtures; it does not write to hosted Supabase or send notifications. Requires Node.js 22+, the existing Playwright dependency and browser runtimes (Chrome and WebKit), and OpenSSL.

From the repository root, run in this order:

```sh
npm run build
node tests/browser/aircon-guide.mjs
```

The script has been run locally during implementation. Reports and screenshots are written to `artifacts/aircon-guide/`. This is a development verification command, with no required hosted execution or deployment step.
