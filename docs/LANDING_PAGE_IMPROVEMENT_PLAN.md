# Keeply landing-page improvement plan

Status: implemented locally on September 26, 2026; hosted migration and deployment pending.

Validated: production build (including TypeScript), lint, 24 unit tests, and 34 isolated database integration tests. The user approved the eight-slot reward policy before implementation. Local homepage rendering was checked on desktop and at 375px/768px widths with no horizontal overflow; `/feedback` redirected correctly to `/login?next=/feedback`. The signed-in browser submission, full keyboard/200% zoom pass, and hosted rollout smoke tests remain to be completed after migration.

## Goal

Help a first-time visitor understand what Keeply stores, what is free, and how to save their first item. Preserve the calm purple identity and improve hierarchy, page length, and the path to signup.

Phase 1 covers the public homepage and its presentation only. It requires no database migration, new service, or recurring cost. It does not change pricing, reminder limits, storage allowances, checkout, authentication, or the signed-in application.

Phase 2, added at the user's request, introduces in-app feedback and an optional one-time promotional reminder pack. Unlike Phase 1, it requires database, access-control, billing-entitlement, and UI work. The policies below are proposed defaults for implementation review.

## Current findings

- The hero has a clear headline but does not explain the three free reminder slots.
- The first category grid links to explanatory pages; the later template grid starts item creation. Both functions are useful, but their presentation repeats similar content.
- The product preview and ordinary cards have similar visual weight.
- The FAQ leads directly into the footer without a final signup action.
- Homepage styles share global selectors and template components with other pages. Changes must be scoped to avoid altering forms, demos, pricing, or the item picker.
- The supplied feedback's prices are outdated. Current offers remain +5 slots for ₱29 per 30 days with manual renewal, or ₱249 once for permanent slots. Free file storage remains 100 MB.

## Proposed page order and changes

### 1. Hero: explain the offer earlier

Keep “Your important things, remembered.” and the existing product explanation.

Replace the footnote with:

> Save unlimited items. Get reminders for 3 items free.
> No credit card required.

Retain “Start for free” linking to `/add` and the secondary “See an example” linking to `/demo`. Do not add upgrade prices to the hero. Avoid “Keep everything for free,” which can imply unlimited document storage.

### 2. Categories: retain the discovery paths

Keep “What should Keeply remember for you?” and its six existing categories and destinations. These are explanatory links, not template creation buttons.

Keep descriptions to one concise sentence. Use restrained purple accents, consistent arrow/icon sizing, and clear hover and keyboard-focus states. These cards should have less depth than the product preview.

### 3. Product preview: make the value visible

Retain the Sony headphones, Toyota Vios, and passport examples, the “Example” label, and `/demo` link.

Give the preview a subtle lavender backdrop, slightly stronger border/shadow, and clearer row spacing. Make item name, date type, and remaining time easy to distinguish. On narrow screens, allow the time to wrap without colliding with the item name.

Do not suggest that example dates are live data. No animated bell or decorative motion in this iteration.

### 4. How it works: simplify presentation

Keep three steps: choose an item, add relevant details, find it when needed. Present them as a lightweight sequence rather than another substantial card grid. Retain the explanation that reminders are optional and documents are supported only where appropriate.

### 5. Calmer-home section: reinforce the habit

Keep “A calmer home, one small habit at a time.” Add concise habit-oriented supporting copy:

> A new appliance, a receipt, a service date. Give it a place in Keeply while it is fresh in your mind.

Keep the appliance receipt and aircon actions and the `home-appliances` anchor. Use a faint tint and generous spacing, with less emphasis than the main product preview.

### 6. Template directory: compact, actionable

Keep the “Everything Keeply can track” heading and `everything` anchor, but replace the full repeated cards on the homepage with a compact directory.

- Two columns on desktop and one on mobile.
- Each link has an existing template icon, name, short supporting phrase, and a clear clickable area.
- Retain all currently supported templates and their direct `/add/<template>` destinations.
- Derive labels/routes from the existing template definitions to avoid drift.
- Keep the existing full template picker unchanged in add-item flows and dialogs. Prefer a homepage-only component rather than changing shared picker behavior.

### 7. Free tier: state the limits plainly

Keep “A little room, for free.” Explain unlimited saved items, three item reminder slots, and 100 MB of files together. Explain that multiple enabled dates on the same item share one slot.

Retain the pricing link. No new prices, discounts, storage promises, or automatic-renewal language.

### 8. FAQ and final action

Preserve useful FAQ content and accessible native disclosure controls.

After the FAQ, add a restrained closing section:

> Start with one thing.
> A receipt, a renewal, or a date you want to remember.

Use one primary “Start for free” link to `/add`, followed by the existing footer. Do not add a sticky signup overlay or another category selector.

## Visual and accessibility rules

- Use existing fonts, colors, icons, and button styles; no new UI dependency or external font.
- Reserve stronger shadows for the product example and modest hover feedback for interactive cards.
- Limit new tinted backgrounds to the preview and habit section.
- Use consistent section spacing and a clear heading hierarchy with one page-level h1.
- Maintain readable text contrast: at least 4.5:1 for normal text and 3:1 for large text.
- Aim for at least 44px touch targets on new controls; preserve visible keyboard focus.
- Do not convey meaning solely through color or hover. Decorative icons should be hidden from assistive technology.
- Honor reduced-motion preferences; no essential animation or hover-only content.

## Implementation sequence

1. Capture baseline desktop/mobile screenshots and inspect the latest working-tree changes so existing SEO work is preserved.
2. Read relevant installed Next.js documentation as required by AGENTS.md before editing application code.
3. Update homepage copy and final CTA in `src/app/page.tsx`.
4. Implement the compact homepage template directory using existing template definitions/icons.
5. Add homepage-scoped styling in `src/app/globals.css`; avoid broad changes to `.panel`, `.button`, `.template-choice`, and shared typography selectors.
6. Review actual rendered desktop/mobile views and adjust spacing, wrapping, and emphasis.
7. Run the checks below, review the diff, and report the result for the user's deployment workflow. Do not use provider dashboards or change external settings as part of this implementation.

## Acceptance and validation

- The hero communicates unlimited items and three free reminder slots; the free-tier section also states the file limit.
- All six discovery links, all template links, anchors, pricing links, and signup/demo actions work as before.
- The full repeated template grid is replaced by the compact directory; supporting content remains visible without extra clicks.
- The preview is visually more prominent than category cards; the mobile page has no horizontal overflow at 375px and 390px widths.
- Check tablet layout at 768px and desktop at 1440px, plus text zoom at 200%.
- Complete a keyboard pass through navigation, cards, template links, FAQ, and final CTA.
- Smoke-check `/add`, `/demo`, `/pricing`, and the add-item dialog for shared-style regressions.
- Preserve canonical metadata, structured data, social image, and crawlable links from the SEO work. Do not remove the dedicated tracker pages.
- Run lint and the production build, including its TypeScript check. No database tests or new tests that merely mirror static copy are needed.
- Use before/after screenshots to judge hierarchy and page length; do not claim a conversion improvement from visual inspection alone.

## Follow-up after release

Ask a few first-time users: “What can you save?”, “What is free?”, and “How would you add your first item?” Note hesitation and misunderstood limits. Use that feedback before considering more visual effects or new analytics.

Deferred: pricing/slot changes, additional templates, onboarding redesign, animation, testimonials without real user permission, new tracking services, and broader SEO/content campaigns.

## Phase 2: feedback and a one-time thank-you reward

### Purpose and placement

Give users an easy way to report a problem, suggest an improvement, or share what helped them. Use the visible label **“Add feedback”** (more natural than “Add a feedback”).

- Desktop signed-in app: a persistent sidebar link near Settings, without competing with Add item.
- Mobile signed-in app: the equivalent navigation/menu entry; no second floating action button.
- Public homepage: a quiet “Feedback” footer link. Visitors sign in before submitting; anonymous rewards are not supported. Preserve the destination through login using the app's existing safe redirect flow.
- Use a dedicated feedback page that is easy to link to and revisit.

### Form and copy

Required for every submission: a feedback type (Problem, Suggestion, or General feedback) and a short summary (5–120 trimmed characters).

Notes rules:

- Before the account has claimed its reward: require 30–2,000 trimmed characters. Explain the requirement before submission and show a character count.
- After the reward has been claimed: notes become optional, with the same maximum length. The summary remains required so empty feedback cannot be submitted.
- Preserve typed content after validation errors or temporary failures.
- Do not include attachments, automatic screenshots, receipt contents, or document access in this MVP form. Add a hint to avoid passwords, payment details, and identity numbers.

Suggested pre-claim message:

> Tell us what worked, what confused you, or what you would improve. Submit your first written feedback to receive 5 extra reminder slots for 30 days, once per account. Honest feedback is welcome—positive or negative.

Suggested post-claim message:

> Thank you for helping improve Keeply. You have already claimed your one-time reward. Additional notes are optional.

Do not require a public review, star rating, referral, or positive sentiment. Do not publish feedback as a testimonial without separate permission.

### Reward policy

Recommended as a small MVP experiment, not a permanent acquisition promise. Written feedback can help discovery, but rewarding submission also encourages low-effort entries. A character minimum is a basic input rule, not a guarantee of quality; avoid subjective automatic quality scoring.

- Reward: five additional reminder slots for 30 days, once per authenticated account, following the first successfully saved qualifying feedback submission.
- Begin the term at successful grant time using server time. Display the actual expiry date to the user.
- Do not require payment details or create a PayMongo checkout. No automatic renewal or charge.
- The promotion adds no storage and does not enable reminders on items automatically.
- Record the claim permanently for the life of the account, even after expiry or feedback withdrawal, so it cannot be reclaimed.
- Clarify that “once” means once per account, not verified once per human. Google sign-in and rate limits reduce abuse but cannot prevent a person using multiple accounts. Do not introduce invasive identity checks for this promotion.
- Add an operator-controlled promotion switch. Turning it off stops new rewards but preserves granted ones and continues accepting feedback. When disabled, hide the offer and allow optional notes.

### Interaction with paid packs: preserve the current eight-slot ceiling

Use these proposed defaults rather than silently changing launch pricing or slot capacity:

| Account state at claim time | Proposed result |
| --- | --- |
| Free account | Activate five promotional slots for 30 days: eight total slots. |
| Active paid 30-day pack | Append 30 promotional days after the current paid expiry; keep eight total slots. |
| Expired paid pack | Activate a fresh 30-day promotional term; keep eight total slots. |
| Permanent five-slot pack | Accept feedback, but do not advertise or consume a temporary reward that gives no benefit. Notes may be optional for these accounts. |

If a temporary user purchases a 30-day pack while promotional access is active, append the paid term to the existing effective expiry without losing remaining promotional days. If they buy permanent access, permanent access supersedes the temporary benefit; the promotion remains claimed.

Keep promotional and paid grants distinguishable. Payment refunds or webhook replays must not erase or duplicate an unrelated promotional benefit. Reuse the established expiry behavior: saved items remain, three free covered items remain eligible, and excess coverage pauses. Clearly show the expiry and the manual paid-renewal option without implying an impending automatic charge.

**Approved policy (September 26, 2026):** this plan keeps the current eight-slot maximum. A literal extra five slots on top of an existing paid pack would mean thirteen slots and requires a broader capacity/billing change. The permanent-pack exception also needs agreement because it differs from awarding every account the same bonus.

### Data, access, and abuse protection

- Store feedback privately with author ID, type, summary, notes, creation time, and a simple review status. Make submitted content plain text and render it safely.
- RLS must isolate user submissions; ordinary users must not read other users' feedback or edit moderation fields.
- Use a server-authorized transactional operation to save the feedback and grant the reward. Never trust a client-supplied user ID, claimed flag, expiry, or slot count.
- Enforce a unique one-time claim per account in the database. Use an idempotency key per submission so double clicks, retries, and concurrent tabs do not create duplicate feedback or grants.
- Recheck claim status and promotion availability at submission time. Return a clear result if eligibility changes while the form is open.
- Apply server-side field limits, same-origin protections, and a modest per-account submission rate limit, with useful error messages.
- Separate promotional entitlements from test-payment grants. The production/test billing mode must remain intact.
- Define privacy retention before release: proposed feedback retention is 12 months, with account deletion removing identifiable feedback through the existing deletion workflow. Keep only the minimum claim record required while the account exists. Review related renewal-email consent and disclosures for promotional expiry notices.
- Review feedback through a private operator-only database view initially; no public feedback board, new admin dashboard, or email notification service is required. Never expose service-role credentials in a browser.

### Implementation order and acceptance checks

1. Finalize reward stacking and permanent-pack eligibility policy before touching entitlements.
2. Inspect current billing, coverage-expiry, account deletion, and reminder-renewal code; design a migration that preserves existing paid grants.
3. Implement private feedback storage, transactional submission/claim operation, RLS, and rate limits.
4. Add the feedback page, navigation links, eligibility copy, validation, confirmation, and visible reward expiry.
5. Update privacy/pricing or promotion disclosures where needed. Describe the bonus as temporary and once per account.
6. Test with a separate test database before deploying to the live billing project.

Required meaningful tests:

- Qualifying first submission creates one feedback record and one 30-day grant.
- Whitespace-only or too-short required notes cannot claim a reward.
- Subsequent feedback accepts a summary without notes and awards nothing extra.
- Retries, simultaneous submissions, and replayed requests cannot duplicate grants.
- One account cannot read or claim on behalf of another; client inputs cannot set entitlements.
- Active/expired paid packs, promotional-to-paid purchases, permanent upgrades, refunds, test/live separation, and expiry all preserve the approved policy.
- Saving feedback and claiming a reward succeed or fail together; failure does not silently consume eligibility.
- The promotion switch does not revoke existing rewards; account deletion follows the retention policy.
- Desktop/mobile navigation, focus handling, error recovery, and confirmation text work accessibly.

### Evaluate the experiment

Review actionable issues and suggestions received, repeat feedback, and whether recipients actually use reminder slots. Do not use positive sentiment or raw submission count alone as proof of success. Start with the early-user cohort and reassess if spam or email usage grows.
