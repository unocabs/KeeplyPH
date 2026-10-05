# Subscription brand picker setup

The optional `items.subscription_brand` column persists a service or gym selection separately from the reminder name. The new `save_subscription_item_with_date` RPC keeps the existing atomic name/date/coverage transaction. The migration also clears an incompatible brand when the reminder type changes. Existing reminder names are not backfilled.

## Required before deploying

Hosted schema state has not been inspected. In the target project's **Supabase SQL Editor**:

1. Run the entire read-only file `supabase/check-subscription-brand-prerequisites.sql`. It lists every prerequisite migration in execution order, plus the new migration. This check was tested against isolated local PostgreSQL, not the hosted project.
2. Review entries marked MISSING against migration history. Apply only missing prerequisite migrations in the numbered sequence shown, through `202610050021_motorcycle_brands.sql`. Do not rerun entries already confirmed applied or marked PRESENT. The motorcycle migration is a prerequisite because the new migration extends its compatible car/motorcycle save behavior.
3. If the new migration is missing, run the entire `supabase/migrations/202610050022_subscription_brands.sql` file in the SQL Editor. It was applied successfully only to the isolated local test database, not hosted Supabase.
4. Rerun the read-only check; the new column/RPC and all prerequisite markers should be PRESENT. Then deploy the app. On the hosted app, create a streaming/gym reminder, choose a brand, save, reopen it, rename it, and confirm the brand stays selected. Also check Clear brand and switching reminder type.

## Local regression checks

The modified `scripts/test-database.mjs` includes brand persistence, explicit/omitted values, category compatibility, ownership, revision conflicts, rollback and privilege tests. From the repository root run:

```sh
npm run test:db
```

Already run successfully: 107 tests in a temporary isolated local PostgreSQL instance. The harness never connects to the hosted project and does not apply migrations there.
