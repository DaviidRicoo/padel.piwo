-- Padel & Piwo: fixes from Supabase's security and performance advisors
-- (npx supabase db advisors --remote), run after the first two migrations.

-- 1. helper functions get a fixed search_path (lint 0011)
alter function public.set_updated_at() set search_path = '';
alter function public.notifications_fill_refs() set search_path = '';

-- 2. trigger functions are not part of the API: nobody calls them through /rest/v1/rpc
--    (triggers still fire; EXECUTE is only checked when a trigger is created)
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.host_joins_match() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

-- me() is used by the row level security policies of signed-in members only
revoke all on function public.me() from public, anon;
grant execute on function public.me() to authenticated;

-- 3. intentionally kept: signed-in members may call the SECURITY DEFINER functions
--    listed in the schema migration's grants (join_match, submit_result...). They are
--    the app's API, and each one checks who is calling with me() before changing anything.

-- 4. evaluate auth.uid() and me() once per statement, not once per row (lint 0003)
alter policy edit_own on public.profiles
  using (auth_id = (select auth.uid())) with check (auth_id = (select auth.uid()));
alter policy follow on public.follows with check (follower_id = (select public.me()));
alter policy unfollow on public.follows using (follower_id = (select public.me()));
alter policy own_notifications on public.notifications using (player_id = (select public.me()));
alter policy own_notifications_read on public.notifications
  using (player_id = (select public.me())) with check (player_id = (select public.me()));
alter policy own_tokens on public.push_tokens
  using (player_id = (select public.me())) with check (player_id = (select public.me()));
