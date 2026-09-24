-- Optional production setup AFTER deployment and a successful manual worker test.
-- Enable Cron and pg_net in your dedicated Supabase project first.
-- In Supabase Vault create two secrets using the dashboard:
-- keeply_app_url = https://keeplyph.com
-- keeply_cron_secret = the same random value as CRON_SECRET in Vercel
-- Do not paste real secrets into this file or commit them.
select cron.schedule('keeply-reminders', '*/15 * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='keeply_app_url') || '/api/cron/notifications',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='keeply_cron_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 55000
  );
$job$);
select cron.schedule('keeply-maintenance', '7 * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='keeply_app_url') || '/api/cron/maintenance',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='keeply_cron_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 55000
  );
$job$);
