# Aircon guide usefulness plan

Prepared 29 October 2026 (Asia/Manila). Status: research and proposed plan only. No application changes or deployment are authorised by this note.

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

## Proposed scope and order

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

## Proposed page order

Short answer and next-step links, date planner, concise schedule explanation, quote comparison and request template, visit checklist and recovery, safe filter care and service-scope reference, Keeply record flow, focused FAQs and sources. Keep the same public route and allow readers to reach each job directly.

## Validation before release

1. Run a small formative task check with approximately five household aircon owners or renters. Ask them to find a next date from a known interval, handle unknown history, distinguish a filter rinse from full service, compare a base price with a VAT/transport quote, and explain what to do about new dripping after a visit. This is usability evidence, not a representative demand study.
2. Compare task completion, hesitation, mistakes and confidence with the existing guide. Success means clearer correct next actions, not more features or more reminder clicks. Failure includes mistaking the planned date for a diagnosis or the base price for an all-inclusive quote.
3. If the planner is implemented, verify invalid/future/missing dates, supported interval bounds, month ends, leap years, past planned dates and local date display. Test editing, cancellation, sign-in retry/error, preserved values, saving once, and no fabricated completion history. Verify Chrome and WebKit, keyboard use, narrow screens, zoom, JavaScript fallback and hosted authentication before calling the complete handoff verified. State physical-device or hosted limitations explicitly.
4. Preserve or intentionally update title, description, canonical, language, Open Graph locale, indexing, Article/BreadcrumbList structured data and sitemap inclusion. Check rendered output and structured-data validity and run mobile Lighthouse after public-page changes. Keep useful source-backed content available without running the planner.
5. Monitor relevant Search Console queries and guide-to-record usage when suitable analytics are available. Do not claim search demand, ranking improvements, conversion gains or actual household benefit from this desk research alone. Recheck published prices before release.

## Decision and uncertainty

Recommendation: prioritise the source correction, then one complete date-planning flow and clearer quote/follow-up guidance. The expected outcome is less calendar arithmetic, fewer assumptions about quotes, and more useful service records. No target-household task study, new product flow, real-device test or performance audit was performed for this plan. No provider endorsement or claim of category search volume is made. The LTO page is outside scope.
