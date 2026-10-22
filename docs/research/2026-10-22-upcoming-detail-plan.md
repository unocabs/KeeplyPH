# Upcoming detail panel: information and action plan

Date: 22 October 2026. Status: implemented locally and validated in production-mode browser checks.

## Problem and evidence

Direct owner feedback, accompanied by a mobile screenshot, asks for useful information such as the price at first glance and questions the prominence of enabled alerts. This is owner direction, not an observed target-household usability study. Do not retain account-specific information from the screenshot in research records.

At planning time, source inspection confirmed that `UpcomingTimeline` led with the date label, repeated item/category context, showed the due date/countdown, and dedicated a section to alert dates and channels. It did not display the expected amount. The closing action opened the reminder record.

The saved research baseline supports making the next action understandable and preserving amount uncertainty. Relevant sections: 2.3 (credible next steps), 2.5 (control over attention), 6B (honest uncertainty), 8 (bill, maintenance and warranty journeys), and 10 (improve existing flows). These are research-informed design inferences, not proof that this proposed panel improves household outcomes.

## Implemented decision

Make this a compact summary of the selected obligation. Its first view should answer: what is it, how much or what matters, when, and what can I do next?

1. **Identity:** lead with the saved item name and its identity icon. Put the date/task label underneath. Avoid repeating the same provider or category; retain distinguishing account or item names. Keep the full saved label available when it carries useful meaning.
2. **Useful value:** for payments, show the effective expected amount as the strongest value. Put its certainty beside it. For maintenance, lead with the service due and include an expected cost only when saved and relevant. For warranties, lead with the recorded expiry and a route to existing proof. Do not show the original purchase price as money due.
3. **Timing:** place the exact date and relative timing together, directly below the value. Use the correct meaning, such as payment due, service due, or recorded warranty expiry. Keep the year available when needed for clarity.
4. **Context:** if helpful existing information is available, show one short, relevant note or repeat frequency. Do not fill missing data with placeholder sections. A note must not be promoted to an invented payment instruction or booking status.
5. **Action:** show one prominent contextual action and one quieter route to the full record. Reuse the existing date-action policy and deep links. Payments can open the existing recording form; subscriptions currently use review renewal; warranties use review warranty. Evaluate action wording for clarity without silently changing those workflows.
6. **Alert configuration:** remove the enabled-alert list from this summary. Keep alert controls and detailed scheduling on the existing record. This changes presentation, not alert delivery or channel availability. Do not replace the list with a routine alerts-enabled badge.

The mobile panel should have a comfortably tappable close control, a compact header, and a full-width primary action. Aim to show identity, amount, timing and action without scrolling at a typical 390px mobile viewport. Preserve scrolling at larger text sizes rather than clipping content. Use a restrained amount/date grouping instead of several equally prominent cards. Keep the desktop dialog consistent with the mobile hierarchy.

## Amount and status rules

- Reuse `occurrenceAmount(date, occurrence)`, which respects the selected date's override and explicit unknown state before the schedule default. Do not use only the schedule amount or a past payment.
- Preserve confirmed, estimated, unverified and unknown states in the data. Following the owner's wording correction, label displayed values Amount, using Estimated amount only for an estimate. Unknown values still say Amount not set. Do not add saved/confirmed status suffixes or imply that displaying an amount confirms payment.
- Unknown must never become zero. A known zero remains visible as zero. An explicit unknown override must not fall back to the schedule amount.
- When cost is expected but unknown, offer Add amount through the existing amount editor deep link. For a nonfinancial date, omit the monetary block when it is irrelevant.
- Keep dates and relative timing correct around account-timezone midnight. Urgency needs text and must not depend only on colour.
- Do not label a record Unpaid just because completion is absent. Use factual language such as No payment recorded only when the available record supports it. Upcoming dates need not gain an extra status badge.
- A primary action opens a review or confirmation flow. Opening, cancelling or failing must never mark anything completed. Recording payment describes the user's record, not money moved or provider settlement.
- The dashboard calendar receives upcoming open occurrences for each saved date, so one item may have several markers. The separate `timelineRows` helper deduplicates by item, but the dashboard uses `comingUp(dateRows(...))` directly. Preserve that selection behaviour. Do not add a completed-state panel without a separate need. Guard against stale occurrences using the existing detail flow.

## Scope and implementation sequence

1. Update the summary hierarchy and amount display in `src/components/upcoming-timeline.tsx`, using existing amount formatting and selected-occurrence data.
2. Update `src/components/upcoming-timeline.module.css` for compact mobile and desktop presentation, long names, safe-area padding and larger text.
3. Reuse contextual action links from `src/features/items/date-action.ts`, and the existing amount editor intent. Verify the selected date and occurrence reach the intended existing form. Preserve the sample-account base path and truthful sample limitations.
4. Adapt nonfinancial content using existing records only. Do not add provider payments, household assignment, booking, new subscription controls, new history queries, or new document interactions to fill the space.
5. Verify and then update this decision record with actual results. Read the installed Next.js guides before implementation.

Keep this first change limited to the calendar detail panel. The screenshot does not establish that the calendar default, dashboard navigation, public pages, pricing, or alert behaviour should change. Check public pages and indexing rules remain unaffected when implementing.

## Expected outcome and validation

Expected outcome: less reading and navigation to understand the selected obligation, its amount and timing, and the next supported action. This remains a hypothesis.

Before release, cover confirmed/estimated/unverified/unknown/zero amounts, occurrence overrides, due today and past dates, long names, different obligation types, sample mode, stale selections, and inaccessible/archived records. Check successful recording, cancellation, failed-save recovery, retries, the correct occurrence and recurrence behaviour. Follow the existing completion flow rather than introducing a second one.

Check 320px and 390px mobile widths, desktop, larger text, keyboard entry/escape/focus restoration, accessible names and touch targets. Validate Chromium and WebKit, and physically check an offered iPhone/browser combination before describing real-device behaviour as verified.

A short comparative usability task should ask people to identify the item, amount, amount certainty and date, then find the correct next action. Measure correctness, time and unnecessary navigation; a five-second first-glance check is a proposed test, not an established benchmark or completed result. Test a subscription, bill, maintenance date and warranty so amount-first does not distort nonfinancial obligations.

## Implementation and validation result

Implemented the item-first header, payment amount and certainty, grouped timing, a short saved note when available, contextual actions, and a quieter record link. Service and warranty dates lead their respective summaries. Warranty records link to existing purchase details and proof; original purchase prices are not displayed as costs due. The enabled-alert schedule is removed from the summary, with existing controls and delivery behaviour preserved.

The panel uses the current row data while open and closes if its selected occurrence disappears. Amount links identify their occurrence; an older link does not automatically open the amount editor for the next cycle. Payment and service links reuse the existing confirmation forms. Missing payment amounts lead to the existing amount editor.

Validation completed locally:

- 357 unit tests passed, including new summary coverage for amount overrides, all certainty states, unknown/zero separation, contextual and sample links, service cost relevance, warranty/price separation, and archived/past-date presentation.
- Type checking, lint and the production build passed.
- All 242 isolated PostgreSQL integration tests passed.
- Production-mode application checks passed in Chromium at 1280px and 390px and WebKit at 390px, with real server actions and isolated PostgreSQL behind local Auth/REST stand-ins.
- The panel also fit at 320px in both browser engines and with simulated doubled text sizes. Long names remained readable without horizontal overflow. Native text settings on physical devices were not tested.
- Verified sample renewal review, sample service entry, sample activity cancellation, warranty receipt retrieval, missing-amount navigation/cancellation, and sample isolation. Checked keyboard opening, Escape, close-button focus and focus return.
- Real payment flows entered through the panel showed the correct schedule amount or occurrence override, including estimated, confirmed, zero and explicit unknown values. Cancellation left records unchanged; failed saves retained the form; retry recorded once. A stale amount link did not open the editor for the next occurrence. Existing service-payment completion, cost confirmation, cancellation, retry and recurrence checks also passed.
- Existing HTTP smoke checks passed, including rendered home language/canonical/structured-data presence, sample noindex and private authentication guards. Public marketing source, metadata and indexing rules were not modified.

The first browser run stopped because a test locator matched two dates for one vehicle. The locator now deliberately chooses the earliest displayed date; the subsequent run passed across all three browser/viewport combinations.

See the [validation record](../../artifacts/upcoming-details/browser-checks.json) and [mobile panel screenshot](../../artifacts/upcoming-details/chromium-390-subscription.png).

Hosted Supabase, physical devices and a comparative household usability study remain unverified. Reduced reading effort and improved task completion remain expected outcomes. Keep, revise or reverse the hierarchy based on comprehension and task completion in subsequent observation.
