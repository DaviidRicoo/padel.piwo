-- Padel & Piwo: scheduled jobs (pg_cron) and the call to the send-push Edge Function (pg_net).
--
-- Before running this migration, create two Vault secrets once in the project
-- (SQL editor; see replica/backend.md):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<a long random string>', 'push_cron_secret');
-- and give the Edge Function the same random string:
--   npx supabase secrets set PUSH_CRON_SECRET=<the same string>
--
-- The cron job sends only that narrow secret, never the project's secret key:
-- pg_net keeps request headers in net.http_request_queue until they are sent.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- one reminder per match, when it ends (starts_at + duration)
select cron.schedule('result-reminders', '*/5 * * * *', $$select public.send_result_reminders()$$);

-- one follow-up to the rival team when a result has waited 24 hours (09:00 UTC = 10:00 or 11:00 in Gdańsk)
select cron.schedule('confirm-followups', '0 9 * * *', $$select public.send_confirm_followups()$$);

-- every minute, but only calls the function when there is something to push
select cron.schedule(
  'send-push',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')
    ),
    body := '{}'::jsonb
  )
  where exists (
    select 1 from public.notifications
    where pushed_at is null and created_at > now() - interval '1 day'
  );
  $$
);
