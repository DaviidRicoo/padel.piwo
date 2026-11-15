# Parity: Padel & Piwo Gdańsk against Playtomic (matches slice)

Date: 2026-11-15. Build: `e8d67b4` (branch `design/refresh`).
Sources: `replica/features.csv` (scored with `parity.py`), the Playwright suite (`replica/test-plan.md`), the recon map's flows (`replica/recon.md`).

## Update 2026-11-15

Faster score entry, notification settings, the profile photo and "resend code" for password recovery are built and tested (e2e 109 of 110 with BUG-003 skipped, SQL 25 of 25). The three musts stay `partial` in `features.csv` until they are checked against the real Supabase project, so the score below is unchanged.

## Verdict: not shippable yet

- 4 of the 24 scored must-haves are partial (none is missing outright).
- 1 more must-have of your own (the push reminder when a match ends) is partial too. `parity.py` does not score features the original lacks, so it is not in the 24.
- No open S1 or S2 bug. One S4 is open (BUG-003, `replica/bugs.md`).

The feature score is already 80.8, the threshold for "shippable". What blocks shipping is the five must-haves, not the score.

## Scores

| | score | notes |
| --- | --- | --- |
| **features** | **80.8 / 100** | 35 features counted, must 3 / should 2 / could 1, partial counts half |
| layout | not measured | there are no screenshots of Playtomic in `replica/screens/`. The recon was done from public pages only, and screenshots of the original are never taken from its app by this pack. To get this score, add your own phone's screenshots of Playtomic (S05, S07, S08, S09, S10, S11) at 390 px wide |
| overall | 80.8 | features only, since layout is not measured |

### By area, weakest first

| area | score | features | what pulls it down |
| --- | --- | --- | --- |
| notifications | 50.0 | 1 | push to a real phone not proven (needs a development build) |
| onboarding | 57.7 | 5 | Google / Apple sign-in, level questionnaire (S04), password recovery untested on a real mailbox |
| social | 66.7 | 2 | following players |
| ranking | 69.2 | 6 | extra stats (lost, streak, sets), ranking among people you follow, questionnaire for the starting level |
| settings | 75.0 | 2 | notification settings |
| profile | 83.3 | 3 | photo upload |
| matches | 90.4 | 10 | invite by link; declining a level request |
| results | 100.0 | 4 | |
| tournaments | 100.0 | 2 | only 2 rows are scored (the original has player tournaments only partly); 11 more are yours, all built |

## Missing, in build order

Must (not shippable without them):
1. **Push notifications on a phone** (partial): delivery to Expo works; no phone has a token yet. Needs `eas build --profile development` and a real device. This also closes your own must "reminder when the match ends" and the tournament push notifications.
2. **Notification settings** (partial): language, theme, sign out and delete account are done; choosing which notifications to get is not.
3. **Profile photo** (partial): name, city, hand and side are done; upload is not (Supabase Storage, with size and type limits).
4. **Password recovery** (partial): built with an emailed code, tested on fake data (F01-N2); not tried with a real mailbox.

Should:
5. Invite players by link (share a match).
6. Level questionnaire at sign-up (S04, own 5 to 8 questions). Everyone starts at 4,00 today.
7. Google / Apple sign-in. If Google is added, Apple becomes mandatory on iOS.
8. Extra stats: lost, streak, sets.
9. Level after a competitive match (partial): your own Elo-style algorithm works; it waits on the questionnaire for a fair start.

Could: ranking among people you follow, following players, declining a level request (accepting works).

Left out on purpose (not scored): court booking, payments, Premium, club tournaments with fees, club ranking, the club network.

## Behaviour diff

Click counts for the clone are counted from the Playwright cases. Counts for Playtomic are the recon map's estimates from public material, not measured in the app (no screenshots or walkthrough of your own account were available).

| flow | Playtomic (recon) | clone | fix or keep |
| --- | --- | --- | --- |
| F01 sign up | 5 taps, then the level questionnaire | 3 taps (Crear cuenta, submit, confirm the emailed code). No questionnaire: everyone starts at 4,00 | keep the short path; add the questionnaire (should) as an optional step that can be skipped |
| F02 create a match | 4 | 4 (Crear partido, day, time, Publicar). Place, type, level and notes have defaults | keep |
| F03 join | 2 | 2 (card, Unirme). Outside the level range it becomes a request to the host | keep |
| F04 enter a result | 5 | 5 for 6-3 6-2 (card, Introducir resultado, chip 6-3, chip 6-2, Enviar; F04-H2). Was about 20 with only the + buttons. Odd scores (a 10-8 third set) still use − and +. The rival confirms in 2 | fixed 2026-11-15 |
| F05 ranking | 1 | 1 | keep |
| F06 edit profile | 3 | 3 | keep; add the photo |
| F07 create a tournament | 4 | 3 plus the name | keep |
| F08 register a pair | 4 + 2 | 3 + the search text; the partner 2 (Torneos, Aceptar) | keep |
| F09 play the tournament | 5 per match | same screen as F04: 5 per match | fixed with F04 |

Other differences:

| what | Playtomic | clone | fix or keep |
| --- | --- | --- | --- |
| errors | not observed | every form shows all problems at once, under each field, in the user's language; server errors become a plain toast | keep |
| remembered between visits | session, language | session (encrypted on the phone), language per account, theme | keep |
| emails | account emails | sign-up code (arrived fast, not spam, tested 2026-11-14); recovery code untested on a real mailbox | test recovery (must 4) |
| an unconfirmed result | not documented | the reminder when the match ends, and after 7 days the host can confirm | yours, keep |
| tournaments | club tournaments, paid | free player tournaments for 8, 16 or 32 with an automatic draw | yours, keep |
| accessibility | not measured | axe WCAG 2.1 AA clean on 19 screens in both themes; keyboard-only join works; one S4 open (BUG-003) | keep, fix BUG-003 |

## Top five to build next

1. **Push on a real phone**: a development build with EAS, register the token, receive "someone joined" and the end-of-match reminder. Closes 2 musts and the tournament notifications.
2. ~~**Faster score entry**~~ (behaviour fix for F04 and F09): done 2026-11-15. Each set has chips for 6-0 … 7-6 and 0-6 … 6-7; 6-3 6-2 now takes 5 taps.
3. **Notification settings** (must): built 2026-11-15. Four switches on S14 in a private `notification_settings` table; `claim_pushes()` sends nothing for a switched-off kind. Tested in e2e and SQL. Migration `20261115000100` is applied to the real project (checked 2026-11-15).
4. **Profile photo** (must): built 2026-11-15. Pick, square crop, 512 px JPEG, public `avatars` bucket (512 KB, images only, own folder only), set through `set_avatar()`, shown in every avatar; `delete-user` removes it. Tested in e2e and SQL. Migration applied and `delete-user` deployed (v3, checked 2026-11-15). Left: try it on a phone and on the real project.
5. **Password recovery on the real backend** (must): "Reenviar código" added and the whole flow tested on fake data (F01-H2). Left: you try it with your own mailbox against the real project.

After those five, every scored must-have is done and the verdict becomes "shippable". Then `/replica-entrepreneur` if you want to go beyond Playtomic, or straight to `/replica-deploy` to hand it to the residence.
