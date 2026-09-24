# Keeply: reminder slots and restrained visual refinement

Status: implemented locally; final local database and smoke validation completed on 24 September 2026. Hosted setup and provider integration verification remain pending. This supersedes the pricing and reminder-limit proposals in `KEEPLY_PH_V1_PLAN.md` and `IMPLEMENTATION_PLAN.md`; their unrelated requirements remain useful historical context. The specification below retains its original planning context; references to the old architecture describe the pre-change baseline.

### Local validation checkpoint — 24 September 2026

- All nine migrations applied successfully to an isolated temporary PostgreSQL database. Fixed the dollar-quote delimiters in migration `202609240009_history_measurement.sql` discovered during the final rehearsal.
- 27 database integration tests passed, including ownership/RLS, slot replacement, expiry, renewal, payment replay, verified refunds, test/live pack isolation, and pagination beyond 2,000 items.
- 24 unit tests, TypeScript, and ESLint passed. The application production build passed in the preceding implementation checkpoint; this validation changed SQL, database tests, and this document only.
- Local smoke checks passed for 17 public/demo pages, three signed-out route guards, cron authorization, and upload origin protection.
- No hosted database migrations, live payments, or emails were run. Next: configure Supabase and Google sign-in, then validate PayMongo test checkout/webhooks and email delivery before deployment.

## Scope and recommended decisions

- Unlimited saved items. Three free reminder slots. A slot covers one item, including its individually enabled dates.
- Offer five additional slots for ₱29 per 30 days, renewed manually, or ₱249 once permanently. The 30-day duration is the proposed precise definition of the short-term pack; display it consistently instead of “monthly subscription.” No automatic charges.
- Keep document storage separate: recommend retaining 100 MB for new accounts, with existing per-file and per-item attachment limits. Buying reminder slots does not buy storage. Preserve existing paid storage promises through their purchased term. This is a proposed product decision, not a requirement inferred from “unlimited items.”
- Keep users in control of coverage. Include enable, disable, and atomic replacement in this release, rather than postponing the ability to move slots.
- Preserve layout, templates, sample items, date history, and consent. Apply subtle visual improvements through shared styles.
- Recommend one paid pack at launch, choosing 30-day or permanent; no quantity selector or stacking purchase flow yet. Renewing extends the same five-slot pack rather than adding five more slots. Store grants so stacking can be enabled later.
- Use standard PayMongo Hosted Checkout for each purchase and user-initiated renewal. No PayMongo subscription API, automatic charging, or manual transfer-verification workflow. Checkout has no setup or monthly subscription fee, but successful payments incur transaction fees; “free” does not mean fee-free processing. Verify enabled methods, minimum amounts, and applicable fees before launch.
- Send a calm renewal reminder before the 30-day pack expires. Users may pay again or let the extra slots expire; saved items and the three free slots remain.

### Meaning of coverage

Coverage is a persistent selection, not a count of upcoming dates or emails. Enabling it requires a saved, unarchived item with at least one enabled date. Once selected, it keeps its slot until disabled, archived, deleted, or paused for insufficient capacity—even when its dates pass. Show “No upcoming reminders” separately so users can choose to free the slot. This avoids unexpected reassignment when a due date passes or a recurring item is renewed.

Per-date preferences continue to control which alerts are wanted. Global email pause or a delivery failure prevents delivery but does not reshuffle selected items. Archiving clears the selection and frees the slot; restoring saves the item without automatically reclaiming coverage. Deleting frees it. New items never steal a slot.

When paid capacity ends, keep the oldest selected items first, using selection time plus item ID as a deterministic tie-breaker. Users can explicitly replace selections before or after expiry. Retain excess selections as “Paused — no available slot,” preserving date preferences. Those selections resume when capacity returns; disclose this in billing and reminder management. Items saved without a slot are not selected and never automatically activated after purchase.

## 1. Current architecture

Next.js App Router with server actions, Supabase Auth/SSR and PostgreSQL RPCs/RLS, private Supabase Storage, Resend email delivery, and existing PayMongo checkout code. Retain the app/data/email architecture and PayMongo checkout, extending the existing billing ledger for 30-day and permanent products. No ORM or second notification service is needed.

The current generic item implementation supports receipt, car, motorcycle, licence, passport, aircon, and other templates. Important dates have occurrence history and day/month offsets. Legacy purchase routes and types still exist and must participate in the same rules.

Current limits are 10 saved items / 3 active dates / 100 MB for free accounts, and 1,000 items / 1,000 active dates / 2 GB while `premium_until` is valid. Billing currently purchases a manually renewed ₱360 year. These conflict with the new item-based slot model. The smallest clean change is one item-coverage abstraction, one central capability calculation, and product-aware billing within the existing architecture.

Inspection covers local source and migration definitions, not a live production database. The last known account setup status was that Supabase and PayMongo were not yet created. Do not assume there are no users, payments, or applied migrations without deployment preflight.

## 2. Existing components and services

`features/items` implements generic queries, validation, and actions. `features/purchases` maintains compatibility. Shared forms, dashboard, item detail/list, billing, app shell, and tracker landing pages display the old limits.

The SQL RPCs are the authoritative write boundary. `private.require_user` locks the account profile to serialize writes. Document reservation and finalization enforce separate storage constraints. Cron routes claim notification jobs and run maintenance; Supabase scheduling calls those routes. Billing actions create PayMongo checkout sessions, and the webhook verifies payment before crediting access.

Why this matters: changing only TypeScript or UI would leave database save failures and old queued emails intact.

## 3. Existing database entities

Relevant public entities: `profiles`, `account_entitlements`, `items`, `important_dates`, `date_occurrences`, `reminder_offsets`, and `documents`. Compatibility views include `purchases` and `warranties`. Documents still use `purchase_id` referencing items; renaming it is unnecessary for this work.

Relevant private entities: notification jobs, daily email quota and delivery events, billing orders/events, rate-limit buckets, object/account deletion queues, and analytics state/aggregates. `private.current_dates` joins current occurrences to their items. Preserve ownership constraints, occurrence uniqueness, storage privacy, and immutable payment evidence.

## 4. Existing reminder flow

Saving a date calls scheduling SQL. Jobs use the account timezone and day/calendar-month offsets. Current `trim_reminders` disables excess dates; `check_reminder_limit` can reject the save transaction, including an initial item save.

The worker claims leased jobs, builds the email, calls `prepare_notification` to check eligibility again, sends through Resend with a stable job-based idempotency key, then records completion. Retries retain frozen payloads. Old occurrences, removed offsets, archiving, global email settings, delivery blocks, and account deletion are checked. Existing daily capacity is at most 90 emails, not 90 covered items.

Replace the date quota and trimming semantics without discarding leases, occurrence history, idempotency, or delivery suppression.

## 5. Existing payment flow

An authenticated action creates/reuses an order, creates a PayMongo checkout, stores its identifier, and redirects. The current order has a fixed ₱360 price. Signed paid callbacks fetch the checkout server-side, validate the payment, and call `credit_payment`. Event, payment, and order uniqueness protect annual credit from duplication. Refund/dispute events currently enter review rather than automatically revoking access.

The current code is historical context, not the proposed MVP payment flow. There is no permanent-slot grant today. Reuse its checkout, webhook, order/audit/idempotency concepts, but replace the fixed annual credit calculation. Do not build recurring subscriptions.

## 6. Central entitlement and coverage model

Expose a server capability read model through `features/entitlements`, backed by authoritative SQL:

```text
base slots = 3
paid slots = sum(permanent non-revoked grants)
           + sum(active manually paid time-limited packs, once per pack)
slot limit = max(base slots + paid slots, unexpired legacy slot floor)
used slots = count(effective selected items)
```

Return saved-item count, slot limit/used/available, uncovered and capacity-paused counts, storage allowance/usage, and relevant billing dates. Expose item coverage as `off`, `covered`, or `paused_capacity`, plus a separate delivery state and next scheduled date. “Covered” does not promise successful email delivery.

SQL is the single authority for ranking selected, saved, unarchived items within capacity. Derive entitlement validity using database time on every sensitive operation. A stale browser cache or missed cron run must not extend paid coverage. Server helpers consume that result rather than independently reimplementing billing rules.

Keep date preferences independent of item coverage. Retire `premium` checks from normal UI/business logic; keep legacy translation inside the entitlement boundary only.

## 7. Proposed database changes

Add forward migrations, provisionally `202609230007_reminder_slots.sql` and `202609230008_reminder_pack_billing.sql`. Do not rewrite migrations 001–006 that may already be applied.

- Add an owner-bound item selection relation, unique on item, with selected timestamp, revision, and scheduling eligibility epoch. Enforce composite item/user ownership. Expose owner reads; mutations go through account-locked RPCs.
- Add a product catalog with immutable versioned SKUs: 30-day five-slot pack, permanent five-slot pack, and historical annual product. Prices use integer centavos: 2900, 24900, and legacy 36000. Order lines snapshot SKU/version, quantity, slot quantity, duration, currency, price, and payment channel.
- Extend private orders/events, rather than introducing a competing order ledger. Deduplicate pending checkouts by account, product, and purchase intent. Track pending, paid/fulfilled, expired/failed, and refunded/review states; expose only the account owner's safe status projection.
- Add verified payment evidence and entitlement grants: PayMongo checkout/payment identifiers, test/live mode, amount/currency, verification timestamp, and fulfillment linkage. Enforce uniqueness on mode + provider payment identifier, and on order-line fulfillment. One renewed pack has a single capacity contribution with an audited paid-through timestamp. Do not add vaulting, recurring invoice, or subscription tables.
- Commit verified payment fulfillment and its audit event atomically. Repeated callbacks or reconciliation must return the previous result without granting time or slots again. An event recorded but not fulfilled must remain retryable. Add renewal-notice jobs keyed by pack ID, paid-through version, and notice type.
- Add indexed owner/cursor queries and aggregate RPCs. Index item owner/state/archive/creation/ID, selection ordering, entitlement validity, provider references, and due jobs as needed after query review.
- Replace `account_usage`, reminder preview, quota checks, and scheduler functions. Remove saved-item maximum checks from both generic and legacy paths. Preserve draft/rate/attachment/date-count controls as separate abuse and resource controls.

Use consistent lock ordering: identify owner without locking, lock profile, then selection/order/pack/job rows as needed. Re-read mutable records after acquiring the account lock. Review the existing order-first billing path before combining it with account-first slot changes.

## 8. Backend changes

`save_item_with_date` must commit valid item/date data even when coverage cannot be allocated. Return a structured save result containing item ID and coverage outcome. Invalid dates or stale revisions can still fail validation; slot exhaustion cannot roll back a valid save.

When the user requests reminders during save: save date preferences, then allocate under the same account lock if capacity is available. Otherwise leave the new item unselected and return `saved_without_coverage`. Editing a date on an already covered item consumes no extra slot. Saving without a reminder request never enables coverage.

Add enable, disable, and replacement RPCs with ownership checks and expected revisions. Replacement disables the source and enables the destination atomically; failure leaves both unchanged. Serialize concurrent saves/replacements/purchases against the same account lock.

Replace `getItems`' fixed two 1,000-row pages and the legacy 1,000-row read limit with cursor pagination. Apply search, template/status/reminder filters, and ordering in the database before pagination. Use aggregate counts and bounded upcoming/recent queries for the dashboard. Load occurrence history separately in pages; do not fetch every historical occurrence for every item. This makes unlimited saving usable beyond the current implicit read ceiling.

Document quota failure should explain the attachment constraint, preserve entered item data, and permit saving the item without that attachment. Identity templates retain their dates-only restriction.

## 9. Frontend and visual changes

Dashboard: show saved count without a denominator; “3 of 3 reminder slots used”; retain upcoming dates regardless of coverage. Explain uncovered state with a small filter/link, not another billing panel. An item with three enabled dates consumes one slot.

Forms: preserve per-date reminder preferences, but explain that all enabled dates on the item share a slot. After a capacity-limited save: “Saved. This item won’t send reminders yet.” Follow with current slot usage, “Manage reminders,” and “Add 5 reminder slots.” No blocking upgrade modal.

Item detail: item-level coverage control plus date-level settings, next schedule, and delivery status. Reminder management lists selected/paused items, supports deliberate replacement, and previews which selections remain after expiry. Use current patterns for accessible dialogs and focus management.

Billing: two choices, “₱29 for 30 days” and “₱249 once,” each adding five slots. Redirect to PayMongo checkout and show backend-verified payment status and exact paid-through date on return. State “Manual renewal. No automatic charges.” Show “Renew for 30 days” for an active short-term pack; hide redundant purchases after permanent access. Clearly separate file storage and explain the permanent transition. A checkout return is not proof of payment; show pending until server verification completes.

Visual refinement: consolidate shared CSS tokens instead of appending another layer of overrides. Use faint lavender page backgrounds, low-opacity shadows, delicate borders, roughly 18px card radii, and white surfaces. Give Heads-up strongest emphasis, stats softer surfaces, and item cards mostly borders. Use restrained purple gradients for primary CTAs and optionally the single hero accent word; keep green/orange semantic icons. Increase section spacing responsively, approximately 80–96px on wide home layouts. Preserve layout and content hierarchy; no decorative footer wave, large blobs, animated gradients, or pervasive blur. The reference image is direction, not a mandate to reproduce every decoration.

## 10. Scheduler and job changes

Check effective item coverage at scheduling, claim, and immediately before send, alongside all existing date/account checks. Replace destructive `trim_reminders` behavior with coverage reconciliation. Do not erase date opt-in preferences when capacity falls.

Disable/replacement/archive/payment changes invalidate pending work for lost coverage. Effective SQL capacity checks prevent delivery after expiry even before housekeeping cancels jobs. Reconciliation schedules future thresholds for newly effective selections, using a fresh eligibility epoch so old missed thresholds are not replayed after a pause.

Preserve unique occurrence-plus-offset job identity. Never reset accepted/delivered or uncertain attempted jobs into fresh sends; preserve provider idempotency and frozen payload safety. Re-enable only eligible unattempted work using the existing job identity, or follow the established uncertain-delivery resolution. Do not add coverage generation to a uniqueness key in a way that sends the same alert twice.

There is an unavoidable small boundary between final database authorization and external email acceptance. A send already accepted/in flight cannot be recalled after a simultaneous disable. Document this accurately; guarantee rejection at final preparation and suppression of later attempts, not transactional cancellation of an external provider request.

Keep bounded batches and global delivery budget. Multiple dates per covered item increase potential mail volume; monitor queue age and skipped deadlines before launch. Saved item count must not become an indirect email-cost cap.

## 11. PayMongo one-time checkout and manual renewal

Use PayMongo Hosted Checkout for both products and every renewal. PayMongo states that Checkout has no setup or monthly subscription fee, while successful payments incur transaction fees. This is the intended “free version,” not zero-cost processing. [PayMongo Checkout pricing explanation](https://www.paymongo.com/en/products/payment-channels/hosted-checkout).

Keep the proposed customer prices at ₱29 and ₱249, with Keeply absorbing processing fees unless the owner explicitly changes that decision. Verify account eligibility, available methods, per-method minimum amounts and net proceeds before launch, especially for the ₱29 purchase. Do not assume the minimum from the subscription API applies to Hosted Checkout. No subscription enablement or automatic debit integration is needed.

1. An authenticated user selects the 30-day or permanent product. The server creates/reuses a product-specific order with fixed amount, currency, user, SKU, and reference.
2. Create a PayMongo checkout linked to that order using the existing integration. Redirect only to a validated provider checkout URL. Customers authorize this individual payment themselves.
3. Verify signed callbacks and test/live mode; retrieve authoritative checkout/payment data server-side and match the payment status, amount, PHP currency, checkout, order reference, and account linkage.
4. Fulfill the order atomically through a service-only RPC. Unique provider payment and order-line identities prevent duplicate grants even when different webhook events describe the same payment.
5. The return page reads server-side status. It never grants access based on a URL parameter, frontend success state, or user-submitted reference. Reconcile delayed/missed callbacks through bounded server-side checks.

For ₱29, fulfillment extends the pack from the later of its current paid-through timestamp and fulfillment time by exactly 30 days (30 × 24 hours), stored in UTC and displayed in the account timezone. Early renewal keeps unused time; renewal after a lapse starts a full new period on verified fulfillment. A delayed callback does not consume the newly purchased period. Repeated processing of one payment grants nothing extra. Two distinct verified renewal payments extend time twice, but capacity remains five additional slots.

For ₱249, verified fulfillment grants permanent five-slot access once. Switching from a short-term pack replaces its five-slot contribution with permanent coverage, rather than temporarily doubling capacity. Explain the proposed no-proration policy before checkout. Block new short-term/permanent orders after permanent fulfillment and expire outstanding checkouts where supported. If a stale checkout still receives money, put it into review for refund or explicit resolution rather than silently keeping an unfulfilled payment.

A failed or absent renewal never creates debt or an automatic charge. At expiry, excess item coverage pauses according to the allocation policy; every saved item remains accessible and three free slots remain. A later verified renewal restores eligible previously selected items, without replaying missed item alerts.

Proposed notice schedule: one email three days before expiry and one at expiry, plus an in-app expiry/renewal notice. Say “Your five extra reminder slots expire on [date]. Renew for ₱29 if you’d like to keep them.” Link to authenticated Keeply billing, where the user starts a fresh checkout. These are optional renewal prompts, not overdue invoices or collection demands. Provide a separate renewal-email preference; do not consume an item reminder slot. No repeated nagging after expiry.

Extend the existing durable email worker with a typed renewal-notice job and dedicated renderer. Reuse leases, retry limits, daily email budget, delivery suppression, and stable idempotency. At scheduling and final preparation, check the current pack expiry/version, permanent status, preference, verified email, bounce block, and deletion state. A verified renewal or permanent purchase cancels stale unsent notices and schedules the new term's notices. Suppress pre-expiry notices once expired; after downtime send at most one still-relevant expiry notice within 48 hours, then skip. Ordinary item email pause and renewal preference are separate, clearly labelled settings; delivery blocks and account deletion suppress both. Apply normal in-flight email limitations.

Verified full refunds revoke only the corresponding benefit. Preserve unrelated grants and later paid extensions; do not blindly delete an aggregate pack after refunding one renewal. Disputes, partial refunds, and ambiguous events go to audited review. Keep existing annual orders/callbacks valid until resolved.

Persist checkout intent before provider calls. If creation times out, reconcile before retrying to avoid duplicate checkouts. Use provider idempotency only where supported and tested. Verify the existing v2 creation/v1 retrieval pairing in sandbox. Keep test/live evidence separate. Live launch requires a configured PayMongo account, keys, webhook, enabled methods, and successful one-time payment tests; recurring subscription lifecycle tests are out of scope.

## 12. Existing-user migration

Before execution, inspect the deployed migration version and aggregate counts of free/paid accounts, selected dates/items, pending/attempted jobs, orders and payments. Identify actual old deployment variants. Do not export personal receipts or secrets. Back up and rehearse against a representative database first.

For free accounts, select the distinct saved/unarchived items containing currently enabled reminder dates, preserving preferences and existing eligible job identities. Normally three enabled dates span at most three items. If real data exceeds that, stop for a documented migration exception rather than silently dropping alerts. Do not reactivate dates previously disabled for plan limits without consent.

For existing annual paid access, preserve `premium_until` and provide a temporary 1,000-item slot floor and existing 2 GB storage through that term. This intentionally covers at least their old 1,000-date promise, while the new model groups dates by item. Total capacity is the greater of that floor and new purchased capacity, not a duplicate annual grant. Preserve unlimited saved items afterward; on storage downgrade retain files but prevent additions over allowance.

Backfill coverage, capability functions, and scheduler gates together during a controlled worker pause. Compare before/after eligible reminders; preserve already sent/uncertain job evidence. Deploy compatible backend/UI, resume workers, and monitor. Use reconciliation to catch payments received during migration. Never reset or delete historic payment ledgers to simplify cutover.

Rollback must preserve new purchases and items: prefer roll-forward fixes or compatibility reads. Do not restore old item-save caps or old delivery gates over a database with new grants. Disable new payment requests during rollback while continuing verified webhook/reconciliation processing and preserving all payment records.

## 13. Demo and sample data

Keep all existing sample records, IDs, routes, templates, and receipt examples. The current generic sample set contains eight items, with a separate legacy receipt sample set. Do not truncate either to three.

Demonstrate three covered items and the remaining items safely saved without coverage. Compute demo slot usage by item, not enabled dates. Keep sample-only actions honest about persistence. Add scenario fixtures for paid capacity and expiry to tests without inflating the default demo into a billing showcase.

## 14. Homepage, pricing, and SEO copy

Primary wording: “Keep as many things as you need.” “Your first 3 reminder slots are free.” Explain once that one slot covers an item and its enabled dates. Paid copy: “Add 5 reminder slots — ₱29 for 30 days or ₱249 once.” Add “Renew manually. No automatic charges.” Explain payment confirmation and permanent slot ownership; avoid implying unlimited uploaded files or guaranteed delivery.

Update homepage, pricing, terms, add-template introductions, shared tracker sections, warranty/vehicle/document landing pages, billing, forms, dashboard, navigation, and legacy purchase UI. In particular remove the vehicle wording that treats registration, insurance, and service on one vehicle as three slots.

Inspect login, root/page metadata, Open Graph, structured data, sitemap and robots outputs for stale promises. Preserve `en-PH`, canonical domain `keeplyph.com`, crawlable public pages, and private/demo indexing policy. Do not add Product/Offer schema until it matches available payment options. Update README and operations setup; leave historical SQL prices intact for audit. Repository search for `10`, `1000`, `360`, `premium`, `free`, `slot`, and `reminder` must classify matches, not blindly replace numbers.

## 15. Analytics

Reuse the existing opt-in product-event machinery, anonymous public counters, and retention maintenance. `item_saved` already exists. Existing `reminder_opted_in` is date-level; keep it distinct from item coverage or explicitly version its meaning so historical reports remain interpretable.

Add coverage/business-funnel events only where useful: `reminder_limit_reached`, `item_saved_without_reminder`, `upgrade_cta_viewed`, `upgrade_cta_clicked`, `reminder_pack_checkout_started`, `reminder_pack_purchased`, `reminder_enabled`, `reminder_disabled`, `reminder_slot_reassigned`. Emit state-change events server-side after commit; replacement emits one reassignment event rather than misleading independent conversion events. Deduplicate views per surface visit and purchase analytics per fulfillment.

Use allowlisted template, product, placement, and coarse capacity fields; never item names, document contents, email, or payment details. Optional analytics respects consent/opt-out deletion and the existing environment switch. Required billing records remain operational records regardless of optional tracking consent. Update aggregation, retention, and activation definitions together.

## 16. Edge cases and failure scenarios

| Scenario | Required result |
| --- | --- |
| Save ninth item with three covered | Item and valid dates save; no fourth selection; calm notice |
| Add three dates to one covered item | Still one slot; each enabled date can schedule |
| Two requests race for final slot | At most one new selection; both valid items saved |
| Replace coverage while worker holds a lease | Final preparation rejects lost coverage; in-flight caveat applies |
| Paid term expires with no callback | Database-time capacity drops; old jobs cannot bypass it |
| Webhook retried or payment replayed | One verified payment fulfills once; renewal adds time, not capacity |
| Early or late renewal | Extend from current expiry if active, otherwise from verified fulfillment time |
| Renewed before notice sends | Final preparation suppresses the stale notice |
| Global email pause/bounce | No delivery; selected slots preserved and status explained |
| Archive, restore, delete | Archive/delete free selection; restore remains uncovered |
| Last enabled date expires | Slot stays selected; “No upcoming reminders”; user may release |
| Checkout pending or callback delayed | No speculative grant; save/free reminders still work |
| User opts out before capacity returns | Selection removed; payment cannot re-enable it |
| Over storage allowance | Existing files remain accessible; attachment additions constrained |
| More than 2,000 items | Pagination/search/counts remain correct without a save ceiling |
| Account deletion with pending payment | Stop all notices; reconcile/refund paid orders through review without recreating access |

## 17. Security and payment integrity

Retain authenticated owner-scoped RPCs, RLS, private schemas/buckets, protected downloads, origin checks, and cron authentication. No client can set slot quantities, price, paid status, grant validity, or another account's selection. Service-only fulfillment functions must have explicit execution grants and a fixed safe search path.

Verify webhook signatures, mode, and authoritative provider payment state. Enforce payment uniqueness across accounts and validate amount/currency/order linkage before calling service-only fulfillment RPCs. A client may only initiate its own checkout and read its status. Keep payment evidence private and out of analytics/logs; protect provider/service keys and prevent test-mode evidence from granting live access. User-editable metadata or browser redirects cannot prove payment.

Central lock ordering and revisions protect slot replacement and checkout policy. Account deletion and delayed payment callbacks must not recreate deleted user access. Refund adjustments affect the linked payment benefit only, never unrelated permanent access.

## 18. Verification

First establish the current baseline: earlier checks passed, but the last SQL refinements were not fully reverified. Do not treat historical test results as validation of new migrations.

- Database integration: saving beyond 10 and 1,000; pagination beyond 2,000; one item/many dates; concurrent last-slot requests; atomic replacement; archive/restore; ownership/RLS; legacy migration; capacity expiry without cron; preservation of date preferences.
- Notification integration: queued and leased jobs lose coverage; re-enable avoids catch-up and duplicate sends; retries retain identity; day/month offsets and timezone boundaries remain correct; capacity changes do not reset uncertain sends.
- Billing integration: correct/incorrect amount, currency, product and mode; forged callbacks; payment reuse across accounts; duplicate/concurrent callbacks; early/late renewal; two real payments extending time without doubling slots; pending/failed payment; missed callbacks and provider timeouts; refund adjustments; permanent switch and stale checkouts; deletion race. Test service-only RPC authorization.
- Public/UI checks: all sample items remain; uncovered save succeeds; management keyboard flow; 30-day versus once copy; no stale annual/free-item pricing; private routes stay private. Check forms/dashboard/detail/billing/home at mobile and desktop sizes, text contrast, focus, and reduced motion.
- Run lint, typecheck, unit tests, database integration suite, smoke checks, and production build at the appropriate implementation stages. Rehearse checkout → verified webhook → fulfillment → user-initiated renewal/expiry in PayMongo test mode before accepting payments, including failed payments and duplicate callbacks. Verify renewal emails, preferences, stale-notice cancellation, bounded retries, and email-budget sharing.

## 19. Implementation order and completion gates

1. Confirm baseline and record proposed product decisions above. Preflight deployment/data status; confirm standard PayMongo Checkout account setup, enabled methods, minimum amounts, and transaction fees. No recurring subscription setup is required.
2. Implement schema, capabilities, coverage RPCs, migration rehearsal, and concurrency tests. Remove item caps and add pagination/aggregates.
3. Integrate forms, management, dashboard, and scheduler gates together. Gate: unlimited saving works, full slots never reject a valid save, stale jobs are suppressed.
4. Extend PayMongo checkout, verified webhooks/reconciliation, 30-day/permanent fulfillment, and billing UI. Gate: only verified payment activates access; repeated callbacks cannot duplicate time/slots; ownership, mode and amount checks pass.
5. Add manual renewal, expiry notices/preferences, and permanent switching. Gate: early renewal preserves time, late renewal restores access correctly, stale emails are suppressed, and expiry works even when cron is delayed. Confirm PayMongo sandbox checkout/webhook flow before enabling live purchases.
6. Apply shared visual polish and all public copy/demo/analytics updates. Styling may be implemented independently, but revised pricing copy ships with corresponding behavior.
7. Complete regression checks, migration rehearsal, operational documentation, and live setup verification. Deploy only with configured accounts/secrets, monitoring, and the user's deployment authorization.

These are separable implementation milestones to keep review and usage manageable. Styling is relatively small; item allocation/scheduler correctness remains the main technical work. One-time checkout reuses the existing gateway integration and avoids subscription lifecycle work; routine payment verification remains automatic. No reliable five-hour usage prediction follows from this plan.

## 20. Exact file inventory

Paths below are relative to the Keeply project root. “Review” means inspect and change only where affected; avoid incidental rewrites.

| Area | Existing files to modify or review |
| --- | --- |
| Database | Review `supabase/migrations/202609200001_core.sql` through `202609230006_analytics.sql`; implement changes in new 007/008 migrations; review `supabase/schedule.sql` |
| Central contracts | `src/types/database.ts`, `src/lib/domain.ts`, `src/lib/errors.ts`, `src/lib/env.ts` |
| Item backend | `src/features/items/actions.ts`, `queries.ts`, `domain.ts`, `validation.ts`; `src/features/purchases/actions.ts`, `queries.ts`; `src/features/documents/actions.ts`; `src/features/account/actions.ts` |
| Billing / PayMongo checkout | `src/features/billing/actions.ts`, `src/lib/paymongo.ts`, `src/lib/paymongo-event.ts`, `src/lib/paymongo-signature.ts`, `src/app/api/webhooks/paymongo/route.ts` |
| Workers | `src/app/api/cron/notifications/route.ts`, `src/app/api/cron/maintenance/route.ts`, `src/lib/reminder-email.ts`; review `src/app/api/webhooks/resend/route.ts` |
| Core UI | `src/components/dashboard.tsx`, `item-list.tsx`, `item-detail.tsx`, `item-form.tsx`, `date-fields.tsx`, `item-ui.tsx`, `item-documents.tsx`, `billing.tsx`, `app-shell.tsx`, `settings-form.tsx` |
| Compatibility UI | `src/components/purchase-form.tsx`, `purchase-detail.tsx`, `purchase-list.tsx`, `purchase-ui.tsx` |
| App data loading | `src/app/(app)/layout.tsx`, `dashboard/page.tsx`, `items/page.tsx`, `items/[id]/page.tsx`, `items/[id]/edit/page.tsx`, `settings/billing/page.tsx`; review purchase route loaders under `src/app/(app)/purchases/` |
| Public copy | `src/app/page.tsx`, `pricing/page.tsx`, `terms/page.tsx`, `privacy/page.tsx`, `add/[template]/page.tsx`, `login/page.tsx`, `warranty-tracker/page.tsx`, `vehicle-registration-reminder/page.tsx`, `document-expiry-tracker/page.tsx`, `src/components/tracker-page.tsx` |
| SEO review | `src/app/layout.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, page-level metadata/structured data in the public files above |
| Styling/demo | `src/app/globals.css`, `src/components/template-picker.tsx`, `src/lib/demo.ts`, `src/app/demo/[[...slug]]/page.tsx` |
| Analytics | `src/components/public-metrics.tsx`, `src/app/api/metrics/route.ts`, analytics SQL changes in a new migration |
| Verification/docs | `scripts/test-database.mjs`, `scripts/smoke.mjs`, affected existing unit tests; `README.md`, `docs/OPERATIONS.md`, `.env.example` |

Proposed new files: `src/features/entitlements/queries.ts`, `src/features/entitlements/domain.ts`, `src/features/reminders/actions.ts`, `src/components/reminder-management.tsx`, `src/app/(app)/settings/reminders/page.tsx`, `src/features/billing/products.ts`, `src/features/billing/reconciliation.ts`, `src/lib/renewal-email.ts`, the two forward migrations above, and focused entitlement/checkout/renewal-notice tests following the existing test layout. No manual payment-approval script or admin payment-review UI is required for routine purchases.

The next implementation task should use this document as its specification and explicitly report any changes to the proposed coverage, storage, stacking, or migration policies before applying them.
