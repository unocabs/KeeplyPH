# Keeply user research and product decisions

Updated 26 October 2026.

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

### 26 October 2026: show calculator reactions and their vote totals

**Problem and evidence:** the owner requests that Helpful, Easy to use and Love it always be visible, with the number of votes exposed. Source inspection confirms the existing controls require a successful calculator result and hide when availability cannot be established. This is direct owner direction and a code observation, not measured customer demand. The baseline's trust and respectful-attention principles support clear optional feedback and truthful loading/failure states.

**Decision and expected outcome:** render the existing reaction section before a calculation, retain it after errors and saved votes, show each reaction's all-time count and their combined vote total, and refresh from acknowledged database counts after saving. Distinguish a real zero from unavailable counts. Preserve optional participation, anonymous aggregate storage, private submission receipts, rate limits and idempotent retries. Explain disabled voting and provide refresh/retry recovery. Expected benefit: discover feedback without completing a calculation and see the recorded response totals.

**Validation:** 15 API unit tests, 251 isolated database checks, lint and the production build passed. Local production browser checks passed in Chromium at 1280px, 390px and 320px and WebKit at 390px, using real isolated PostgreSQL through a local RPC bridge. Checks covered initial visibility, exact counts, successful votes, valid/invalid calculator input, reloads, lost save responses, idempotent retry, missing totals, unavailable voting and recovery. Both engines also passed keyboard voting, blocked storage, unsupported-browser messaging, rapid double clicks and navigation during a committed save. A timed-out initial read recovered through refresh. Disabled controls retain full readability. Rendered metadata, Article/BreadcrumbList JSON and public indexing checks passed. Mobile Lighthouse scored 96 performance and 100 SEO on the calculator, and 98 performance and 100 SEO on privacy. See the [validation record](../../artifacts/public-reaction-totals/validation.json). Read-only hosted discovery found the existing reactions RPC ready and the new totals RPC missing. Migration 042 was run only in disposable local databases; hosted application, deployment, physical devices and household comprehension remain unverified. Counts are voluntary reactions, not unique people or validated satisfaction measurements.

### 23 October 2026: restore the installed checkup's database query

**Problem and evidence:** after the owner installed 040, the complete prerequisite screenshot reported `PRESENT` but the checkup still showed an unavailable state. Hosted SQL reproduced error `25006`: the STABLE RPC runs in a read-only PostgREST transaction, while the existing account guard needs a profile row lock. The same populated query succeeded in a normal transaction followed by rollback. This is observed technical evidence of a separate query defect, not record deletion. The earlier local REST bridge always used READ WRITE transactions and masked the defect.

**Decision and expected outcome:** append migration 041 to correct this RPC's volatility and reload the API cache. Preserve the existing account guard, permissions and saved records. Make the local bridge follow installed function transaction metadata and add a regression reproducing the original failure before applying the correction. Expected outcome: restore the existing checkup and catch this production/local mismatch before future releases.

**Validation and remaining limits:** the assistant applied 041 in hosted production SQL Editor after a read-only prerequisite/catalog check. SQL Editor reported success; subsequent catalog verification confirmed VOLATILE with signed-in execution allowed and anonymous execution denied. Reloading the live signed-in checkup displayed the populated timeline. All 388 unit tests, 250 full disposable database tests, the 74-check focused database run, type checking and lint passed. Focused production browser checks passed in Chromium at 1280px/390px and WebKit at 390px with the corrected bridge, plus public/private HTTP and rendered indexing checks. See the [sanitized validation record](../../artifacts/checkup-transaction-mode/validation.json) and [execution details](../premium-checkup.md). Hosted payday edits, physical devices and household comprehension were not tested. The owner does not need to rerun 039, 040 or 041 on this project.

### 23 October 2026: recover the checkup when the hosted API is an earlier version

**Problem and evidence:** the owner reports that previously visible data is now absent. Read-only discovery against the configured hosted Supabase API returns `PGRST202` for `household_checkup_plan`, including the exact arguments used by the application. The older `household_spending_checkup` and `household_outlook` functions return permission errors in public/server contexts, establishing their presence without reading household records. Repository history shows the Premium redesign changed the signed-in checkup from the older function to the newer one. This is observed technical evidence of an API/version mismatch. It does not establish record deletion or prove whether migration 040 is missing versus the API cache being stale. Earlier message improvements did not resolve this mismatch.

**Decision and expected outcome:** only for a missing new checkup RPC, use the existing authenticated 30-day query. Label the period explicitly, preserve saved records, totals and item identities, and hide payday/change actions until their backend is available. Preserve Premium checks and ordinary error recovery. Do not substitute another scope for network, permission or unrelated database failures. Check the new function on subsequent requests so the complete experience returns after rollout or cache recovery. This restores an existing flow rather than adding a replacement feature. Keep the existing read-only prerequisite check and conditional migration order as the hosted rollout requirement for the full experience.

**Validation and uncertainty:** all 388 unit tests, 72 disposable database checks, lint, type checking and the production build passed. Focused production checks passed in Chromium at 1280px/390px and WebKit at 390px, including populated records, totals, artwork, category filtering, stale extended-range bookmarks, amount-editor cancellation, absence of unsupported controls/writes, and full controls returning when the new function is available. Public/private HTTP and rendered-indexing smoke checks passed. See the [hosted API evidence](../../artifacts/checkup-compatibility/hosted-rpc-discovery.json), [validation record](../../artifacts/checkup-compatibility/validation.json) and [mobile preview](../../artifacts/checkup-compatibility/chromium-390.png). Hosted household contents and physical devices were not inspected. No hosted SQL migration or application deployment was performed. Before enabling payday/change features, run the [complete read-only prerequisite check](../../supabase/check-premium-checkup-prerequisites.sql) in hosted Supabase, apply only missing prerequisites in the documented order, and investigate cache/signature state if the check is already fully present.

**Hosted prerequisite update, 23 October 2026:** the owner supplied a screenshot of the completed 41-row SQL prerequisite check. The visible preceding rows 33 through 40 report `PRESENT`, including migration 039, while row 41 reports migration 040 as `MISSING`. This resolves the earlier uncertainty about 039: do not rerun it. The next outstanding hosted step is to apply the existing 040 migration once, then rerun the read-only check and refresh the checkup. That initial screenshot did not confirm that 040 had been applied. The later screenshot confirms 040 as present; the subsequent transaction-mode repair above supersedes this outstanding-step note.

### 23 October 2026: make checkup readiness and recovery useful

**Problem and evidence:** the owner supplied a checkup loading-failure screenshot and asked for cheerful guidance when data is not ready. This is direct owner feedback. The screenshot establishes a failed load, not an empty account or insufficient data. Baseline sections 2.2, 2.3, 2.4 and 6B support testing trustworthy recovery, a clear next action and honest uncertainty. They do not validate a particular message or tone.

**Decision and expected outcome:** distinguish loading, a successfully loaded empty period, missing amounts, insufficient comparison data, empty filters, exhausted pages and failed reads. Keep useful totals and item artwork visible when comparison data is limited. Explain the comparison threshold without asking users to change correct zero amounts. Offer existing amount editing, add-expense, sample-account, show-all and wider-period actions as appropriate. Failed checkup reads return an explicit unavailable state with retry and saved-expense navigation, preserving authentication redirects and Premium access checks. Expected benefit: understand what is available and take one useful next step without mistaking a failed request for missing records or adding duplicates.

**Validation and limitations:** 379 unit tests, 248 isolated database checks, lint, type checking and the production build passed. Local production flows passed in Chromium at 1280px/390px and WebKit at 390px, covering loading, sparse data, correct zeros, amount-editor cancellation, filter recovery, payday widening, repeated failures, pending retry feedback, successful retry and saved-expense navigation. Existing checkup editing, payment, capture, expiry and source-record flows also passed. Public/sample checks passed in Chromium at 1280px/390px/320px and WebKit at 390px, including rendered SEO checks on 18 routes. Local mobile Lighthouse scored 84/100/100 for performance/accessibility/best practices; SEO was 66 because the sample intentionally remains noindex. Public metadata, structured data, sitemap and indexing configuration are unchanged. See the [verification record](../../artifacts/checkup-recovery/validation.json) and [recovery preview](../../artifacts/checkup-recovery/chromium-1280-read-error.png). These checks use disposable PostgreSQL and local Auth/REST stand-ins. Hosted services, physical devices and the original screenshot's failure cause were not verified. Observe household comprehension before treating the expected benefit as established.

**Follow-up, 23 October 2026:** the owner asks for explicit explanations of why content is absent, in addition to a next step. Added reasons tied to the view: expense-date eligibility and excluded statuses, payday boundaries, missing amounts, category/period filters, exhausted pages, missing comparison history, incomplete historical coverage and unchanged comparisons. Failed reads explain why a partial plan is withheld; unexpected failures acknowledge that the specific cause is unavailable. Missing comparison information is kept distinct from a known first-use state. Expected benefit is clearer understanding, not a validated household outcome. All 381 unit tests, type checking, lint and the production build passed. The local WebKit journey assertions and 72 disposable database checks completed, but the final browser error check failed on canceled navigation/prefetch diagnostics in the local HTTPS harness, including on a repeat run. This is not a fully passing WebKit result. The [verification output](../../artifacts/checkup-recovery/explanations-webkit-checks.json) preserves the diagnostics; the [mobile recovery preview](../../artifacts/checkup-recovery/explanations-webkit-390-read-error.png) shows the explanation without clipping. Hosted services and physical devices remain unverified. Public metadata, structured data, sitemap and indexing configuration are untouched.

### 22 October 2026: implement the Premium payday and change checkup

**Problem and evidence:** the owner approved work on the proposed payday and change-comparison design and asks for a premium visual finish. The accepted timeline UX, recognisable item logos, and ordinary-amount rules remain explicit owner direction. Research baseline sections 2.3, 5.3, and 10 support testing useful timing and clear follow-through. These do not establish validated demand or willingness to pay for these additions.

**Decision and expected outcome:** add an account-saved next payday and a same-date explanation of changes using minimal daily comparison points, alongside the purple preparation summary and compact action cards. Preserve Free payment records, proof and amount editing. Never infer income, affordability, a recurring payday, savings or payment from changed upcoming totals. Save the first checkup opened each local day through a POST, with clear first-use, no-change, passed-date and retry states. Compare complete scopes only, normalize ordinary amount flags internally, and retain only identifiers, dates, amounts and estimate labels for bounded history. Expected benefit: less effort answering what to prepare before payday and why the plan changed.

**Validation and follow-up:** 366 unit tests, 248 disposable database checks, lint, type checking and the production build passed. Signed-in production flows passed in Chrome at 1280px/390px and WebKit at 390px, including cancellation, errors, first use, no change, date boundaries, comparison reconciliation, source records and expiry. Public/sample checks passed at 1280px/390px/320px in Chrome and 390px in WebKit, with rendered SEO checks on 18 routes. Doubled-text and broken-logo checks passed at 320px Chrome and 390px WebKit. Local Lighthouse scored the checkup 89/100/100 for performance/accessibility/best practices and privacy 99/100/100/100. The sample remains intentionally noindex. See the [release and verification record](../premium-checkup.md), including required hosted prerequisite checks and migrations. Hosted Supabase and physical devices were not tested or changed. The sample comparison is explicitly fictional. Household comprehension and willingness to pay remain unverified; test whether users can identify the preparation amount, excluded payday, missing amount and reason for a changed total without assistance.

### 22 October 2026: investigate decision-focused Premium additions

**Problem and evidence:** the owner asks which added capabilities would make the accepted checkup experience feel more valuable as a Premium page. Current source inspection confirms that extended planning, monthly comparisons, and monthly contributors already exist in Premium; basic amount editing, payment recording, history, and proof belong to the existing core. The baseline research sections 2.3, 5.3, and 10 support investigating useful timing and complete closure, without establishing demand or willingness to pay for a specific new feature.

**Recommendations for investigation:** prioritise a user-selected planning end date (for example, the next payday) and an explanation of changes since a previous checkup. A later expected-versus-recorded-paid summary could connect preparation with outcomes. The change explanation needs trustworthy historical baselines and must distinguish edited costs, added expenses, recorded payments, and dates rolling out of the window. Expected-versus-paid analysis must preserve the original expectation, actual recorded amount, missing data, and the difference between service completion and payment. These are proposed additions, not capabilities already implemented or authorised for development.

**External context, rechecked 22 October 2026:** [BillOut](https://www.billout.app/) documents bill planning between salaries and lists salary insights in its Free offering. This establishes an existing product pattern, not validated Keeply demand or an exclusive paid differentiator. [Simplifi's official projected-cash-flow documentation](https://support.simplifi.quicken.com/en/articles/3357429-using-projected-cash-flow) documents dated recurring projections and their exclusions, reinforcing the need to describe which obligations are included rather than imply a complete household balance.

**Expected outcome, validation, and follow-up:** make it easier to answer how much to prepare before a relevant date, why the plan changed, and how recorded costs compared with expectations. These are assistant hypotheses informed by repository inspection and published/product documentation. Prototype and test comprehension and task usefulness with households before changing paid entitlements. Preserve Free access to existing payment records and proof. No features or product output were changed for this recommendation.

**Design exploration, 22 October 2026:** produced a two-screen image for the recommended first two capabilities: an until-payday checkup and the source explanation of a changed total. The illustrative Oct 30 payday view covers Oct 22 through Oct 29, includes three expenses with known costs totalling ₱5,399, labels ₱3,500 as estimated, and excludes one missing amount. The change detail compares the same dates in two checkups: ₱4,899 to ₱5,399, explained entirely by a service estimate changing from ₱3,000 to ₱3,500. Logos remain alongside named items. The image was checked for arithmetic, period scope, missing-cost disclosure, and absence of amount confirmation labels. This is a static proposal. First-use/no-history, no-change, date selection, cancellation, error recovery, responsive behaviour, and historical comparison implementation still require design and validation before release.

### 22 October 2026: recommend visual polish while preserving the accepted UX

**Problem and evidence:** direct owner feedback accepts the implemented checkup UX and asks for a stronger UI design plus a recommendation image. This is owner preference, not a household usability result.

**Proposed direction:** retain the current sequence, actions, timeline, item artwork, and amount rules. Use a compact deep-purple total panel, a lighter next-action card with a clear primary button, more consistent typography and spacing, aligned item logos and amounts, and quieter supporting text. A generated mobile concept uses the existing six fictional sample expenses and unchanged total; only estimates and missing amounts carry labels.

**Expected outcome and validation:** clearer visual hierarchy and easier scanning without introducing another workflow or additional features. The recommendation image was reviewed for content, amount accuracy, logos, and absence of confirmation labels. It is a visual proposal; no application styling was changed and responsive implementation, accessibility, and household comprehension have not been validated for this proposal. Public output and indexing remain unchanged.

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
