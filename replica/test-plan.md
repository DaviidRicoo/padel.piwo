# Test plan: Padel & Piwo Gdańsk

Build: `eb11de4` plus the fixes listed in `bugs.md`. Date: 2026-11-14.
Env: local web build (`npx expo start --web --port 8082`) on the in-memory fake data layer, signed in as Ana; Microsoft Edge (Playwright channel `msedge`), 390 × 844, `es-ES`, Europe/Warsaw unless a case says otherwise.

How to run everything:

```bash
npm run test:e2e                                  # 103 Playwright cases (starts the server if needed)
PGLITE_ENTRY=<pglite>/dist/index.js node replica/tests/schema.test.mjs   # 22 database rule tests
node replica/tests/core-loop.mjs http://localhost:8082 shots   # older click-throughs, still kept
node replica/tests/batch2-flow.mjs http://localhost:8082 shots
```

Every Playwright case fails on any console error, page error or 5xx response (`e2e/fixtures.ts`). Each fresh page load starts from the same seed, so cases are independent. Two-person cases (a rival confirms, a partner accepts) sign out and in on the same page, keeping the in-memory data.

`auto` says where the case lives: `e2e/<file>`, `db` (`replica/tests/schema.test.mjs`, the real SQL on PGlite) or `manual`.

## Results

| suite | cases | passed | failed | skipped |
| --- | --- | --- | --- | --- |
| Playwright `e2e/` | 103 | 102 | 0 | 1 (BUG-003, known, `test.fixme`) |
| database rules (PGlite) | 22 | 22 | 0 | 0 |
| older click-throughs (core loop, batch 2) | 17 steps | 17 | 0 | 0 |
| manual (below) | 9 | not run in this pass | | |

## F01 Sign up and sign in (S01, S02, S03)

| case | type | steps | expected | auto | result |
| --- | --- | --- | --- | --- | --- |
| F01-H1 | happy | Crear cuenta, name "Zoë Núñez-Łukasz 🎾", mixed-case email with spaces, password | lands on Partidos; profile shows the name, level 4,00 and initials "ZN" | e2e/f01-signup | pass (after BUG-001) |
| F01-E1 | edge: email in use | sign up with ANA@padelpiwo.test | "Ya hay una cuenta con ese correo." on the email field | e2e/f01-signup | pass |
| F01-E2 | edge: empty input | submit the empty form | all three errors at once | e2e/f01-signup | pass |
| F01-E3 | edge: spaces, long input | name of spaces; then 60 characters | refused; field stops at 40 | e2e/f01-signup | pass |
| F01-E4 | edge: double click | double tap Crear cuenta | one account, no "email in use" error | e2e/f01-signup | pass |
| F01-E5 | edge: back mid-flow | type a name, browser back | welcome screen | e2e/f01-signup | pass |
| F01-N1 | negative: wrong password | wrong password, then the right one with Enter | error, email kept, then signed in | e2e/f01-signup | pass |
| F01-N2 | negative: bad code | password recovery with "12ab" | "El código no es correcto o ha caducado." | e2e/f01-signup | pass |
| F01-M1 | manual: real email | sign up on the real backend, code arrives, not in spam | account active, lands on Partidos | manual | passed earlier (user, 2026-11-14) |

## F02 Create a match (S05, S06, S07)

| case | type | steps | expected | auto | result |
| --- | --- | --- | --- | --- | --- |
| F02-H1 | happy | tomorrow 19:30, 60 min, place with a dash, friendly, level 3+, emoji note | S07 shows host, place and note; S05 lists it with 3 free slots | e2e/f02-create-match | pass |
| F02-E1 | edge: empty input | publish with no time | "Elige una hora.", nothing created | e2e/f02-create-match | pass |
| F02-E2 | edge: empty place | no place | uses "Pista 1" | e2e/f02-create-match | pass |
| F02-E3 | edge: invalid level range | max down to 4, min up to 8 | max follows min; min never above max | e2e/f02-create-match | pass |
| F02-E4 | edge: double click | double tap Publicar | one match | e2e/f02-create-match | pass |
| F02-E5 | edge: back mid-flow | fill half, back | nothing created | e2e/f02-create-match | pass |
| F02-E6 | edge: past time | today, 08:00 | chip disabled | e2e/f02-create-match | pass (skips before 8:00) |
| F02-E7 | edge: long input | 150-character place | stops at 120 | e2e/f02-create-match | pass |
| F02-E8 | edge: time zone | phone in New York, create 19:30 | shows 19:30 (Gdańsk time) | e2e/f02-create-match | pass |
| F02-D1 | server checks | past date, bad duration, bad range, too many open | refused by `create_match` | db | pass |

## F03 Join a match (S05, S07)

| case | type | steps | expected | auto | result |
| --- | --- | --- | --- | --- | --- |
| F03-H1 | happy | join Luis's friendly | toast, Salir button, card shows 2 free | e2e/f03-join | pass |
| F03-E1 | edge: level out of range | join Eva's 4.8–7 match; Eva accepts | request banner; Eva sees it in Avisos and accepts | e2e/f03-join | pass |
| F03-E2 | edge: cancelled match | open Lucía's cancelled match | banner, no join button, empty slots disabled | e2e/f03-join | pass |
| F03-E3 | edge: double click | double tap join | joined once, no error | e2e/f03-join | pass |
| F03-E4 | edge: leave; host | join then leave; open own match | slot free again; host gets Cancelar, not Salir | e2e/f03-join | pass |
| F03-E5 | edge: host cancels | cancel own match; sign in as Marc | banner; Marc told in Avisos | e2e/f03-join | pass |
| F03-E6 | keyboard only | Tab to a card, Enter, Tab to join, Enter | joined without a mouse | e2e/f03-join | pass |
| F03-N1 | negative: deleted record | /match/no-existe | "No encontramos este partido." | e2e/f03-join | pass |
| F03-D1 | edge: last slot taken | join a full match; write a second player into a taken slot | `match_full`; the unique slot index refuses it | db ("joins fill slots; a full match is closed") | pass (true concurrency: see "to check") |

## F04 Enter and confirm a result (S07, S08, S09)

| case | type | steps | expected | auto | result |
| --- | --- | --- | --- | --- | --- |
| F04-H1 | happy | Ana sends 6-3 6-2; Diego confirms | waiting text for Ana; Diego's Recientes shows Derrota with the score | e2e/f04-result | pass |
| F04-H2 | happy: common scores | Recientes, the card, Introducir resultado, chip 6-3, chip 6-2, Enviar | sent in 5 taps; counters show 6 and 3; Diego sees "6-3 6-2, Por confirmar" | e2e/f04-result | pass |
| F04-H3 | edge: other team won, odd score | chip 4-6 in set 1; chip 6-7 in set 2, then − on team B | chip read as "4-6, gana Equipo B"; no chip selected at 6-6; tie error | e2e/f04-result | pass |
| F04-E1 | edge: invalid score | 6-6 in set 1 | "Un set no puede acabar en empate.", not sent | e2e/f04-result | pass |
| F04-E2 | edge: no winner | one set each, then a 10-8 third | asks for a third set, then sends | e2e/f04-result | pass |
| F04-E3 | edge: rival disputes | Diego disputes | banner, "Enviar un resultado nuevo", Ana told | e2e/f04-result | pass |
| F04-E4 | permission | Ana's partner Marc opens it | no Confirmar button | e2e/f04-result | pass |
| F04-E5 | edge: rival never answers | host opens the 8-day-old result | "Confirmar como organizador" works | e2e/f04-result | pass |
| F04-E6 | ranking | Ana confirms a competitive loss | her level goes down | e2e/f04-result | pass |
| F04-E7 | edge: result already sent | open /result on a match with a pending result | "Todavía no se puede enviar el resultado." | e2e/f04-result | pass |
| F04-E8 | edge: not started | future match | no result button; /result refuses | e2e/f04-result | pass |
| F04-D1 | friendly | confirm a friendly | levels unchanged | db ("friendly result") | pass |
| F04-D2 | dispute and resubmit | dispute, resubmit, confirm | levels and ranking move only once confirmed | db ("competitive result") | pass |

## F05 Ranking, F06 Profile, S13, S16

| case | type | steps | expected | auto | result |
| --- | --- | --- | --- | --- | --- |
| F05-H1 | happy | Ranking, Temporada and Total, open row 1 | rows in both periods, opens Eva | e2e/f05-f06 | pass |
| F05-E1 | edge: friendly | Ola's row | 4 played, 0 won (her friendly win does not count) | e2e/f05-f06 | pass |
| F05-E2 | edge: no matches yet | new account | not in the ranking; 12 rows | e2e/f05-f06 | pass |
| F06-H1 | happy | name with ª and Ż, left hand, revés | saved and shown | e2e/f05-f06 | pass |
| F06-E1 | edge: empty name | spaces only | error, not saved | e2e/f05-f06 | pass |
| F06-E2 | edge: long input | 60 characters | stops at 40 | e2e/f05-f06 | pass |
| F06-E3 | edge: back without saving | type, back | old name kept | e2e/f05-f06 | pass |
| S16-H1 | accents and case | search "LUCIA" then "zzz" | finds Lucía; empty state | e2e/f05-f06 | pass |
| S13-N1 | deleted record | /player/p_nadie | "No encontramos a este jugador." | e2e/f05-f06 | pass |
| F06-M1 | manual: photo | upload a large photo | not built yet (`should`), see features.csv | manual | not run |

## F07 to F09 Tournaments (S17 to S21)

| case | type | steps | expected | auto | result |
| --- | --- | --- | --- | --- | --- |
| F07-H1 | happy | 16-player tournament with emoji name | S19 open, "0 de 8 parejas" on S17 | e2e/f07-f09 | pass |
| F07-E1 | edge: short name | one letter | "al menos 2 caracteres" | e2e/f07-f09 | pass |
| F07-E2 | edge: cancel with pairs | invite Marc, cancel | banner; Marc's invite gone; Marc told | e2e/f07-f09 | pass |
| F08-H1 | happy | Ana invites Marc, Marc accepts | both see the pair | e2e/f07-f09 | pass |
| F08-E1 | edge: partner taken | Diego in Copa de otoño | listed as already registered, disabled | e2e/f07-f09 | pass |
| F08-E2 | edge: partner declines | Ana declines Luis | invite gone; Luis told | e2e/f07-f09 | pass |
| F08-E3 | edge: withdraw | invite, withdraw, invite someone else | works | e2e/f07-f09 | pass |
| F08-E4 | edge: cap fills while pending | Lucía invites Kasia; Ana fills the cap | draw runs; Lucía's pending pair lapses | e2e/f07-f09 | pass |
| F08-E5 | edge: self | search own name in S20 | not offered | e2e/f07-f09 | pass |
| F09-H1 | happy | Ana accepts the last invite | draw, "Tu próximo partido", semifinals | e2e/f07-f09 | pass |
| F09-E1 | permission | tournament match | no Salir, no Cancelar | e2e/f07-f09 | pass |
| F09-E2 | edge: nobody answers | organizer settles semifinal and final | champions named | e2e/f07-f09 | pass |
| F09-E3 | edge: organizer override | organizer on a future tournament match | override button offered | e2e/f07-f09 | pass |
| F09-D1 | 32 players, organizer deletes account | | 4-round bracket; tournament handed to a player | db | pass |

## Cross-cutting

| case | type | steps | expected | auto | result |
| --- | --- | --- | --- | --- | --- |
| X-01 | second user's data | Diego opens Avisos | none of Ana's notifications | e2e/cross | pass |
| X-02 | deleted account | Lucía deletes her account | signed out, cannot sign in; Eva's ranking unchanged, Lucía's name gone | e2e/cross | pass |
| X-03 | language | switch to English | every tab and the Tournaments screen in English | e2e/cross | pass |
| X-04 | signed out deep link | /match/... after sign-out | welcome screen, no match data | e2e/cross | pass |
| X-05 | unknown route | /esto-no-existe | not-found screen with a way back | e2e/cross | pass |
| X-06 | desktop width | 1440 × 900 | content ≤ 640 px wide, no sideways scroll | e2e/cross | pass |
| X-07 | theme | Ajustes > Oscuro | dark background | e2e/cross | pass |
| A11Y | screen readers, contrast | axe WCAG 2.1 AA on 19 screens × light and dark, plus no sideways scroll at 390 px | no violations | e2e/a11y | pass (after BUG-002); BUG-003 open |
| X-D1 | RLS | a member edits their own level, writes match_players, reads others' notifications | refused / nothing back | db | pass |

## Manual pass (not automatable here)

Run on a phone or on the real backend. None was run in this pass; the first two were done by the user earlier.

1. Sign-up email arrives and the code works (done 2026-11-14: arrived fast, not in spam).
2. Push notification on a real phone: join a match, get the reminder when it ends. Needs a development build (`eas build --profile development`).
3. Password recovery email on the real backend: the code arrives and the new password works.
4. Offline: airplane mode on the real backend; every screen shows the error state with Reintentar, and a join does not half-happen.
5. Slow network: throttle to 3G; buttons show loading and do not double-submit.
6. Expired session: revoke the session in Supabase (or sign out everywhere from another device); the next action sends the user to sign in.
7. Two tabs or two phones at once: join the last slot on both at the same moment (real Postgres row lock).
8. VoiceOver (iOS) and TalkBack (Android): the steppers are adjustable (swipe up and down), the chips announce "selected".
9. Profile photo upload: not built yet.

## To check (not reproduced, so not in bugs.md)

- True concurrency on the last slot or the last tournament pair can only be proven on the real Postgres (manual 7). The SQL takes a row lock and has a unique index; PGlite has one connection.
- Daylight saving: matches across the last Sunday of March and October were not created in a test. `zonedToUtc` uses the Warsaw zone rules from `Intl`, so it should be right.
