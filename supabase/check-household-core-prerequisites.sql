-- Read-only: run in hosted Supabase SQL Editor before the household core experience release.
-- Run in Supabase SQL Editor. Apply only missing migrations, in the returned order.
with timeline_function as (
 select to_regprocedure('public.dashboard_timeline_items()') as oid
), checks(sequence,migration,ready) as (values
 (1,'202609200001_core.sql',to_regclass('public.profiles') is not null),
 (2,'202609200002_documents.sql',to_regclass('public.documents') is not null),
 (3,'202609200003_notifications.sql',to_regclass('private.notification_jobs') is not null),
 (4,'202609200004_billing_maintenance.sql',to_regclass('private.billing_events') is not null),
 (5,'202609230005_items.sql',to_regclass('public.important_dates') is not null and to_regclass('public.reminder_offsets') is not null),
 (6,'202609230006_analytics.sql',to_regclass('private.product_events') is not null),
 (7,'202609240007_reminder_slots.sql',exists(select 1 from information_schema.columns where table_schema='public' and table_name='items' and column_name='coverage_active')),
 (8,'202609240008_reminder_pack_billing.sql',to_regclass('private.reminder_packs') is not null),
 (9,'202609240009_history_measurement.sql',to_regprocedure('public.date_history(uuid,integer)') is not null),
 (10,'202609260010_feedback.sql',to_regclass('private.feedback') is not null),
 (11,'202609280011_recurring_dates.sql',to_regprocedure('public.advance_recurring_dates()') is not null),
 (12,'202610010011_variable_slot_packs.sql',exists(select 1 from information_schema.columns where table_schema='private' and table_name='reminder_packs' and column_name='slot_count')),
 (13,'202610010012_reminder_categories.sql',(to_regprocedure('public.save_item_with_date(uuid,integer,text,text,jsonb,text)') is not null or to_regprocedure('public.save_item_with_date(uuid,integer,text,text,jsonb,text,text)') is not null)),
 (14,'202610010013_sms_alerts.sql',to_regprocedure('public.prepare_sms(uuid,uuid)') is not null and to_regclass('private.sms_jobs') is not null),
 (15,'202610020014_web_push.sql',to_regprocedure('public.register_push_subscription(text,text,text)') is not null and to_regclass('private.push_jobs') is not null
 and exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='push_subscription_count')),
 (16,'202610020015_reminder_ideas.sql',to_regclass('private.reminder_idea_jobs') is not null),
 (17,'202610020016_occurrence_snooze.sql',to_regprocedure('public.snooze_date(uuid,uuid,integer,text,date)') is not null),
 (18,'202610040017_install_reward.sql',to_regclass('private.install_reward_claims') is not null and to_regprocedure('public.claim_install_reward(text,boolean)') is not null),
 (19,'202610040018_reminder_activity_views.sql',to_regprocedure('private.reminder_date_matches(text,text,text,text)') is not null),
 (20,'202610040019_car_brands.sql',exists(select 1 from information_schema.columns where table_schema='public' and table_name='items' and column_name='car_brand') and to_regprocedure('public.save_item_with_date(uuid,integer,text,text,jsonb,text,text)') is not null),
 (21,'202610050020_dashboard_timeline.sql',to_regprocedure('public.dashboard_timeline_items()') is not null),
 (22,'202610050021_motorcycle_brands.sql',exists(select 1 from information_schema.columns where table_schema='public' and table_name='items' and column_name='motorcycle_brand') and to_regprocedure('public.save_motorcycle_item_with_date(uuid,integer,text,text,jsonb,text,text)') is not null),
 (23,'202610050022_subscription_brands.sql',exists(select 1 from information_schema.columns where table_schema='public' and table_name='items' and column_name='subscription_brand') and to_regprocedure('public.save_subscription_item_with_date(uuid,integer,text,text,jsonb,text,text)') is not null),
 (24,'202610050023_due_date_alerts.sql',coalesce(obj_description(to_regprocedure('private.save_important_date_base(uuid,uuid,integer,jsonb)'), 'pg_proc'),'')='keeply:due-date-alerts-v1'),
 (25,'202610060024_expand_dashboard_timeline.sql',exists(select 1 from timeline_function where oid is not null and pg_get_functiondef(oid) ~ 'limit[[:space:]]+11')),
 (26,'202610060025_loan_lenders.sql',exists(select 1 from information_schema.columns where table_schema='public' and table_name='items' and column_name='lender_id') and exists(select 1 from information_schema.columns where table_schema='public' and table_name='items' and column_name='lender_name') and to_regprocedure('public.save_loan_item_with_date(uuid,integer,text,text,jsonb,text,text,text,text,text)') is not null),
 (27,'202610060026_insurance_providers.sql',exists(select 1 from information_schema.columns where table_schema='public' and table_name='items' and column_name='insurer_id') and exists(select 1 from information_schema.columns where table_schema='public' and table_name='items' and column_name='insurer_name') and to_regprocedure('public.save_insurance_item_with_date(uuid,integer,text,text,jsonb,text,text,text)') is not null),
 (28,'202610060027_utility_billers.sql',exists(select 1 from information_schema.columns where table_schema='public' and table_name='items' and column_name='utility_id') and exists(select 1 from information_schema.columns where table_schema='public' and table_name='items' and column_name='utility_name') and to_regprocedure('public.save_utility_item_with_date(uuid,integer,text,text,jsonb,text,text,text)') is not null),
 (29,'202610070028_ai_subscriptions.sql',coalesce(obj_description(to_regprocedure('public.save_subscription_item_with_date(uuid,integer,text,text,jsonb,text,text)'), 'pg_proc'),'')='keeply:ai-subscriptions-v1'),
 (30,'202610070029_purchase_product_types.sql',exists(select 1 from information_schema.columns where table_schema='public' and table_name='purchases' and column_name='product_type') and coalesce(obj_description(to_regprocedure('public.save_purchase(uuid,integer,jsonb,jsonb)'),'pg_proc'),'')='keeply:purchase-product-types-v1'),
 (31,'202610070030_public_reactions.sql',to_regprocedure('public.public_reactions_ready()') is not null and to_regclass('private.public_reaction_counts') is not null),
 (32,'202610080031_household_activity_history.sql',to_regclass('public.item_activities') is not null and to_regclass('private.activity_requests') is not null and coalesce(obj_description(to_regprocedure('public.complete_occurrence(uuid,uuid,integer,jsonb,date,text)'),'pg_proc'),'')='keeply:household-history-v1'),
 (33,'202610080032_household_core_experience.sql',coalesce(obj_description(to_regprocedure('private.save_item_with_date_base(uuid,integer,text,text,jsonb)'),'pg_proc'),'')='keeply:gradual-records-v1' and coalesce(obj_description(to_regprocedure('public.dashboard_items()'),'pg_proc'),'')='keeply:household-core-v1')
)
select sequence,migration,case when ready then 'PRESENT: do not rerun' else 'MISSING: review before applying' end as status from checks order by sequence;
