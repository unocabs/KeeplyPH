# Keeply — technical implementation blueprint

Planning baseline: September 20, 2026. This document proposes the application; it does not implement it or provision any services.

> **Implementation update — September 21, 2026:** The local MVP is now implemented. Follow [README.md](README.md) for current setup and [docs/OPERATIONS.md](docs/OPERATIONS.md) for operations. The user selected **Vercel Hobby, Supabase Free, Resend Free, and PayMongo hosted checkout**, with no Cloudflare deployment. This supersedes the paid-production budget recommendations below; no paid plans were provisioned. Current planned fixed spend is the user-quoted **₱700 annual domain**, plus actual processing fees, optional backups/mailbox, and future upgrades. Ordinary writes use restricted, owner-scoped **SECURITY DEFINER RPCs with explicit ownership checks and per-account locking**, while client table access is SELECT-only under RLS. This supersedes the earlier SECURITY INVOKER proposal. Reminders use Supabase Cron every 15 minutes; cleanup runs hourly. Premium remains **₱360/year, manually renewed**. Accounts, credentials, domain configuration, and live provider testing are still pending.

Confirmed domain: **keeplyph.com**. User-quoted domain cost: **₱700**, assumed to cover the first year for budgeting; renewal price and term remain to be checked with the registrar. Production application origin: `https://keeplyph.com`; application OAuth callback: `https://keeplyph.com/auth/callback`. Domain purchase and DNS configuration have not been performed.

The user's updated choices take precedence over the original brief: **Google OAuth through Supabase Auth; PostgreSQL on Supabase with RLS; `@supabase/supabase-js` and `@supabase/ssr` for Next.js integration.** Keeply gets its own Supabase project, Google OAuth configuration, storage, credentials, deployment, and domain. No existing application's database or users are shared.

## 1. Product assumptions

- A purchase is the main record. It can have zero or one warranty in the MVP and several attached files.
- One purchase represents one product the user wants to track. A receipt covering several products can be attached separately to their records; receipt line items and shared receipt records can wait.
- Product name is the only required purchase detail at final save. Purchase date, merchant, price, category, notes, and attachments are optional. A draft created during upload may have no name.
- Offer “Today” as a quick date selection; do not silently claim the purchase happened today. Unknown dates should remain unknown.
- A warranty requires an expiration date. Its start date is optional when the user knows the expiration directly; duration presets require a known start date.
- PHP is the initial currency. Persist an ISO currency code so foreign purchases remain representable later; do not add exchange-rate conversion.
- Default the account timezone to `Asia/Manila`, let the user change it, and store a validated IANA timezone. Date-only warranty rules must not depend on the server timezone.
- Reminders are explicitly opt-in per warranty. No SMS, push notifications, or marketing consent bundled with this preference.
- Build a responsive online web app. Preserve in-progress input during ordinary errors, but do not promise offline storage or background uploads.

## 2. MVP scope

Google sign-in/out; purchase create/read/update/delete; private receipt and warranty attachments; one optional warranty; 3-, 6-, 12-, and 24-month presets plus custom expiration; opt-in 30-, 7-, and 1-day reminders; dashboard; basic search/filtering; account preferences; free-tier enforcement; one Premium product; account deletion; operational monitoring and recovery.

Include basic search at launch: product/merchant text, category, and purchase-date range. Finding an existing receipt is central to the product, and a small PostgreSQL query is sufficient.

Dashboard: one prominent **Add purchase** action, a compact **Expiring in 30 days** section, and **Recently added** purchases. Use counts/filter links for active, expired, and no-warranty records instead of five competing card grids. Show an absolute date alongside “128 days remaining,” “Expires today,” or “Expired 3 days ago.”

## 3. Features explicitly excluded from MVP

OCR, receipt parsing, email inbox ingestion, native apps, offline synchronization, multiple warranties per product, household membership, ownership transfer, public sharing, claim workflows, receipt line items, custom notification intervals, push/SMS, advanced analytics, custom category management, discount systems, and subscription proration.

Do not build microservices, Kubernetes, an external queue, Elasticsearch, a cache service, or a generic provider/plugin architecture.

## 4. Recommended architecture

Use a single Next.js App Router application with TypeScript. Server Components load authenticated page data. Small Client Components handle camera/file selection, form interaction, upload progress, and search interaction. Server Actions perform form mutations; Route Handlers receive OAuth callbacks, webhooks, upload finalization, and cron requests.

The request-scoped Supabase server client uses the signed-in user's cookies/JWT. Ordinary data requests run through Supabase's HTTP Data API and RLS. Use PostgreSQL functions for atomic multi-table operations and quota checks. A separate, server-only privileged client is reserved for background jobs, verified billing events, file validation, and account deletion.

```text
Mobile / desktop browser
  | HTTPS
  v
Next.js application — Vercel Pro
  |-- Server Components / Actions / Route Handlers
  |-- Supabase SSR cookie/session integration
  |
  +-- user JWT --> Supabase Data API --> PostgreSQL + RLS
  +-- OAuth ----> Supabase Auth <----> Google
  +-- authorize upload --> private staging storage
  |                         |
  |                    validate/finalize
  |                         v
  +-- signed download --> private document storage
  +-- checkout ----------> PayMongo
  +<-- signed webhooks --- PayMongo / Resend
  |
Vercel Cron --> secured job handler --> PostgreSQL notification jobs
                                      |--> Resend
                                      |--> file/deletion cleanup

Scheduled backup process --> encrypted off-site DB + object backups
```

Browser-to-storage transfers avoid routing large uploads through the Next.js request body. PostgreSQL is the durable coordination mechanism; there is no separate queue service.

## 5. Recommended services/providers

| Concern | Recommendation and reason | Reasonable alternative |
|---|---|---|
| Web runtime | Next.js on Vercel Pro: straightforward App Router deployment and scheduled handlers | A managed Node container, if lower fixed cost justifies more deployment work |
| Identity | Supabase Auth with Google: matches the chosen database identity and RLS model | Another Supabase Auth provider later; no separate identity product needed |
| Database | Supabase PostgreSQL: relational integrity, transactional functions, RLS, and managed operations | Another managed PostgreSQL service, but it would require replacing the integrated authorization path |
| Data access | Supabase JS + SSR, generated TypeScript types, SQL migrations | Prisma for a different server-only access architecture; see section 8 |
| Documents | Supabase Storage: private buckets and authorization tied to the same user IDs | S3 or Cloudflare R2 if measured storage/egress needs justify another integration |
| Email | Resend: requested provider with transactional email and idempotency support | Amazon SES when volume savings justify additional setup |
| Scheduler | Vercel Cron calling Next.js: keeps job code with the app | Supabase Cron invoking an HTTP worker; operate only one scheduler for each job |
| Payments | PayMongo hosted checkout, initially annual prepaid access | Maya Business; evaluate merchant acceptance and supported payment methods first |
| UI | Semantic HTML, CSS Modules, a small set of accessible components | Tailwind if preferred; avoid spending time creating a design system |
| Monitoring | Host logs plus aggregate operational metrics initially | Add a dedicated error tracker when logs no longer make failures easy to investigate |

These alternatives are tradeoffs, not additional MVP dependencies. Next.js has a supported App Router installation path; pin the chosen stable version and lockfile when implementation begins. [Next.js installation](https://nextjs.org/docs/app/getting-started/installation).

## 6. Authentication architecture

1. Create a dedicated Google Cloud project/OAuth web client and a dedicated Supabase project.
2. Configure Google's consent screen, app domain, privacy policy, and minimal identity scopes: OpenID, email, and profile.
3. Register the **Supabase** callback, `https://<project-ref>.supabase.co/auth/v1/callback`, in Google's authorized redirect URIs.
4. Store Google's client ID and secret in Supabase's Google provider configuration.
5. Configure the application's **Next.js** callback, `https://<app-domain>/auth/callback`, in Supabase's redirect allowlist. These are two different callbacks.
6. Start login with `signInWithOAuth({ provider: 'google', options: { redirectTo: ... } })` through the SSR-compatible client.
7. The Next.js callback exchanges the authorization code using `exchangeCodeForSession`, sets session cookies, and redirects to a validated same-origin relative path.

Use separate development and production callback configuration. Never accept arbitrary return URLs or trust an unvalidated forwarded host. [Supabase Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google).

Create browser and request-scoped server client helpers using `@supabase/ssr`. On Next.js 16 use `proxy.ts` for session refresh; on older supported versions the convention is `middleware.ts`. Preserve refreshed request/response cookies and cache headers. Verify identity using `getClaims()`; use `getUser()` for a fresh Auth user record when needed. Do not authorize from `getSession()` alone. Authenticated pages and session-bearing responses must not enter a shared public cache. [Supabase SSR integration](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs).

Application identity is `auth.users.id`, never an email or Google subject stored separately. Create a minimal profile and entitlement row through a tested signup trigger. Additional providers can use Supabase's identity system later; do not invent email-based account merging.

Follow the SSR library's cookie behavior, with HTTPS/Secure production cookies and appropriate SameSite settings. Do not assume its browser-accessible session cookies can simply be made HttpOnly without changing the architecture. Sign-out is a mutation, clears the session, and refreshes authenticated UI state.

## 7. Database design

Conventions: UUID primary keys; `timestamptz` audit/scheduling timestamps; PostgreSQL `date` for purchase/warranty dates; integer minor currency units; database-maintained `updated_at`. Explicitly enable RLS on every exposed table. `?` below means nullable. All IDs and trusted status fields are assigned or verified server-side.

### Application tables

| Table | Proposed fields | Constraints, indexes, and deletion |
|---|---|---|
| `public.profiles` | `id uuid`, `display_name text?`, `timezone text`, `email_reminders_enabled boolean default true`, `email_delivery_blocked boolean default false`, `deletion_requested_at timestamptz?`, `created_at`, `updated_at` | PK/FK `id -> auth.users.id ON DELETE CASCADE`. Timezone validated against supported IANA zones. Only safe preference columns are user-editable; delivery/deletion flags are trusted-system fields. |
| `public.purchases` | `id uuid`, `user_id uuid`, `state text` (`draft/saved/deleting`), `product_name text?`, `purchased_on date?`, `merchant text?`, `price_minor bigint?`, `currency char(3) default 'PHP'`, `category text?`, `notes text?`, `revision integer default 1`, `created_at`, `updated_at` | FK user -> profiles CASCADE. `UNIQUE(id,user_id)` for composite child FKs. CHECK nonnegative price; valid currency/category; saved records require trimmed product name 1–160 chars. Merchant <=160, notes <=5000. Index `(user_id,state,created_at DESC,id)`; `(user_id,purchased_on,id)`; `(user_id,category)`. User ID immutable. |
| `public.warranties` | `id uuid`, `purchase_id uuid`, `user_id uuid`, `starts_on date?`, `expires_on date`, `serial_number text?`, `notes text?`, `reminders_enabled boolean default false`, `reminders_enabled_at timestamptz?`, `reminder_disabled_reason text?` (`user/plan_limit`), `created_at`, `updated_at` | `UNIQUE(purchase_id)` enforces one warranty. Composite FK `(purchase_id,user_id) -> purchases(id,user_id) ON DELETE CASCADE`. CHECK expiration >= start when start exists; serial <=160, notes <=5000. Index `(user_id,expires_on)`; partial `(expires_on,id) WHERE reminders_enabled`. |
| `public.documents` | `id uuid`, `purchase_id uuid`, `user_id uuid`, `kind text` (`receipt/warranty`), `state text` (`pending/ready/deleting/failed`), `staging_key text?`, `object_key text`, `original_name text?`, `mime_type text?`, `size_bytes bigint?`, `reserved_bytes bigint`, `checksum text?`, `upload_expires_at timestamptz`, `created_at`, `updated_at` | Composite purchase/user FK CASCADE. Unique object key and unique non-null staging key. CHECK positive reservations and validated size >0 when ready. Index `(purchase_id,kind,created_at)` and `(state,upload_expires_at)`. Metadata is readable by its owner; mutations happen only through controlled upload/deletion functions. |
| `public.account_entitlements` | `user_id uuid`, `premium_until timestamptz?`, `source_order_id uuid?`, `updated_at` | PK/FK user -> profiles CASCADE. Read-only to its owner; only trusted billing code can write. FK source order -> billing_orders, SET NULL. Premium is effective only while `premium_until > now()`; do not store a second independently editable `is_premium`. |

Store category as a checked stable code: `electronics`, `appliances`, `home`, `clothing`, `other`, or null. Labels live in the application. Do not require a categories table yet.

Store **expiration as the source of truth**, not expiration, duration, and status as three editable facts. Duration presets calculate the date and then show it for confirmation. Add calendar months with end-of-month clamping: January 31 + one month becomes February 28/29. Do not approximate years as 365 days. Treat the expiration date as inclusive; user confirmation can correct manufacturer-specific terms. Compute active/upcoming/expired status from dates at read time.

### Operational tables

Keep these in an unexposed `private` schema. Access them through narrowly granted functions for trusted jobs. They are implementation records, not customer-facing product features.

| Table | Proposed fields | Constraints, indexes, and deletion |
|---|---|---|
| `private.notification_jobs` | `id uuid`, `warranty_id uuid`, `expiration_date date`, `offset_days smallint`, `scheduled_at timestamptz`, `status text`, `attempts int`, `next_attempt_at timestamptz?`, `lease_token uuid?`, `lease_until timestamptz?`, `first_attempt_at timestamptz?`, `provider_email_id text?`, `accepted_at timestamptz?`, `delivered_at timestamptz?`, `last_error_code text?`, `frozen_payload jsonb?`, `created_at`, `updated_at` | FK warranty CASCADE. UNIQUE `(warranty_id,expiration_date,offset_days)`; offsets restricted to 30/7/1. Unique non-null provider email ID. Partial due index `(next_attempt_at,id)` for pending/retry; lease index for sending. Frozen payload contains only the minimal email content and recipient, is private, and is purged after the retry/reconciliation window. |
| `private.billing_orders` | `id uuid`, `user_id uuid?`, `provider text`, `provider_checkout_id text?`, `provider_payment_id text?`, `product_code text`, `amount_minor bigint`, `currency char(3)`, `status text`, `credited_at timestamptz?`, `period_starts_at timestamptz?`, `period_ends_at timestamptz?`, `created_at`, `updated_at` | FK user -> profiles SET NULL on account deletion. Unique provider checkout/payment IDs within provider. CHECK positive amount and allowed product/currency/status. Index `(user_id,created_at DESC)` and `(status,updated_at)`. Retain only the minimal transaction record needed under the adopted financial-retention policy. |
| `private.billing_events` | `provider text`, `event_id text`, `order_id uuid?`, `event_type text`, `provider_resource_id text`, `received_at timestamptz`, `processed_at timestamptz?`, `status text`, `last_error_code text?`, `attempts int` | Composite PK `(provider,event_id)` deduplicates delivery. FK order -> billing_orders SET NULL. Index `(status,received_at)`. Persist allowlisted reconciliation identifiers rather than full raw payment payloads. Purge processed transport records after a documented operational window. |
| `private.object_deletions` | `id uuid`, `bucket text`, `object_key text`, `not_before timestamptz`, `attempts int`, `next_attempt_at timestamptz`, `last_error_code text?`, `created_at` | UNIQUE `(bucket,object_key)`. No cascading FK: cleanup must survive deletion of the purchase/user. Index `(next_attempt_at,id)`. Delete the task only after storage deletion succeeds or confirms the object is absent. |
| `private.account_deletions` | `id uuid`, `user_id uuid`, `status text`, `phase text`, `requested_at timestamptz`, `next_attempt_at timestamptz`, `attempts int`, `last_error_code text?`, `completed_at timestamptz?` | UNIQUE user ID. Deliberately no FK so the workflow survives Auth deletion. Index `(status,next_attempt_at)`. Purge identifiers after completion and the documented audit window. |
| `private.rate_limit_buckets` | `subject_hash text`, `action text`, `window_start timestamptz`, `count int` | Composite PK `(subject_hash,action,window_start)`; atomic increment/check; expiry index on window start. Short retention. Hash IP-derived subjects with a server-held key. |

Notification states: `pending`, `sending`, `retry`, `accepted`, `delivered`, `failed`, `unknown`, `cancelled`, `skipped`. Billing order states: `pending`, `paid`, `failed`, `expired`, `refunded`, `disputed`. Enforce state transitions in the mutation functions; a CHECK alone cannot validate transitions.

Add FK indexes when not already covered by an index's leading columns. Use triggers/functions to enforce immutable ownership, optimistic revision increments, quotas, file cleanup records, and notification regeneration. Purchase transitions are `draft -> saved`, `draft -> deleting`, and `saved -> deleting`; never permit `saved -> draft` as a way around the saved-purchase quota. Creating a warranty requires a saved parent purchase. These are database invariants, not browser conventions.

## 8. Prisma schema proposal — replaced by Supabase SQL migrations

**Recommendation: omit Prisma from the MVP.** The updated integration requirements make SQL migrations plus generated Supabase types the simpler choice. A normal Prisma database connection does not automatically carry the end-user JWT into PostgreSQL's RLS context. A privileged database role can also bypass RLS. Combining two migration systems would make policies, storage rules, triggers, and functions harder to track.

The table specifications in section 7 replace the requested Prisma model proposal. Keep the complete database definition in `supabase/migrations/`, including constraints, grants, RLS, triggers, and functions. Generate `Database` TypeScript types from the actual schema. [Supabase migrations](https://supabase.com/docs/guides/local-development/database-migrations), [generated types](https://supabase.com/docs/guides/api/rest/generating-types).

Illustrative schema fragment for review, **not a migration executed by this planning task**:

```sql
create table public.warranties (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null unique,
  user_id uuid not null,
  starts_on date,
  expires_on date not null,
  serial_number text,
  notes text,
  reminders_enabled boolean not null default false,
  reminders_enabled_at timestamptz,
  reminder_disabled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (purchase_id, user_id)
    references public.purchases (id, user_id) on delete cascade,
  check (starts_on is null or expires_on >= starts_on),
  check (char_length(serial_number) <= 160),
  check (char_length(notes) <= 5000),
  check (reminder_disabled_reason is null or
    reminder_disabled_reason in ('user', 'plan_limit'))
);

create index warranties_user_expiry_idx
  on public.warranties (user_id, expires_on);
create index warranties_reminder_expiry_idx
  on public.warranties (expires_on, id)
  where reminders_enabled;

alter table public.warranties enable row level security;
```

Implementation must add the policies, grants, timestamp/quota triggers, and functions described elsewhere; enabling RLS alone intentionally gives no user access. If Prisma becomes necessary later, explicitly design restricted connection roles and transaction-local identity handling first. Do not add it merely for schema syntax.

## 9. Relationships between entities

```text
auth.users 1 ── 1 profiles
profiles   1 ── N purchases
purchases  1 ── 0..1 warranties
purchases  1 ── N documents
warranties 1 ── N notification_jobs
profiles   1 ── 1 account_entitlements
profiles   1 ── N billing_orders
billing_orders 1 ── N billing_events
```

Composite ownership FKs prevent attaching a child record to another user's purchase, even when both IDs are valid. Documents belong to a purchase and have a receipt/warranty kind; removing warranty metadata need not delete its attached evidence. Offer an explicit choice to remove those documents too.

For multiple warranties later, remove the unique purchase constraint and optionally add `warranty_id` to documents. For households, add accounts/memberships and migrate ownership deliberately. UUID records and isolated authorization helpers make that possible without building those features now.

## 10. File/object-storage architecture

Use two private buckets: `upload-staging` and `purchase-documents`. Paths use generated identifiers, for example `<user-id>/<purchase-id>/<document-id>/<random-id>`. Never include names, emails, merchants, or original filenames in paths.

Initial limits: **six documents per purchase, 10 MB input per file, 100 MB total stored/reserved bytes on Free, 2 GB on Premium**. Count pending reservations as well as ready objects. These are proposed product limits, not Supabase plan limits.

Allow JPEG, PNG, WebP, and PDF. Reject HTML, SVG, executable files, archives, and Office files. HEIC support is conditional on tested conversion support; provide a clear JPEG/PDF fallback if the deployed decoder cannot handle it. Test real iPhone camera and photo-library flows before launch.

Upload lifecycle:

1. Selecting a file creates/reuses one owned draft purchase and calls a database reservation function. Validate the account, current plan, file count, outstanding uploads, and maximum bytes under a per-user lock.
2. Create a pending document record and issue a storage upload authorization restricted to its staging path. Do not allow arbitrary authenticated uploads elsewhere. Use create-only behavior rather than overwriting existing keys.
3. Browser uploads directly with progress. Bucket restrictions enforce size and allowed MIME declarations, but those declarations are not trusted file validation.
4. An authenticated finalization route verifies current ownership and the reservation, fetches the staged object under a bounded size, inspects signatures, and validates decoding for images. Enforce pixel/decompression limits as well as compressed size.
5. Correct image orientation, strip metadata including GPS, and compress when readability permits. Show a preview with zoom; narrow, long receipts must remain legible. PDFs are stored privately and offered as downloads with attachment disposition and safe content-type headers, not injected into the app's HTML. Signature checking does not claim that a PDF is malware-free.
6. Write the validated result to the immutable final path. A trusted, idempotent finalization operation rechecks account/purchase state under the user lock, marks it ready, and replaces reserved bytes with actual size. A retry recognizes the same document and checksum. If deletion began while validation ran, enqueue both keys for cleanup instead of resurrecting the document.
7. Saving the form atomically changes the purchase to saved, stores its optional warranty, and confirms ready attachment IDs. If selected files are unfinished, explain that state; allow retry or an explicit save without the failed files.

Never hold a database transaction open during a storage or HTTP call. Reconcile partial completion. Expire abandoned drafts after 24 hours; retain staging cleanup tasks until issued upload authorizations have expired plus a safety margin, so late uploads do not leave permanent orphans.

Download flow: authorize the owned ready document, then issue a short-lived signed URL, initially 60–300 seconds. Signed URLs are bearer credentials; do not log them, include them in emails, or store them in the database. Avoid shared image optimization caches for private files. Use a restrictive referrer policy. A previously issued URL can remain usable until expiration even after permission changes.

Use RLS on storage metadata for owned ready-document access and no public bucket access. Every object lookup must match bucket, exact registered key, owner, document state, parent purchase state, and active account; a matching user-ID folder alone is insufficient. The final bucket has no ordinary-user upload/overwrite permission. [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

Deletion is recoverable: transactionally hide/remove metadata and enqueue exact storage keys; a worker calls the Storage API until removal succeeds. Add deletion triggers for cascades so file keys are never lost. Deleting only a row in `storage.objects` is not the file-deletion workflow.

## 11. Authorization/security model

Three layers: validated identity at each server entry point; RLS ownership policies; database constraints and transactional business rules. Hiding buttons or protecting a layout is insufficient.

| Resource | Authenticated owner | Other user / anonymous | Trusted system |
|---|---|---|---|
| Purchases/warranties | Read and permitted writes | Deny | Maintenance only |
| Profile | Read; edit safe preferences | Deny | Delivery/deletion flags |
| Document metadata | Read; controlled upload/delete operations | Deny | Validate/finalize/cleanup |
| Final document object | Owned ready-object access | Deny | Validation/cleanup |
| Entitlements | Read effective limits | Deny | Verified billing updates |
| Operational tables | No direct access | Deny | Narrow functions only |

For each table define separate SELECT/INSERT/UPDATE/DELETE policies as applicable. Owner predicates use `(select auth.uid()) = user_id`; UPDATE also needs a `WITH CHECK` predicate. Include an active-account predicate so pending account deletion denies further access. Profile policy/helper design must avoid recursive RLS evaluation.

Ordinary purchase/warranty mutations use `SECURITY INVOKER` transaction functions. Underlying DML grants remain subject to RLS and mandatory triggers, so calling the Data API directly cannot bypass quota, ownership, or cleanup rules. Restricted profile columns, document lifecycle columns, and entitlements must not be broadly writable.

Use `SECURITY DEFINER` only for small operations that genuinely need extra privilege, such as upload reservations and private accounting helpers. They must derive identity from `auth.uid()`, reject missing/deleting accounts, validate every target, fix `search_path`, schema-qualify relations, and have explicit execution grants. Never trust a caller-supplied owner ID. Review function permissions independently of table policies. [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [database function security](https://supabase.com/docs/guides/database/functions).

The Supabase secret/service-role key bypasses normal user protections: keep it out of browser bundles and ordinary request clients. Supabase internal keys are not a substitute for checking job secrets or webhook signatures.

## 12. Email notification architecture

On opt-in, persist up to three jobs per warranty for the current expiration date. Compute each at **09:00 in the user's account timezone** on the date 30, 7, or 1 days before expiration. Store that instant in UTC. Database functions own schedule generation so direct API writes cannot miss it.

Do not backfill thresholds already passed before opt-in. Example: enabling reminders five days before expiration schedules only the 1-day reminder. A threshold falling today can send at the next eligible run if it is still meaningful. Confirm this behavior in the UI.

Editing the expiration cancels obsolete unsent jobs and creates the new schedule. Changing timezone recomputes unsent instants. Toggling off cancels pending work. The unique key is `(warranty_id, expiration_date, offset_days)`, so toggling on/off or changing a date away and back does not resend an already accepted reminder for that same threshold.

The worker rechecks consent, active account, saved parent purchase, expiration, and plan allowance immediately before dispatch. No reminder is scheduled or sent for a draft/deleting purchase. It freezes the minimal recipient/content for a send attempt, uses `notification/<job-id>` as the provider idempotency key, and reuses that exact request for retries. If the recipient or date changes after an ambiguous send, reconcile/cancel rather than silently reusing the key with different content.

Use an authenticated purchase link in the email, never an attachment URL. Explain why the message was sent and provide reminder settings/disable access. A disable link should show a confirmation page before mutation to avoid email scanners changing preferences. Delivery/bounce webhooks are verified and update status idempotently; complaints/hard bounces suppress further email to that account.

Duplicate controls are complementary: unique job key; leased database claiming; stable Resend idempotency key; durable accepted timestamp/provider ID. **Do not promise mathematically exactly-once delivery across PostgreSQL and an external email service.** Resend's idempotency window is 24 hours. Resolve uncertain acceptance within that window; after it, mark unresolved jobs `unknown` and investigate rather than blindly resending. [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).

There is a narrow race where an email already being handed to the provider may still arrive after the user disables reminders. State this honestly in support behavior; never mark queued work as delivered merely because the API accepted it.

## 13. Cron/scheduler design

Run a secured notification handler every **15 minutes**. One periodic process handles all warranties; job rows are durable work items, not individual cron registrations. Run bounded maintenance batches on the same cadence or a second daily schedule.

1. Validate the bearer `CRON_SECRET`; disable real dispatch outside production.
2. Reconcile expired entitlements and identify due notification work.
3. Claim a bounded batch, initially 50–100 jobs, in a short transaction using row locks with `FOR UPDATE SKIP LOCKED`; set a unique lease token and expiry. Initialize `next_attempt_at = scheduled_at` when inserting a pending job so the due-work index covers first attempts and retries consistently.
4. Commit, send with bounded concurrency/provider-aware throughput, then acknowledge only if the lease token still matches.
5. Retry failed work on later runs. Stop before the hosting execution deadline; unclaimed work remains due.

Suggested retry delays: 15 minutes, 1 hour, 4 hours, 12 hours; honor `Retry-After` and distinguish definite rejection from uncertain acceptance. Permanent invalid-recipient errors do not retry. Cap attempts, record a safe error code, and alert on terminal failure/backlog.

For an outage, due queries use `scheduled_at <= now()`, not equality with today's date. Send at most one overdue reminder per warranty per recovery run, choose the most recent useful threshold, skip older superseded thresholds, and skip expired warranties. Do not flood a user with three late emails.

A provider outage must not break purchase saving. Alert when the oldest actionable job is over an hour late or no scheduler success has been recorded for 45 minutes. Lease expiry recovers interrupted runs. Vercel cron can overlap or deliver duplicate events, so correctness belongs in the database workflow. [Vercel cron management](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

## 14. Subscription/payment architecture

**Recommend one Premium product at ₱360/year, paid upfront with manual renewal for the initial launch.** This preserves the proposed ₱30/month equivalent, works with wallet-oriented checkout, and avoids requiring recurring-payment approval before validating demand. Label it clearly as “₱360 billed yearly”; manual renewal is not automatic subscription billing.

Use PayMongo hosted checkout with the payment methods enabled for the merchant account. PayMongo's current subscription documentation lists cards and Maya and requires account configuration. Do not assume one-time GCash acceptance means automatic GCash renewals are available. [PayMongo subscriptions](https://docs.paymongo.com/docs/payment-acceptance-subscriptions).

Current published standard fees, excluding VAT, are 3.125% + ₱13.39 for domestic cards, 2.23% for GCash, and 1.79% for Maya. Illustrative arithmetic before VAT, refunds, or any extra merchant charges:

| Charge | Card processing fee / remainder | GCash fee / remainder |
|---|---|---|
| ₱30 monthly | ₱14.33 / ₱15.67 | ₱0.67 / ₱29.33 |
| ₱360 yearly | ₱24.64 / ₱335.36 | ₱8.03 / ₱351.97 |

Monthly cards consume roughly 48% of the sale in this example; annual cards roughly 6.8%. Wallet fees are more suitable for small payments, but monthly manual checkout creates friction. Confirm the activated account's actual contract, recurring fees, and checkout minimums before publishing prices. [PayMongo pricing](https://www.paymongo.com/en/pricing).

Maya Business is a reasonable local alternative, but compare its online checkout offer and onboarding requirements rather than inferring online fees from terminal pricing. [Maya online payments](https://developers.maya.ph/docs/online-payments).

Billing flow:

1. Server creates a pending order with its own fixed product, PHP amount, and user ID; the browser cannot choose the amount or duration.
2. Create/reuse a hosted checkout using the order ID as the reconciliation reference. Handle request timeouts without crediting access or blindly creating repeated checkouts.
3. The return page displays pending status until server verification succeeds. A successful browser redirect never grants Premium.
4. Verify the webhook over the raw body using the provider's current verification procedure. Persist its event ID before acknowledgement; reconcile its provider resource with the order, currency, amount, merchant environment, and payment status.
5. In one transaction, lock the order and entitlement, mark the order credited once, and extend access from `max(now(), premium_until)` by one calendar year. Store the resulting period on that order.
6. Replayed events or different events for the same payment cannot credit twice. Out-of-order failures cannot undo a verified payment. Reconcile pending/failed processing against provider state.
7. Refunds/disputes revoke the corresponding paid period according to the published policy; if renewals stack, recompute from retained valid order periods rather than subtracting blindly.

An annual renewal message can be a transactional billing email with its own idempotency record. Add true auto-renewal only after provider approval and demand, with a subscription table, cancellation controls, and explicit recurring-payment consent. Do not build monthly and annual recurring variants simultaneously for the first release.

## 15. Free-tier enforcement

| Limit | Free | Premium proposal |
|---|---:|---:|
| Saved purchases | 10 | 1,000 |
| Reminder-enabled unexpired warranties | 3 | Up to purchase limit |
| Stored/reserved document bytes | 100 MB | 2 GB |
| Documents per purchase | 6 | 6 |
| Input file size | 10 MB | 10 MB |

One reminder slot means one unexpired warranty with reminders enabled, which may generate three emails. Future-start warranties also consume a slot when enabled. Expired warranties and warranties with reminders disabled do not. Purchase expiration does not remove the saved-purchase count.

Use a per-user profile-row lock for all operations that change counts, dates, timezone, reminder enablement, upload reservations, or entitlements. Under that lock, calculate current entitlement and counts, then perform the mutation. For this bounded per-user dataset, indexed counts are simpler than maintaining several independent usage counters.

Quota triggers must run on all relevant database writes, including a warranty-date edit that changes an expired warranty back into an unexpired one. Cap pending drafts, initially three per account, and reserve bytes/files before issuing an upload authorization. A free user making two concurrent saves at nine purchases must finish with ten, not eleven.

After Premium expires, preserve existing purchases and files. Allow viewing, downloading, deleting, and non-expanding corrections. Block additions beyond the effective limits. Keep only three reminder-enabled unexpired warranties, deterministically selecting earliest expiration then ID; mark the rest disabled with reason `plan_limit`, and explain it in account settings. The dispatch path enforces this even if the periodic downgrade task is late. Let users choose which three to keep.

Never delete a customer's receipts just because a payment fails or their plan expires. Do not advertise unlimited storage at this price.

## 16. API/server-action design

| Operation | Entry point | Transaction/security responsibility |
|---|---|---|
| Load dashboard/list/detail | Server Component calling query module | Verified user; RLS; bounded pagination |
| Start/resume purchase draft | Server Action -> RPC | Owned draft; draft/rate limit |
| Save purchase + optional warranty | Server Action -> RPC | Atomic data change, expected revision, quota and schedule triggers |
| Edit/delete purchase/warranty | Server Action -> RPC | Ownership; safe state transitions; durable file cleanup |
| Prepare attachment upload | Server Action + reservation RPC | File/byte reservation, generated path |
| Finalize attachment | POST Route Handler | Auth and origin check, byte validation, idempotent trusted completion |
| Get private file | Authenticated handler/action | Owned ready document, short-lived URL |
| Preferences/reminder toggle | Server Action | Field allowlist; rebuild unsent schedule when needed |
| Checkout | POST handler/action | Trusted price and order creation |
| PayMongo/Resend webhook | POST Route Handler | Signature validation; durable idempotent processing |
| Notifications/maintenance | Secured cron Route Handler | Job authentication; leased batches |
| Delete account | POST handler/action | Recent reauthentication; deletion workflow |

Validate all input server-side, with matching database constraints for essential invariants. Return typed errors such as `VALIDATION_ERROR`, `LIMIT_REACHED`, `UPLOAD_FAILED`, `CONFLICT`, and `RETRY_LATER`. Do not return raw database messages or provider payloads.

Search uses bound parameters, a bounded query length, and escaped wildcard semantics. Begin with owner-scoped `ILIKE` and indexes for filters/order; add trigram indexes only if real query measurements justify them. Use stable pagination `(created_at,id)` or small bounded offsets initially. Do not expose an arbitrary SQL/filter-string endpoint.

Treat each exported Server Action as a public endpoint. Next.js has Origin/Host checks for actions, but each action still needs authentication and authorization; custom cookie-authenticated mutation routes need equivalent origin/CSRF protection. [Next.js data security](https://nextjs.org/docs/app/guides/data-security).

## 17. Proposed Next.js project structure

```text
keeply/
  src/
    app/
      (public)/page.tsx
      (public)/login/page.tsx
      (public)/pricing/page.tsx
      (public)/privacy/page.tsx
      (public)/terms/page.tsx
      (app)/dashboard/page.tsx
      (app)/purchases/page.tsx
      (app)/purchases/new/page.tsx
      (app)/purchases/[id]/page.tsx
      (app)/purchases/[id]/edit/page.tsx
      (app)/settings/page.tsx
      (app)/settings/billing/page.tsx
      auth/callback/route.ts
      api/uploads/finalize/route.ts
      api/documents/[id]/download/route.ts
      api/webhooks/paymongo/route.ts
      api/webhooks/resend/route.ts
      api/cron/notifications/route.ts
      api/cron/maintenance/route.ts
      layout.tsx
      globals.css
    components/
      purchases/
      documents/
      ui/
    features/
      purchases/{actions,queries,validation}.ts
      warranties/{actions,dates,validation}.ts
      documents/{actions,validation}.ts
      billing/{actions,provider,reconciliation}.ts
      notifications/{schedule,worker,email}.ts
      account/{actions,deletion}.ts
    lib/
      supabase/{browser,server,admin,proxy}.ts
      auth.ts
      env.ts
      errors.ts
      logger.ts
    types/database.ts
    proxy.ts
  supabase/
    config.toml
    migrations/
    seed.sql
    tests/database/
  tests/{unit,integration,e2e}/
  docs/{operations,backups,privacy}/
  public/
  .env.example
  vercel.json
  package.json
  IMPLEMENTATION_PLAN.md
```

This is a proposed structure, not a request to create empty files now. Keep server-only admin/provider modules explicitly server-only. Share queries and business modules between actions and jobs; do not make Server Components call the app's own HTTP API unnecessarily.

## 18. Main pages/routes

`/` explains the product and offers sign-in. `/login` offers Google. `/dashboard` prioritizes expiring items and recent purchases. `/purchases` supports search and filters. `/purchases/new` and `/purchases/[id]/edit` use the same form. `/purchases/[id]` shows details, warranty, and private documents with quick download. `/settings` contains timezone, reminder preferences, and account deletion. `/settings/billing` shows usage, current access end date, and upgrade/renewal. `/pricing`, `/privacy`, and `/terms` are public.

Group paths do not appear in URLs. Add scoped loading, error, and not-found states. Return the same not-found behavior for a nonexistent record and someone else's record.

## 19. Mobile UX flow

**Add purchase → take photo/select file → product name → optional warranty → opt-in → save.**

Use one progressive form instead of a multi-page wizard. The photo step is prominent but skippable. Upload while the user fills the form. Product name stays visible; date/merchant/price/category/notes sit in an optional details section. A warranty toggle reveals duration presets and an explicit expiration preview. Ask for a start date only when needed to calculate a duration.

Show “Email me 30, 7, and 1 day before expiry” unchecked, with an explanation when some thresholds have already passed. Disable impossible selections with an inline explanation, not an unexplained disabled button.

Use large touch targets, meaningful labels, numeric keyboards for price, accessible errors, visible focus, and a bottom Save action that remains usable above the keyboard. Show thumbnail, file status, progress, retry, and remove for each attachment. Warn before leaving with unsaved edits. Avoid persistent browser storage of receipt data in the MVP.

On success, show the saved purchase with “Add another.” Empty dashboard: one sentence and Add purchase. Empty search: keep filters visible and offer clear filters. On failed save, retain input. Distinguish “details saved, one attachment failed” from complete success.

## 20. Error handling

| Failure | Behavior |
|---|---|
| Google cancellation or callback error | Return to login with a retry; avoid redirect loops |
| Expired session during form work | Preserve in-memory inputs; prompt sign-in; retry idempotently |
| Network interruption / double Save | Reuse draft/request identifiers; disable repeated submission while pending |
| Invalid or oversized file | Explain the accepted formats/limit; retain the rest of the form |
| Upload succeeds, DB completion fails | Retry finalization; reconcile known final key; clean abandoned staging |
| Two devices edit the same record | Compare revision; show conflict and reload/retain edits for review |
| Quota reached after concurrent activity | Keep draft; show current usage and upgrade/delete options |
| Payment pending / webhook delayed | Display pending; server reconciliation; no premature Premium access |
| Storage deletion failure | Keep deletion task and retry; record is hidden immediately |
| Email provider unavailable | Queue remains durable; app save still succeeds; alert on overdue work |

## 21. Security/privacy checklist

- RLS and grants tested with two real user JWTs plus anonymous access, including direct Data API and Storage access.
- Server identity verification on every sensitive entry point; no public caching of private pages or session responses.
- CSRF/origin checks for cookie-authenticated mutations; no state changes through ordinary GET links. Cron GET is a separately secret-authenticated machine endpoint.
- React-escaped text, no unsanitized HTML rendering, no executable upload previews; deploy a tested Content Security Policy.
- Bound SQL inputs and query limits; reject arbitrary object paths, user IDs, plan values, and provider destinations.
- Durable rate limits for expensive actions, initially roughly 20 write operations/minute/user, 10 upload preparations/minute/user, and 5 checkouts/hour/user; tune with actual usage. Enforce mutation limits on direct database paths too. Use host/provider abuse controls for anonymous traffic and direct read abuse; an in-memory per-instance limiter is insufficient.
- Dedicated secrets per environment; secret scanning and rotation procedure; privileged code isolated; admin accounts protected with MFA.
- Logs exclude receipt content, notes, email bodies, auth codes, JWTs, payment credentials, original file names, and signed URLs. Avoid session replay on private pages.
- Published privacy notice, contact channel, subprocessors, retention schedule, and a documented incident process. Review applicable Philippine privacy obligations before public launch. [National Privacy Commission DPA guide](https://privacy.gov.ph/wp-content/uploads/2022/01/DPA_QuickGuidefolder_10191.pdf).

Account deletion should be operational at launch, even if the earliest private test uses a staff-assisted process. Recommended public MVP flow: recent Google reauthentication → explicit confirmation → mark account deleting → deny access and reminders → remove all final/staging objects and outstanding upload permissions through expiry/cleanup → erase application data → delete Auth user → verify completion. Future recurring billing must be cancelled before completion.

Persist the deletion workflow outside cascading user records. Retry failed phases safely. Retain only required minimized billing records under the stated policy. Live-data deletion target: within seven days, normally much sooner; encrypted backups age out within the documented retention window. Do not claim immediate deletion from every backup.

Existing access JWTs may outlive logout/deletion, and Storage-owned objects can block Auth deletion. Active-account predicates close access while cleanup runs; Auth deletion comes after object cleanup. [Supabase user management](https://supabase.com/docs/guides/auth/managing-user-data).

## 22. Environment variables

| Variable/configuration | Location and purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser/server; project's public API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser/server; public client key, safe only with correct RLS/grants |
| `SUPABASE_SECRET_KEY` | Server-only privileged operations; use the appropriate supported project secret key |
| `SUPABASE_SERVICE_ROLE_KEY` | Alternative for environments using legacy service-role keys; do not need both key types |
| `APP_URL` | Server; fixed trusted origin for redirects, email links, checkout return URLs |
| `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `EMAIL_FROM` | Server; transactional sending and verified events |
| `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET` | Server; separate sandbox/live values |
| `CRON_SECRET` | Server/host scheduler; random high-entropy bearer secret |
| `RATE_LIMIT_HASH_SECRET` | Server; pseudonymize rate-limit subjects |
| `APP_ENV`, `EMAIL_DELIVERY_ENABLED`, `PAYMENTS_ENABLED` | Server feature/environment safeguards |
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, DB credential | Restricted CI/operator environment for migration/type generation/backup, not the browser |
| Google OAuth client ID/secret | Supabase provider settings; local CLI configuration uses environment-backed secrets |
| Backup destination credentials/encryption configuration | Dedicated backup runner; separate from app runtime if feasible |

Normal Supabase-JS database requests do not require a Prisma `DATABASE_URL`. Keep real `.env` files ignored, commit placeholder-only `.env.example`, and validate required values on startup/build as appropriate. Do not prefix secrets with `NEXT_PUBLIC_`.

## 23. Local development setup

After this plan is approved for implementation:

1. Initialize a dedicated Next.js App Router TypeScript project, select a currently supported Node LTS, and pin package versions and the package manager lockfile.
2. Install `@supabase/supabase-js` and `@supabase/ssr`; add the Supabase CLI as a development dependency and a local Docker-compatible runtime.
3. Run `supabase init`, then `supabase start`; put local API values in `.env.local`.
4. Add migrations incrementally and run `supabase db reset` **against the disposable local database only** to prove the schema builds from scratch.
5. Generate local types with `supabase gen types --lang typescript --local`; save output to `src/types/database.ts`.
6. Seed synthetic users and purchases with no real receipt data. Configure a development Google client and both local callback layers.
7. Use email dry-run mode/fakes by default and PayMongo sandbox mode. Test real emails only with allowlisted test recipients.
8. Invoke the secured job handler manually with a local secret; inject a clock in domain tests so no test waits for calendar dates.
9. Add a dedicated staging Supabase project when integration testing needs it; never use another app's project or production data for previews.

Supabase's migration and type-generation workflows make schema changes reproducible. [Local migrations](https://supabase.com/docs/guides/local-development/database-migrations), [TypeScript type generation](https://supabase.com/docs/guides/api/rest/generating-types).

## 24. Testing strategy

Use unit tests for date calculations, price parsing, entitlement decisions, and retry classification; database integration tests for RLS, transactions, and concurrency; browser end-to-end tests for critical journeys. Suggested tools: Vitest, Supabase database tests/pgTAP, and Playwright; exact setup belongs to implementation.

Required cases:

- User A cannot read/update/delete user B's purchase, attach a child to it, finalize its upload, or obtain its file URL; anonymous requests also fail.
- Direct Data API writes cannot bypass quota, protected-field rules, account-deletion restrictions, or notification generation.
- Nine saved purchases plus two concurrent free saves results in one success and one limit error; analogous tests cover third reminder and last available bytes.
- Month ends, leap years, expiration today, unknown start, timezone changes, and daylight-saving time in a non-Manila timezone.
- Repeated opt-in, expiration changed away and back, duplicate cron, stale leases, provider acceptance followed by process failure, 24-hour uncertainty, and outage recovery.
- Duplicate and out-of-order payment events, invalid signature/amount/currency, checkout timeout, refund/dispute, renewal, and delayed downgrade.
- Forged MIME type, huge image dimensions, excessive file size, finalization retry, orphan cleanup, late upload after expiry, and deletion during upload.
- Full journey: sign in → upload → save with warranty → find purchase → open private receipt → edit reminders → sign out.
- Full restore exercise covers both the database and actual file bytes, followed by deletion-ledger and billing reconciliation.

Run one real Google login and real mobile-camera check in staging before release; most automated tests should not depend on Google's UI. Measure job throughput and dashboard query performance before claiming capacity for 10,000 users.

## 25. Deployment architecture

Use one Vercel Pro project and one Supabase Pro production project. Prefer geographically close application execution and database placement, ideally a suitable Southeast Asia region for Philippine users, after verifying current regional availability. Keep staging credentials/data separate; preview deployments must not dispatch customer email or accept live payments.

CI sequence: install from lockfile → lint/typecheck/unit tests → rebuild local database and test RLS → build app → staging checks → apply reviewed backward-compatible production migrations → deploy → smoke test and enable relevant jobs. Use additive migrations before removing old columns. An app rollback does not undo a migration.

Configure domain/TLS, exact OAuth redirects, verified Resend sending domain with SPF/DKIM and a DMARC policy, signed webhooks, secrets, budget alerts, and job schedules. Vercel Hobby is restricted to noncommercial personal use; budget Pro for this consumer SaaS. [Vercel Hobby terms](https://vercel.com/docs/plans/hobby).

## 26. Monitoring/logging

Track request failures/latency, upload success and validation failures, database health, oldest due notification, last successful cron, unknown email outcomes, failed deletion tasks, webhook backlog, payment reconciliation discrepancies, storage usage, and quota rejection rates.

Use request/job IDs and safe error codes for correlation. Redact URL query strings and request bodies by default. Restrict log access and adopt a short retention period, initially 7–14 days, unless a documented incident requires longer.

Alert on meaningful failure: missed cron, sustained send failure, deletion backlog beyond its target, failed backups, approaching storage/budget limits. A private synthetic purchase should periodically verify metadata and document retrieval without exposing customer records. Begin with host logs; add an error tracker only when it reduces actual support effort.

## 27. Database backup strategy

Use Supabase Pro daily database backups, plus independent encrypted off-site exports and a separate backup of object bytes. Supabase database backups do **not** include the objects stored through Storage. [Supabase backups](https://supabase.com/docs/guides/platform/backups).

Proposed initial policy: nightly backup; retain seven daily and four weekly copies, with a maximum 35-day window; target RPO <=24 hours and tested RTO <=1 business day. These are operating targets, not promises of provider SLA. Tighten them if customer expectations require it.

For files, copy immutable objects incrementally with a checksum manifest. Record the backup cutoff and pending upload states so restores do not advertise missing files as ready. Encrypt backups, isolate backup credentials, and alert on missing/failed runs. Test restoration into an isolated project before launch and periodically afterward.

Preserve the Supabase-specific restore procedure for Auth, application schema, storage metadata, and file bytes; a generic application-only SQL dump is not necessarily a full Auth recovery. Also retain infrastructure configuration and secret recovery instructions without putting plaintext secrets inside routine exports.

After restore, replay a protected deletion ledger before reopening access, reconcile payments with the provider, and keep reminder sending disabled until previously accepted emails are reconciled. This prevents restored backups from resurrecting deleted data, old entitlements, or already-sent jobs. Consider paid point-in-time recovery only when a day's potential data loss becomes unacceptable.

## 28. Estimated recurring infrastructure costs

### Initial cash budget for keeplyph.com

Assuming the quoted ₱700 domain cost is annual, it is approximately ₱58/month when spread over the year. Use ₱60/USD as a budgeting assumption, not a live exchange rate. The recommended initial production stack costs about ₱1,200/month for Vercel Pro plus ₱1,500/month for one Supabase Pro project. Resend can initially remain free within its monthly and daily limits; reserve ₱100–300/month for independent backups. This gives roughly **₱2,860–3,060/month including the annualized domain**, before taxes, currency conversion/card charges, and payment transaction fees. A practical cash budget is **₱3,200–3,500/month**, or about **₱38,400–42,000 for the first year including the ₱700 domain** if running production for all 12 months.

While developing locally, Supabase Free/local development and Resend's free allowance can keep the infrastructure spend near zero beyond the domain. A small early deployment can use Vercel Pro with Supabase Free for about ₱1,200/month plus domain/backup costs, but Free has limited storage, no automatic database backups, and inactivity pausing. The paid Supabase budget is a production reliability recommendation, not a prerequisite for writing the app.

Additional costs to consider: payment processing on each sale; a support mailbox if paid email hosting is chosen; domain renewal; email-volume upgrades; storage/traffic overages; optional staging resources; business registration/accounting/tax administration; and existing development-tool subscriptions. Do not purchase a separate Supabase custom-domain add-on just to serve the application at keeplyph.com. If an existing suitable paid hosting account can host another isolated project, verify its incremental charges before buying a second plan.

### Scale estimates

These are **planning estimates, not quotations**. User count alone does not predict cost. Assumptions: one production environment and one developer; 20 retained purchases per user on average; two 0.5 MB files per purchase; approximately one reminder email/user/month; 20 MB document downloads/user/month; modest page traffic; no OCR. The 20-purchase average describes a mixed free/paid population, not the allowance of a free account.

That implies about 20 MB stored/user: 0.2, 2, 20, and 200 GB at the four scales. At 10,000 users it means roughly 200,000 purchases and 200 GB/month document egress, before API traffic and backup-transfer overhead. Backup retention multiplies storage consumption; incremental backups reduce duplicate copies but do not make backups free.

Published baselines: Supabase Pro starts at $25/month with 100 GB object storage and 250 GB uncached egress; storage overage is $0.0213/GB and uncached egress $0.09/GB. Vercel Pro starts at $20/month. Resend Free allows 3,000 emails/month but only 100/day; Pro is $20/month for 50,000. [Supabase pricing](https://supabase.com/pricing), [Vercel pricing](https://vercel.com/pricing), [Resend pricing](https://resend.com/pricing).

| Monthly cost, USD | 10 users | 100 users | 1,000 users | 10,000 users |
|---|---:|---:|---:|---:|
| Supabase plan, likely compute/usage allowance | $25 | $25 | $25–40 | $30–100 |
| Vercel plan and likely usage | $20 | $20 | $20–30 | $20–60 |
| Resend | $0 | $0 | $0–20 | $20 |
| Domain allowance + independent backups | $2–5 | $2–5 | $3–10 | $10–30 |
| Monitoring contingency | $0 | $0 | $0–10 | $0–25 |
| **Estimated total** | **$47–50** | **$47–50** | **$48–110** | **$80–235** |

At 200 GB of objects, storage overage alone is only about $2.13/month; the larger range allows for compute, hosting traffic, backup transfers, and uncertainty. Daily email bursts may require Resend Pro well before 3,000 monthly messages. Heavy PDFs, more retained years of purchases, or many Premium users at their storage cap can raise costs substantially.

At an **illustrative budgeting conversion of ₱60/$, not a live exchange quote**, totals are about ₱2,820–3,000; ₱2,820–3,000; ₱2,880–6,600; and ₱4,800–14,100 respectively. Exclude taxes, payment fees, staging projects, labor, customer support, disputes, and legal/accounting work. A second paid environment adds its own applicable project/compute costs.

A $50 baseline is approximately ₱3,000 at that assumption. Annual card proceeds of ₱335.36 are ₱27.95/month equivalent: about **108 annual paying customers** cover that baseline before tax/support; at 5% paid conversion that is roughly 2,160 registered users. At 10,000 users and 5% paid conversion, the upper infrastructure estimate alone could consume nearly all such net revenue. ₱30/month equivalent can work for a lean product, but it should be tested as an introductory price, not assumed profitable.

## 29. Development phases

| Milestone | Small deliverable | Testable exit condition |
|---|---|---|
| 1. Foundation | Next.js skeleton, local Supabase, env validation, CI | App runs; database rebuilds from migration |
| 2. Identity and ownership | Google SSR login, profile, RLS | Two users sign in and cannot access each other's seeded rows |
| 3. Purchase text flow | Create/list/detail/edit/delete without files | Required/optional fields and optimistic edits work |
| 4. Private documents | Reservation, direct upload, validation, private view, cleanup | Cross-user access denied; failed completion/deletion recovers |
| 5. Warranty and limits | Optional warranty, presets, dashboard/search, atomic quotas | Date and concurrent quota cases pass |
| 6. Notification reliability | Durable jobs, cron, Resend, delivery handling | Duplicates/restarts/outages tested; one real test email arrives |
| 7. Paid access | Annual checkout, verified events, entitlement expiry | Sandbox payment and replay credit exactly once |
| 8. Privacy and recovery | Account deletion, backup/restore, alerting | Deletion and isolated DB+file restore demonstrated |
| 9. Private beta | Mobile polish and real task observation | Users can save and retrieve their receipts reliably |
| 10. Public launch | Provider approvals/configuration, final checklist | Production smoke tests and operational owner ready |

For a solo developer learning Next.js, budget roughly **4–7 focused weeks**, subject to available time and provider onboarding. This is an effort estimate; payment/Google configuration and approvals may run concurrently with development.

## 30. Recommended implementation order

Start with a text-only purchase vertical slice to prove identity and ownership. Add upload lifecycle next because it carries the most privacy and recovery risk. Add warranty dates and usage enforcement before notifications. Make reminder processing reliable before connecting live email. Add billing only after Free works end to end. Complete account deletion and restore exercises before public launch.

Apply schema/policy changes and their focused database tests together. Add each operational table only when its milestone needs it. Keep the app runnable and demonstrable after every milestone; do not implement all backend modules before testing any user flow.

## 31. MVP launch checklist

- [ ] Independent production Supabase/Auth/storage/deployment credentials and domain verified.
- [ ] Google production sign-in/out and callback failure behavior tested.
- [ ] Two-user and anonymous isolation tests pass for database, RPCs, and files.
- [ ] Purchase save/edit/search/download work on real mobile devices.
- [ ] Upload size/type/byte limits, reservation accounting, and orphan cleanup tested.
- [ ] Date presets, timezone behavior, opt-in, and quota concurrency tested.
- [ ] Verified email domain; reminder duplicates, outages, bounces, and stale jobs handled.
- [ ] Payment account approved; real low-value checkout/refund test where supported; price/renewal terms explicit.
- [ ] Webhook verification and duplicate/out-of-order handling tested.
- [ ] Downgrade preserves files and enforces current limits.
- [ ] Account and file deletion complete with retries and clear retention terms.
- [ ] Database **and object bytes** restored successfully into an isolated environment.
- [ ] Secrets/redaction/CSRF/CSP reviewed; dependency and build checks pass.
- [ ] Privacy/terms/contact available; operational runbooks and alert ownership established.
- [ ] Spend alerts and storage/email capacity checks enabled.

## 32. Post-MVP roadmap

First use observed friction to improve capture speed: defaults, smarter date entry, upload performance, and search. Then trial OCR behind a confirmation flow with separate consent/provider review and a strict per-account cost budget. Keep manual entry fully functional.

Next, consider automatic annual renewals if customers want them and the supported payment methods fit. Add claim-focused presentation using existing purchase data. Only then evaluate multiple warranties, households, secure selected-document sharing/transfer, and native/offline experiences. Each sharing feature requires a new explicit access model and revocation rules.

## A. MVP architecture recommended

**Next.js + TypeScript → Supabase Auth/PostgreSQL/RLS/private Storage → Resend, with Vercel Cron and PayMongo annual hosted checkout.** Use Supabase JS/SSR, SQL migrations, and generated types. One app and one production database project.

## B. Exact MVP feature list

Google login/logout; purchase CRUD; optional details; private photos/PDFs; one optional warranty; duration presets/custom expiry; explicitly enabled 30/7/1-day emails; compact dashboard; basic search/filtering; Free/Premium usage limits; ₱360 annual prepaid upgrade/renewal; timezone/email settings; account/file deletion; backup and operational recovery.

## C. Database model summary

Supabase owns identity. Five public application tables hold profiles, purchases, warranties, document metadata, and entitlements. Private tables coordinate notification delivery, billing orders/events, file/account deletion, and rate limits. Composite owner FKs, RLS, restricted grants, and atomic quota triggers protect the invariants.

## D. Suggested repository structure

Use `src/app` for routes, `src/features` for domain code, `src/lib/supabase` for client boundaries, `supabase/migrations` for all database changes, and separate unit/database/browser tests. The full tree is in section 17.

## E. Step-by-step implementation sequence

1. Create the isolated project and local database workflow.
2. Implement Google SSR auth and tested ownership policies.
3. Ship the text-only purchase flow locally.
4. Add private upload/validation/download/deletion.
5. Add warranty dates, dashboard/search, and atomic quotas.
6. Add reliable opt-in email scheduling and delivery.
7. Add verified annual payments and entitlement reconciliation.
8. Complete deletion, backups, monitoring, and restore testing.
9. Run a private mobile beta; fix observed blockers.
10. Complete the launch checklist and deploy publicly.

## F. What NOT to build yet

OCR, households, transfer/sharing, several warranties per product, native/offline apps, push/SMS, subscription proration, advanced search infrastructure, microservices, an external queue, or Prisma alongside Supabase migrations.

## G. First five development tasks

1. **Scaffold Next.js/TypeScript and local Supabase.** Deliverable: reproducible local app, placeholder-only env example, pinned dependencies, and baseline CI.
2. **Create profile/purchase migrations and owner policies.** Deliverable: schema reset succeeds and two-user/anonymous isolation tests pass.
3. **Integrate Google through Supabase SSR.** Deliverable: both callbacks, cookie refresh, protected pages, and logout work in the development environment.
4. **Implement the purchase text flow with database limits.** Deliverable: create, list, detail, edit, delete, and concurrent Free-limit enforcement without requiring images or warranties.
5. **Implement one private receipt upload end to end.** Deliverable: reserved upload, validated bytes, authenticated retrieval, idempotent completion, and recoverable deletion pass with real mobile input.
