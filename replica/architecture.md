# Architecture: Padel & Piwo (a rebuild of Playtomic's match loop, plus player-run tournaments)

Scope: Android and iOS app for one community, the user's residence in Gdańsk. Languages: Spanish and English. Signup is open. No web app, no payments, no court booking.

## Stack

| layer | choice | why |
| --- | --- | --- |
| mobile | Expo (React Native) + TypeScript, Expo Router | one codebase for Android and iOS; EAS builds for both stores |
| database | Postgres on Supabase | managed, row level security, SQL functions for the match and tournament rules |
| auth | Supabase Auth, email and password; Google and Apple as a later step | Apple login is required on iOS once Google login exists |
| files | Supabase Storage, one `avatars` bucket | profile photos, with a size limit and image resize on upload |
| push | Expo Push Service, fed by a database webhook on `notifications` | no own push server |
| i18n | `i18next` + `expo-localization`, es and en | device language by default, changeable in settings (S14), saved in `profiles.locale` |
| jobs | `pg_cron` calling SQL functions, plus Edge Functions | reminders run inside the database; push fan-out and account deletion need an Edge Function |
| payments, email | none | out of scope; Supabase sends the auth emails |
| hosting | Supabase (backend), EAS (builds) | nothing else to run |

One database, no microservices. The app talks to Supabase directly; the rules that matter live in SQL functions (`supabase/migrations/20261114000100_schema.sql`), so a modified client cannot break them.

## Schema

Tables: 12 (`profiles`, `matches`, `match_players`, `match_results`, `set_scores`, `rating_changes`, `follows`, `notifications`, `push_tokens`, `tournaments`, `tournament_pairs`, `tournament_ties`), one view (`player_match_results`) and the function `ranking(since)`. Access rules: row level security on every table. Members read community data; writes go through security definer functions, with a few direct writes (create a normal match, follow, own notifications and push tokens, own profile columns). Users cannot edit their own level, and cannot insert a match that belongs to a tournament. Full SQL in `supabase/migrations/20261114000100_schema.sql`.

Single community, so no group or club table. The ranking is one list for everyone, and tournament matches count in it because they are competitive matches.

How a tournament sits on the match tables: a tie of the bracket creates a normal `matches` row (`competitive`, `full`, `tournament_id` set, host = organizer) with pair A in slots 1-2 and pair B in slots 3-4. Result entry, confirmation, dispute, rating and the recent-matches list all work unchanged. Those matches are blocked from join, leave and cancel, which are for open matches.

## API

Everything uses the Supabase client with the member's session. `rpc` means a SQL function from the schema.

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| auth.signUp | create account (email, password, `display_name`, `locale` in metadata); signup is open; a 6-digit code is emailed | anyone | those fields | no session until confirmed | F01 |
| auth.verifyOtp (signup) / auth.resend | confirm the email with the code; resend it | anyone | email, code | session | F01 |
| auth.signInWithPassword | log in | anyone | email, password | session | F01 |
| auth.resetPasswordForEmail, then auth.verifyOtp (recovery) + auth.updateUser | reset the password with an emailed code | anyone | email, code, new password | session | F01 |
| auth.signOut (local or global) | log out here, or on every device | member | none | none | F06 |
| select matches (+ players) where status open, tournament_id is null, starts_at > now | list open matches (S05) | member | filters | matches | F03 |
| rpc create_match | create a match after checking every field on the server; at most 5 upcoming open matches per host; trigger puts the host in slot 1 | member | starts_at, duration_minutes, place, type, level range, notes | match id | F02 |
| select matches by id (+ players, result, sets) | match detail (S07) | member | id | match | F03 F04 F09 |
| rpc join_match | take a slot, or request one if out of level range | member | match id | `joined` or `requested` | F03 |
| rpc accept_request | host accepts a request | host | match id, player id | none | F03 |
| rpc leave_match | leave before the start (not the host) | player | match id | none | F03 |
| rpc cancel_match | host cancels, others are notified | host | match id | none | F02 |
| rpc submit_result | save sets once the match has started; rivals are notified | player | match id, sets | none | F04 F09 |
| rpc confirm_result | other team confirms; match becomes `played`; ratings update if competitive; a tournament winner advances | rival | match id | none | F04 F09 |
| rpc dispute_result | other team disputes; the submitter can send a corrected result | rival | match id | none | F04 F09 |
| rpc host_confirm_result | host confirms a pending result 7 days after it was submitted, if the rival team has not (in a tournament the host is the organizer) | host | match id | none | F04 F09 |
| select matches with confirmed or pending result, order by starts_at desc | recent matches (S09) | member | page | matches | F04 |
| rpc ranking(since) | ranking with played, won, lost, win rate (S10) | member | optional start date | rows | F05 |
| select profiles / update profiles (allowed columns) | view and edit profile (S11 S12 S13) | member (own for update) | fields | profile | F06 |
| storage avatars upload | profile photo | member | image | url | F06 |
| select profiles ilike name | search players (S16, S20) | member | text | profiles | F06 F08 |
| insert and delete follows | follow and unfollow | member | player id | none | F06 |
| select notifications, update read_at | notification list (S15) | member | none | rows | F03 F04 F08 |
| upsert push_tokens | register device for push | member | token, platform | none | F03 |
| rpc delete_account, then Edge Function delete-user | anonymise the player, then delete the login | member | none | none | F06 |
| rpc create_tournament | create a tournament of 8, 16 or 32 players | member | name, description, place, starts_at, players, round_days | tournament id | F07 |
| select tournaments (+ pairs, ties) | list and detail (S17 S19 S21) | member | filters, id | rows | F07 F08 F09 |
| rpc register_pair | register with a partner picked from the player search; the partner gets an invite | member | tournament id, partner id | pair id | F08 |
| rpc respond_pair_invite | partner accepts or declines; the last acceptance triggers the draw | invited partner | pair id, accept | none | F08 |
| rpc withdraw_pair | either member leaves before the draw | pair member | pair id | none | F08 |
| rpc cancel_tournament | organizer cancels; pairs are notified, open tie matches cancelled | organizer | tournament id | none | F07 |
| rpc organizer_set_result | organizer settles a tournament match when pairs dispute or do not answer | organizer | match id, sets | none | F09 |
| rpc reschedule_match | a pair moves the date of its tournament match; the reminder moves too | pair member | match id, new date | none | F09 |

Client-callable functions: 18 (with `create_match`). Internal ones (not callable by the app): `notify`, `notifications_fill_refs`, `free_slot`, `apply_ratings`, `save_sets`, `finalize_result`, `create_tie_match`, `draw_tournament`, `advance_tournament`, `send_result_reminders`, `send_confirm_followups`, `claim_pushes` (service role only). Writes go only through functions: there is no insert policy on any table except `follows` and `push_tokens`.

Webhooks in: none. Webhooks out: none. Pushes go out through a `pg_cron` job that calls the `send-push` Edge Function (below), not through a database webhook, so no secret key ever leaves Vault.

Jobs (migration `supabase/migrations/20261114000200_schedules.sql`):
- `send_result_reminders()`, `pg_cron` every 5 minutes: when a match ends (`starts_at` plus `duration_minutes`) it inserts one `result_reminder` for each of its players. One reminder per match, and `result_reminded_at` guards against repeats. The push text depends on state: "enter the result" if there is none, "confirm the result" if one is pending.
- `send_confirm_followups()`, `pg_cron` daily at 09:00 UTC: if a submitted result is still unconfirmed after 24 hours, one more reminder to the rival team.
- `send-push`:
  - **When:** `pg_cron` runs every minute, and only calls the Edge Function `supabase/functions/send-push` when some notification is unsent.
  - **Auth:** the call carries the `x-cron-secret` header, read from Vault.
  - **What it does:** `claim_pushes()` hands out each notification exactly once, by setting `pushed_at` in the same statement that reads it. The function then sends to Expo's push service in the player's language, and deletes the tokens of uninstalled apps.
- `delete-user`: Edge Function called by the app with the player's session. It runs `delete_account()` as the player, then deletes the login with the admin API.

## The parts that bite

- **time zones:** stored as UTC `timestamptz`; shown in Europe/Warsaw. Test the March and October clock changes. The daily follow-up at 09:00 UTC is 10:00 or 11:00 in Gdańsk.
- **races:** the last slot of a match, and the last pair of a tournament. `join_match`, `respond_pair_invite`, `register_pair` and `withdraw_pair` lock the match or tournament row first. A partial unique index on (match, slot) is the final guard for matches. The test suite checks the index and the sequential rules; it cannot simulate two connections at once, so run two real clients against a staging database once before launch.
- **tournament registration:** only confirmed pairs fill the cap, so a pending invite cannot block a spot. When the cap fills, pending invites expire. A player is in at most one live pair per tournament, checked under the lock because the unique indexes only cover one column each. Names are not unique, so the partner is chosen from the search list by id, never by typed text.
- **the draw:** random seeds, then every tie of every round is created up front (2, 3 or 4 rounds), and the first-round matches are created in the same transaction. Sizes are powers of two, so there are no byes.
- **a stalled bracket:** if a pair never answers or keeps disputing, the organizer settles the match with `organizer_set_result`.
- **organizer deletes their account:** `delete_account` hands the tournament to a player registered in it, the one in the earliest confirmed pair (the registrant first, then their partner), and moves the `host_id` of its matches with it. The new organizer gets a `tournament_organizer_assigned` notification. A tournament still in registration with nobody registered is cancelled. Known side effect: the new organizer is also a player, so they can settle their own match with `organizer_set_result`. Fine in a small community; if it causes trouble, block it and let a different pair member decide.
- **dates of tournament matches:** the system picks a default date (round 1 not before the tournament date, later rounds `round_days` after the previous result) and the pair can change it. The end-of-match reminder uses that date, so an unmoved date may remind players before they have actually played; moving it resets the reminder.
- **result integrity:** a result needs the other team's confirmation before it counts. Disputed results stay out of the ranking. If the rival team never confirms, the host can confirm 7 days after the result was submitted (`host_confirm_result`). That does not cover a disputed result, which needs a new submission, nor a match where nobody ever submits a result; in a tournament the organizer can settle both. S07 should show the host's button once the 7 days have passed; there is no push for it yet. If the host deletes their account, a normal match with a pending result stays unconfirmed.
- **rating:** own Elo-style system on a 1 to 10 scale, only after confirmed competitive matches. Not Playtomic's algorithm. Tournament matches count as competitive. The starting level comes from the questionnaire (S04); until it is built, everyone starts at 4.0.
- **idempotency:** `confirm_result` only runs while the result is `pending`, under a row lock, and `rating_changes` has a unique (player, match), so ratings apply once.
- **GDPR and the stores:** `delete_account` is required by Apple and Google and by the EU. It anonymises instead of deleting rows, withdraws the player from tournaments still in registration, passes tournaments they organise to a registered player (see above), and leaves running tournament matches alone.
- **Apple:** Sign in with Apple becomes mandatory the day Google login is added. Email-only needs neither.
- **push:** iOS asks permission at runtime; ask after the first match is joined, not at launch. Android 13+ asks too. Reminders only work if the player allowed push, so the notification list (S15) shows the same items inside the app.
- **open signup:** with no invite code, anyone who finds the app can register. The only protection is Supabase Auth's own rate limits. If strangers show up, add the invite code later (a small table and a check in `handle_new_user`).
- **spam:** limit creating matches and tournaments per member (suggested: 5 open matches and 2 open tournaments each) in a later migration.

## Tested

`replica/tests/schema.test.mjs` runs `schema.sql` on an in-memory Postgres (PGlite) with stand-ins for Supabase's auth objects and default grants. 17 checks pass: open signup, level protection, row level security, joins and full matches, level-range requests, friendly and competitive results with dispute and resubmit, ranking, reminders (once, only after the match ends, daily follow-up), the host's 7-day confirmation, tournament rules, the draw for 8 and 32 players, advancing winners to a champion, the organizer override, rescheduling, cancelling, account deletion, and the organizer hand-over in registration and in a running tournament. Run it with:

```
PGLITE_ENTRY=<path to node_modules/@electric-sql/pglite/dist/index.js> node replica/tests/schema.test.mjs
```

Not covered: real concurrency (see above), the `pg_cron` schedule itself, push delivery, and Supabase-specific behaviour such as the real `auth` schema and its default privileges; those need a Supabase project.

## Build order

1. **Vertical slice:** S01, S02, S03 (sign up and log in), S06 (create match), S05 (list), S07 (detail and join), S08 (enter result), S09 (recent matches), S10 (ranking). Tables: `profiles`, `matches`, `match_players`, `match_results`, `set_scores`. Routes: signUp, signIn, insert match, join_match, submit_result, confirm_result, ranking. Everything in Spanish first, with the i18n structure in place, and ugly on purpose.
2. **Must-haves** from `features.csv`, by area:
   - onboarding: password reset, sign-out, es and en;
   - matches: leave, cancel, friendly and competitive, duration;
   - results: confirmation, dispute, end-of-match reminder (push and S15);
   - profile: S11, S12, S13 and own stats;
   - settings: S14, delete account.
3. **Tournaments** (must-haves of that area): S17, S18, S19, S20, S21 and the 5th tab; create, register in pairs, accept, automatic draw, bracket, winners advance.
4. **Should-haves:** S04 questionnaire, rating on the profile, ranking period filter, extra stats, push for all notification types, S16 search, invite link; tournament withdraw, cancel, organizer override, tournament notifications.
5. **Could-haves:** follow, ranking among followed, request a slot outside the level range, reschedule tournament match UI, the post-match social event (Padel & Piwo).
6. **Fixes from replica-entrepreneur:** once it has run.

Each milestone should leave the app installable on a real Android and a real iPhone (EAS development builds).
