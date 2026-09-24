# Keeply

Receipts and warranties, together in one private place. Next.js + Supabase, built for **keeplyph.com**.

## Current status

The local MVP includes Google OAuth integration, owner-isolated purchases and warranties, private uploads, search and filters, reminder scheduling, PayMongo 30-day/permanent reminder packs, item coverage management, settings, and account deletion.

**No external accounts or paid services have been provisioned.** Supabase, Google OAuth, PayMongo, Resend, DNS, and scheduled jobs still need configuration. Live service integration has not been verified. The sample preview works without credentials and never writes to an account.

## Run locally

Requires Node.js 22 or newer.

    npm ci
    cp .env.example .env.local
    npm run dev

Open **http://localhost:3000/demo** for the sample dashboard. Try search, purchase details, the new-purchase form, warranty presets, settings, and billing. Sample edits are not persisted; uploads and checkout require a real account.

Do not put secret keys in messages, source control, or variables prefixed with NEXT_PUBLIC_. Add secrets directly to your local .env.local and hosting environment.

## 1. Create Keeply’s own Supabase project

Create a **separate project on the Free plan**. Do not reuse an existing application's project. Choose a nearby region suitable for Philippine users.

Copy the project URL and publishable key into NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Put the server secret in SUPABASE_SECRET_KEY. Legacy/local projects may use SUPABASE_SERVICE_ROLE_KEY instead. This key is used only for file validation/cleanup, signed upload creation, trusted payment events, email jobs, and account deletion.

In the project's SQL Editor, apply these migration files **once, in this order**, on the new project:

1. supabase/migrations/202609200001_core.sql
2. supabase/migrations/202609200002_documents.sql
3. supabase/migrations/202609200003_notifications.sql
4. supabase/migrations/202609200004_billing_maintenance.sql
5. supabase/migrations/202609230005_items.sql
6. supabase/migrations/202609230006_analytics.sql
7. supabase/migrations/202609240007_reminder_slots.sql
8. supabase/migrations/202609240008_reminder_pack_billing.sql
9. supabase/migrations/202609240009_history_measurement.sql

They create the application schema, private job/payment tables, RLS policies, transaction functions, and **two private Storage buckets**: upload-staging and purchase-documents. Do not make either bucket public or add broad client write policies. Keep the private schema outside the Data API's exposed schemas.

The migrations assume Supabase's existing auth and storage schemas. The local database test harness provides minimal stand-ins solely for testing SQL logic; it does not emulate all Supabase services.

## 2. Enable Google sign-in

1. Create a dedicated Google Cloud OAuth web client and configure its consent screen for Keeply. While it is in testing, add your own Google account as a test user.
2. Use the **Supabase provider callback URL shown in its Google provider settings** as Google's authorized redirect URI. It has the form https://PROJECT_REF.supabase.co/auth/v1/callback.
3. Enable Google in Supabase Authentication → Providers and enter the Google client ID and secret there.
4. In Supabase Authentication → URL Configuration, allow http://localhost:3000/auth/callback and https://keeplyph.com/auth/callback.
5. Set Supabase's Site URL to https://keeplyph.com for production.
6. Set APP_URL=http://localhost:3000 locally and APP_URL=https://keeplyph.com in production. These must match the browser origin exactly.

Google returns to **Supabase**; Supabase returns to **Keeply**. Keep production redirect allowlists narrow. Use separate test credentials/projects for previews.

Verify with **two Google accounts**: create a purchase and upload a test receipt as one account; ensure the second cannot see its purchase, document ID, or Storage object. Sign out, then test an expired/revoked session. OAuth and Storage need this real-provider check even though local SQL tests pass.

## 3. Connect Resend and scheduled jobs

1. Create a Resend account and verify a sending domain using its DNS instructions.
2. Set RESEND_API_KEY and EMAIL_FROM to an address on that verified domain.
3. Create a webhook at https://keeplyph.com/api/webhooks/resend for email.delivered, email.bounced, and email.complained. Set its signing secret in RESEND_WEBHOOK_SECRET.
4. Keep EMAIL_DELIVERY_ENABLED=false until a controlled test account can receive a test reminder and the webhook records delivery.
5. Generate a long random CRON_SECRET locally and put the same value in Vercel and Supabase Vault. Never use a sample secret.
6. Enable Supabase Cron and pg_net. In Vault create keeply_app_url with https://keeplyph.com, and keeply_cron_secret with the same value as CRON_SECRET.
7. Run supabase/schedule.sql after deployment. It schedules reminders every 15 minutes and maintenance hourly.

The scheduler invokes **POST** endpoints with an Authorization Bearer header. It does not rely on Vercel Hobby's cron frequency. Both endpoints reject requests without the exact secret.

Reminders are scheduled at 09:00 in the account timezone, at 30/7/1 days before expiration. New opt-ins do not backfill reminders before today. If several thresholds were missed, only the latest due one is sent. Free includes three item reminder slots. All enabled dates on one covered item share a slot. Saved items are unlimited. Five extra slots cost ₱29 for 30 days, manually renewed, or ₱249 permanently. Oldest selections retain coverage on expiry; excess selections pause without deleting their date preferences.

The worker conservatively reserves at most **90 attempts/day globally**. This can delay reminders during bursts; watch queue age and upgrade capacity when needed. Five jobs are processed per invocation, with row leases, retry delays, a frozen request, and a stable Resend idempotency key. Unknown outcomes stop retrying before Resend's 24-hour deduplication window expires; see the operations guide.

## 4. Connect PayMongo in test mode

PayMongo Hosted Checkout handles **₱29 for 30 days** and **₱249 permanently**, each adding five item reminder slots. Customers initiate each renewal; there is no automatic subscription debit. Standard checkout has no fixed setup/monthly fee, but successful payments incur processing fees. Verify method eligibility, minimum amounts, and net proceeds for the ₱29 price before enabling live checkout.

1. Set PAYMONGO_MODE=test, the matching sk_test_… key in PAYMONGO_SECRET_KEY, and PAYMONGO_PAYMENT_METHODS to methods enabled for your merchant account. Supported configuration values are qrph, gcash, card, and paymaya.
2. Register https://keeplyph.com/api/webhooks/paymongo for checkout_session.payment.paid and the refund events available for your account: refund.succeeded, payment.refunded and payment.refund.updated as supported by your account. Include dispute events if supported.
3. Put the webhook signing secret in PAYMONGO_WEBHOOK_SECRET.
4. Set PAYMENTS_ENABLED=true only in your dedicated test environment to run provider tests.
5. Test success, cancellation, failure, duplicate webhook delivery, delayed confirmation, and a refund. Confirm exactly one 30-day extension or permanent grant is credited once. Returning to the success URL alone must never grant access. Test early renewal, a lapse, permanent switching, stale renewal notices, and full refunds.
6. After merchant approval and successful tests, configure the **live** key/webhook and set PAYMONGO_MODE=live in production. Keep previews on test mode and separate data. The database starts in test mode: in the dedicated live database, an operator must set `private.billing_settings.live=true` before enabling live checkout. Test grants are excluded in live mode. Never toggle a production database to test mode.

Checkout creation uses PayMongo v2 on the server. Payment confirmation validates the raw webhook signature, checks the environment, retrieves the checkout directly from PayMongo, verifies the order’s exact SKU price, PHP currency, checkout identity and stored test/live mode, and credits the order transactionally. Replays cannot extend access twice.

Refunds and disputes enter an **operator review queue**. A verified successful full-refund resource also revokes the corresponding unused pack benefit idempotently; partial refunds and ambiguous events require review. No customer refunds are initiated automatically.

## 5. Deploy to your selected Vercel Hobby project

Create a dedicated Vercel project for this directory/repository using the Next.js preset. Use the checked-in lockfile and Node.js 22+. Configure environment variables in Vercel; do not upload .env.local.

Add keeplyph.com in the project's Domains settings and enter the **exact DNS records Vercel shows** at your registrar. No Cloudflare deployment or paid infrastructure has been configured. Domain purchase remains a separate registrar step.

Before making the app public:

- Complete OPERATOR_NAME and SUPPORT_EMAIL. Review the privacy/terms drafts, refund process, and retention periods.
- Verify HTTPS, both OAuth callbacks, private Storage, test payments, delivery webhooks, and Cron HTTP responses.
- Set up independent database **and object-file** backups and test a restore.
- Ensure preview deployments cannot send customer emails or accept live payments.
- Check Supabase's current project storage/egress limits. Per-user file allowances are caps, not reserved capacity; a legacy 2 GB allowance does not mean the Free project itself has 2 GB of storage.

The chosen initial fixed budget is the user-quoted **₱700/year domain**, subject to registrar term/renewal, plus processing fees and optional backup or inbox costs. No paid plan was purchased.

## Validation

    npm run lint
    npm run typecheck
    npm test
    npm run test:db
    npm run build
    # With the local app running:
    npm run test:smoke

The database test starts an isolated temporary PostgreSQL database and deletes it afterward. It **never connects to your existing database**. It defaults to Homebrew PostgreSQL 14 at /opt/homebrew/opt/postgresql@14/bin; set PG_TEST_BIN to your PostgreSQL binaries elsewhere. Run as a normal user, not root.

SQL tests exercise RLS, direct-write denial, ownership, concurrent quotas, document access, payment idempotency, reminder leases and delivery events, and deletion. Unit tests cover dates, money, redirect safety, webhook signatures, email escaping, and image processing. HTTP smoke checks cover public pages, private route guards, cron authentication, upload origins, and security headers. Mobile and desktop sample flows were also checked in the browser.

These tests do not replace the pending Google/Supabase Storage/PayMongo/Resend integration tests.

## Structure and intentional limits

- src/app: pages, OAuth callback, trusted workers and webhooks
- src/components: responsive UI and sample preview
- src/features: purchase/document/account/billing actions
- src/lib: domain helpers and service clients
- supabase/migrations: schema, RLS, quotas, jobs, billing, deletion queues
- supabase/schedule.sql: optional production scheduler configuration
- docs/OPERATIONS.md: recovery, cleanup, and backup procedures

Ordinary writes use restricted SECURITY DEFINER functions with explicit auth.uid() checks and a per-account lock. Authenticated table grants are SELECT-only under RLS. Service-role functions are revoked from public/anonymous/authenticated roles. Item search and filters run in PostgreSQL before 25-item cursor pagination. Dashboard counts are aggregates; date histories load 20 cycles at a time. A receipt has at most one warranty.

No OCR, household sharing, warranty transfer, automatic renewal, or automated refund adjudication is included. PDFs receive size/header/trailer checks and are downloaded as attachments; this is not a malware-scanning service. Images are fully decoded and re-encoded with pixel limits.

Primary references: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/nextjs), [Supabase Cron](https://supabase.com/docs/guides/cron), [PayMongo hosted checkout](https://docs.paymongo.com/docs/payment-channels-hosted-checkout), [PayMongo signatures](https://docs.paymongo.com/docs/developer-tools-webhook-setup-management), [Resend idempotency](https://resend.com/changelog/idempotency-keys).

## Reminder coverage cutover

Pause notification workers while applying migrations 007–009 and deploying matching code. Back up database and object files first. Migration 007 preserves existing enabled-date selections and aborts for free accounts with more than three distinct enabled items so an operator can resolve exceptions explicitly. Legacy annual access retains a 1,000-item slot floor and its purchased storage allowance through expiry. No existing file or saved item is deleted on downgrade.

Coverage state is stored on the existing item row (owner-only reads; RPC-only writes), keeping slot selection and item revisions atomic. The authoritative coverage function applies current database time, even before cron runs. The notification queue now supports separate renewal notices: three days before and at expiry, sharing the global email budget. Users can disable renewal emails in Settings.

Payment creation timeouts with no attached checkout require reference-based provider reconciliation; never blindly generate a replacement. The hourly worker also checks one attached pending checkout per run, rotating checks by last-attempt time. Monitor unresolved order age and review exceptions before launch.
