# Keeply user research and product decisions

Updated 22 October 2026.

## Purpose

Use this folder when deciding how to improve Keeply. The owner wants improvements to move the product closer to realistic user needs, informed by household psychology and actual feedback.

The initial audience is Philippine households managing bills, home maintenance, and purchases/warranties. General marketing uses the brand Keeply.

The product should help a household answer:

1. What needs attention?
2. What do we need to do next?
3. Who is handling it?
4. Has it actually been handled?
5. Where is the proof, and what happens next time?

## Saved research

- [Deep household-admin psychology and market research, 12 October 2026](2026-10-household-admin-psychology-and-market.md): review of 37 current products/services and one historical case, psychological studies, selected reviews, Philippine payment and warranty workflows, Keeply source observations, and a proposed validation plan.
- [Standing repository instructions](../../AGENTS.md): require consulting this index for material product, workflow, positioning, and Free/Premium improvement decisions.

The deep report is a dated baseline. It is desk research, with sources and limitations recorded. Its competitor observations and source-code audit may become outdated. Preserve it and record dated corrections or new findings here, with links to supporting material.

## Principles for improvement

- Reduce the effort of remembering, interpreting, coordinating, checking, and retrieving household information.
- Make the next action and the recorded outcome clear.
- Preserve uncertainty: unknown is different from zero, estimated is different from confirmed, and user-recorded payment is different from provider settlement.
- Keep capture manageable and make corrections and return after absence straightforward.
- Respect attention, privacy, and household boundaries. Avoid shame and unsupported reassurance.
- Prioritise dependable existing flows and complete supported experiences.
- Evaluate paid value through useful outcomes and actual purchasing behaviour. Review the current entitlement implementation before recommending Free/Premium changes.

## How to use evidence

Identify the evidence type explicitly:

| Type | Appropriate use |
|---|---|
| Direct Keeply feedback or observed behaviour | Establish a concrete experience in its context. Record the task, environment, and observed outcome. |
| Published psychological research | Explain possible mechanisms, with the study's limitations and population in mind. |
| Competitor documentation | Establish a documented capability or constraint at a particular date. |
| Public reviews and community accounts | Discover possible needs or failures to investigate. Do not infer prevalence. |
| Owner direction | Set product goals and constraints. Keep it distinct from customer research. |
| Assistant assessment or hypothesis | Propose a testable interpretation. Do not present it as demonstrated demand. |

The baseline report does not establish Keeply's effectiveness, willingness to pay, or clinical benefits. The provisional ratings given in conversation are assistant judgements, not user-study results. Assess new evidence for relevance and quality; one report does not automatically describe all households.

## Improvement decision record

For a material change, add a dated entry here or link a separate research note. Keep the record concise:

1. **Problem and context:** who struggled, with which obligation and task?
2. **Evidence:** source, date, evidence type, and relevant device/environment. Separate observation from interpretation.
3. **Decision:** the change, simplification, or investigation chosen, with the reasoning.
4. **Expected outcome:** what becomes easier, clearer, or more reliable for the household?
5. **Validation:** how it was checked, actual results, and remaining uncertainty. Include success, cancellation, errors, and relevant platform differences when applicable.
6. **Follow-up:** what evidence would support keeping, revising, or reversing the decision?

Record feedback without names, account numbers, credentials, unredacted receipts, or other household-sensitive information. Link only appropriately redacted supporting material.

## Recorded direction and findings

### 22 October 2026: remove amount confirmation status from the experience

**Problem and evidence:** further direct owner feedback on the checkup's three-part amount summary rejects confirmation categories throughout the site. The owner expects an entered amount to be accepted as the amount, unless explicitly labelled an estimate. This is owner direction and a correction to the proposed interface, not a measured household-study result.

**Decision and expected outcome:** show ordinary entered amounts without confirmation subtotals, badges or reconfirmation prompts. Label estimates and missing amounts only. Remove historical unverified-amount guidance from shared totals and simplify editor instructions. The checkup prioritises missing amounts, estimates, and then the next expense. Keep all existing amounts in totals, including legacy records; payment and completion outcomes retain their separate meaning. Add this standing rule to AGENTS.md. Expected benefit: avoid making users question amounts they already entered or save them again unnecessarily.

**Validation:** 362 unit tests, lint, type checking, and the production build passed. Signed-in production browser checks passed in Chromium at 1280px and 390px and WebKit at 390px, including the occurrence editor, cancellation, failed-save recovery, filters, pagination, amount/payment refresh, expiry, and indexing smoke checks. Public/sample checks passed in Chromium at 1280px, 390px, and 320px and WebKit at 390px, with explicit checks against amount-confirmation wording and rendered SEO checks on 18 routes. All 242 isolated database integration checks passed. Additional HTTPS browser checks verified logos, broken-image fallbacks, and doubled-text layouts at 320px in Chromium and 390px in WebKit. These use local production servers and Auth/REST stand-ins, not hosted Supabase or physical devices. This entry supersedes the confirmation-group presentation in the earlier checkup proposal. The dated research baseline remains preserved.

### 22 October 2026: simplify displayed amount labels

**Problem and evidence:** direct owner feedback identifies "Saved amount · Not confirmed" as confusing and redundant. The owner reads "saved" as potentially referring to a discount and requests "Amount", or "Estimated amount" for an estimate. This is explicit owner feedback, not a household usability study.

**Decision and expected outcome:** use those two labels consistently in upcoming-date, record, payment, planner and spending-checkup amount summaries. Remove repeated status suffixes from the record summary. Preserve underlying certainty, unknown/zero values, calculations and payment status. Form instructions still distinguish a planned amount from actual payment. Expected benefit: less interpretation while scanning amounts.

**Validation:** 357 unit tests, type checking, lint and the production build passed. Rendered checks passed in Chromium and WebKit at 390px across the panel, record, payments, planner and checkup. Estimates kept their label, other amounts used Amount, and repeated status suffixes were absent. Sample noindex and public metadata smoke checks passed. Public marketing pages and indexing rules are unchanged; physical devices and the hosted deployment were not tested for this wording update. See the [wording verification record](../../artifacts/upcoming-details/amount-label-checks.json).

### 22 October 2026: preserve item logos across all presentations

**Problem and evidence:** direct owner feedback on the spending-checkup concepts identifies logos as the most recognisable cue for items and requests them wherever an item appears. This is an explicit owner preference, not a measured household-recognition result. Existing application identity components already resolve saved provider/brand artwork and fallback icons; the concepts omitted that artwork.

**Decision and expected outcome:** add a standing rule in [AGENTS.md](../../AGENTS.md) to retain consistent item artwork beside visible names in application surfaces and design concepts. Use a saved logo when available and an existing product/category icon otherwise, including on image failure. Update both checkup concepts with the existing local subscription logos and a consistent aircon icon, including the action prompt. Expected benefit: easier item recognition while scanning.

**Validation and follow-up:** both concepts passed headless Chromium checks at 320px, 390px, and 736px in light and dark appearance. Logos loaded, expense review still expanded correctly, and a deliberately failed logo displayed its fallback. No application components or public indexing rules changed in this update. Recognition improvements and comprehensive application coverage remain unverified.

### 22 October 2026: propose an action-focused spending checkup

**Problem and evidence:** direct owner feedback on a mobile spending-checkup screenshot asks for an easier way to understand household needs. The screenshot and current component repeat the same upcoming total and concentrated period across multiple sections. This is owner feedback and repository observation, not evidence from a household usability study. The baseline research's sections 2.3, 5.3, and 6B support testing clear next steps, timing, and honest amount certainty.

**Proposed decision:** present one preparation total with confirmed and estimated contributions, one contextual prompt to review an estimated expense, and a chronological timeline connecting dates, amounts, and expense details. Offer a weekly cost-grouping concept for comparison. Place category analysis behind an expandable breakdown, preserving category identities and existing records. Keep the proposal within the spending-checkup scope. Do not infer household assignments, completed work, affordability, or provider payment verification from upcoming costs.

**Expected outcome:** help people identify the next saved obligation, see when costs cluster, and recognise which amount needs checking with less repeated reading.

**Validation and follow-up:** conversation-only design concepts use the supplied screenshot's three amounts and dates. Headless Chromium checks passed at content widths of 320px, 390px, and 736px in light and dark appearance, covering expense/breakdown expansion without clipping or runtime errors. Product implementation, existing editor integration, real-device behaviour, and household comprehension remain unverified. Compare whether people can identify the next date, the clustered costs, and the estimated amount before choosing a final layout. Public pages and application indexing rules are unchanged.

**Implementation update, 22 October 2026:** the owner approved the Timeline concept. Implemented one preparation total, one useful next-action prompt, a chronological timeline with consistent item artwork, and expandable period/category analysis. Existing calculations, access checks, category identities, filters, and pagination remain intact. Only missing amounts and estimates trigger an amount-review prompt, following the later owner correction above. Specific prompts open the existing occurrence editor with a stale-occurrence guard; projected dates open their record. Filtered and later pages use a general plan action rather than infer the household's next item from a partial list. The local application checks recorded above passed. Local mobile Lighthouse scored 94 for performance and 100 for accessibility and best practices; the timeline link-name audit also passed. The sample retains its intentional noindex rule, and public indexing checks passed. The expected comprehension benefit remains a hypothesis to test with households.

### 22 October 2026: prioritise useful upcoming-date details

**Problem and evidence:** direct owner feedback on a mobile screenshot asks for the amount at first glance and less prominence for enabled-alert information. Source inspection confirms the calendar detail panel omits the expected amount and displays an alert schedule. This is owner feedback and repository evidence, not a target-household usability study.

**Decision:** implemented identity, the effective expected amount and its certainty, grouped date/timing, and an existing contextual action. Removed detailed alert configuration from the summary while preserving delivery behaviour. Maintenance and warranty summaries prioritise their relevant dates, and warranties retain a route to existing purchase proof. Amount links guard against editing the next occurrence through a stale link. See the [focused design and validation record](2026-10-22-upcoming-detail-plan.md).

**Expected outcome:** understand the selected obligation and reach the next useful action with less reading and navigation.

**Validation and follow-up:** 357 unit tests, type checking, lint, the production build and 242 isolated database integration tests passed. Production application checks passed in Chromium at 1280px and 390px and WebKit at 390px, including 320px layouts, simulated doubled text sizes, keyboard focus, contextual/sample navigation, payment cancellation, failed-save recovery, amount overrides, unknown/zero values, and stale links. Existing HTTP and rendered public/private indexing smoke checks passed. These used local Auth/REST stand-ins and isolated PostgreSQL; hosted Supabase, physical iPhones and household usability remain unverified. Compare comprehension and task completion before treating the expected improvement as established.

### 20 October 2026: reuse the expected amount during completion

**Problem and evidence:** direct owner feedback reported that recording completion left the amount blank despite an amount already configured. Source inspection confirmed that the completion editor only loaded an existing activity's actual amount and ignored the schedule and date-specific expected amount. No device or customer-study context was supplied.

**Decision:** prefill new occurrence completions with the effective expected amount, prioritising a date-specific override over the saved schedule amount. Show the expected amount and identify estimates, asking the person to confirm or adjust the actual payment before saving. Preserve zero, explicit unknown overrides, clearing to unknown, and existing activity corrections. Independent activities retain their own optional cost. This follows the baseline's distinction between expected costs and recorded payments.

**Expected outcome:** avoid retyping a known amount and accidental blank cost records while keeping the person in control of the actual amount recorded.

**Validation:** 352 unit tests, type checking, lint, a production build, and 242 isolated database integration tests passed. Production browser checks passed in Chromium at 1280px and 390px and WebKit at 390px, covering saved defaults, date overrides, zero, explicit unknown, clearing, cancellation, failed-save retention and retry, and persisted actual amounts. Existing payment/service flows and rendered public/private indexing smoke checks also passed. These use local Auth/REST stand-ins and isolated PostgreSQL; hosted Supabase and physical devices remain unverified. An initial development-mode run timed out waiting for a development-overlay request; the production run completed without browser errors.

**Follow-up:** observe whether people understand and adjust the prefilled amount when their actual payment differs. Reduced effort and fewer accidental blanks remain expected outcomes, not validated household-study results.

### 12 October 2026: research baseline preserved

**Evidence type:** desk research and repository observations.

The full report is saved at the link above. Its central recommendation is to connect capture, preparation, action, outcome/proof, the next correct cycle, and retrieval or handoff. Shared household responsibility is a substantial hypothesis to validate. Existing features should be observed and improved before expanding scope.

**Validation status:** no direct target-household study was conducted as part of this research. Proposed interviews and pilots remain proposals. Public sample inspection and source review do not establish authenticated production reliability or real-device delivery.

### 12 October 2026: owner's standing improvement goal

**Evidence type:** explicit owner direction in this conversation.

Keep the deep research available and use realistic feedback and psychology to guide future improvements towards what users need. Repository instructions now make this research discoverable in future work within this checkout. Future product decisions should update this record as evidence accumulates.
