-- Padel & Piwo: notification settings (S14) and profile photos (S12).

-- ---------------------------------------------------------------- notification settings

-- One row per player, created the first time they change a switch. No row means
-- every kind is on. Only push is filtered: the in-app list (S15) shows everything.
create table notification_settings (
  player_id uuid primary key references profiles(id) on delete cascade,
  matches boolean not null default true,      -- joined, request, accepted, cancelled
  results boolean not null default true,      -- sent, confirmed, disputed
  reminders boolean not null default true,    -- the match has ended: enter or confirm the result
  tournaments boolean not null default true,  -- invites, draw, next match, champion
  updated_at timestamptz not null default now()
);
create trigger notification_settings_updated before update on notification_settings
  for each row execute function set_updated_at();

alter table notification_settings enable row level security;
-- private: only the player reads and writes their own row
create policy own_settings_read on notification_settings for select to authenticated
  using (player_id = (select public.me()));
create policy own_settings_insert on notification_settings for insert to authenticated
  with check (player_id = (select public.me()));
create policy own_settings_update on notification_settings for update to authenticated
  using (player_id = (select public.me())) with check (player_id = (select public.me()));
revoke all on notification_settings from anon;
revoke delete on notification_settings from authenticated;

-- Which switch a notification type belongs to. Mirrors pushCategoryOf() in src/data/rules.ts.
create function push_category(p_type text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_type like 'tournament\_%' then 'tournaments'
    when p_type = 'result_reminder' then 'reminders'
    when p_type like 'result\_%' then 'results'
    else 'matches'
  end
$$;
revoke all on function push_category(text) from public, anon, authenticated;

-- claim_pushes() as before, but a kind the player switched off gets no tokens:
-- the row is still claimed (so it is never retried) and nothing is sent.
create or replace function claim_pushes(p_limit int default 100)
returns table (id uuid, player_id uuid, type text, match_id uuid, tournament_id uuid,
               actor_name text, locale text, tokens text[])
language sql security definer set search_path = public as $$
  with claimed as (
    update notifications n set pushed_at = now()
    where n.id in (
      select x.id from notifications x
      where x.pushed_at is null and x.created_at > now() - interval '1 day'
      order by x.created_at
      limit p_limit
      for update skip locked)
    returning n.*
  )
  select c.id, c.player_id, c.type, c.match_id, c.tournament_id, a.display_name, p.locale,
         case when coalesce(case push_category(c.type)
                              when 'matches' then s.matches
                              when 'results' then s.results
                              when 'reminders' then s.reminders
                              else s.tournaments end, true)
              then array(select t.token from push_tokens t where t.player_id = c.player_id)
              else '{}'::text[] end
  from claimed c
  join profiles p on p.id = c.player_id
  left join profiles a on a.id = c.actor_id
  left join notification_settings s on s.player_id = c.player_id
$$;
revoke all on function claim_pushes(int) from public, anon, authenticated;

-- ---------------------------------------------------------------- profile photos

-- A public bucket: avatars are shown to every member, served from Supabase
-- Storage's own domain. 512 KB at most, images only. The app sends a 512 px JPEG
-- of about 50 KB, so the limit only stops uploads that skip the app.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 524288, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Each login writes only inside its own folder: avatars/<auth user id>/<file>.
create policy avatars_read_own on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- profiles.avatar_url now holds a path inside the bucket ("<auth id>/<file>.jpg"), set
-- only through set_avatar(), so nobody can point their avatar at an outside URL.
-- The app turns the path into the public URL.
revoke update (avatar_url) on profiles from authenticated;

create function set_avatar(p_path text) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me();
begin
  if v_me is null then raise exception 'not_authenticated'; end if;
  if p_path is not null and (
       p_path !~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{1,64}\.(jpg|png|webp)$'
       or split_part(p_path, '/', 1) <> auth.uid()::text
       or not exists (select 1 from storage.objects o where o.bucket_id = 'avatars' and o.name = p_path))
  then
    raise exception 'invalid_avatar';
  end if;
  update profiles set avatar_url = p_path where id = v_me;
end $$;
revoke all on function set_avatar(text) from public, anon;
grant execute on function set_avatar(text) to authenticated;
