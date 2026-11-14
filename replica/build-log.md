# Build log: Padel & Piwo

- **Batch 1:** the app shell and the core loop. Branch `build/shell-and-core-loop`.
- **Batch 2:** profiles, search and tournaments. Branch `build/profiles-search-tournaments`, based on batch 1.

Both batches are dated 2026-11-13.

Everything runs on the fake data layer (`src/data/fake/`), which applies the same rules as `supabase/migrations/20261114000100_schema.sql` and keeps its data in memory. A reload resets it. No feature is usable by real people until `/replica-backend` swaps in Supabase behind the same `Api` interface (`src/data/api.ts`). That is why almost every feature is `partial` in `features.csv`.

How it was checked:
- **Typecheck, lint and colours:** `npx tsc --noEmit` and `npx expo lint` pass with no errors. No raw colour appears in components or screens.
- **Scripted click-through:** `replica/tests/core-loop.mjs` drives the web build at 390×844 with real mouse and keyboard events. Its 11 steps pass with 0 console errors (see "Core loop" below).
- **Wide screen:** one capture at 1440 px wide checks the layout.
- **Screenshots** are in `replica/clone-screens/`.
- **Not checked yet:** a real phone. These checks ran on the web build only.

## Screens

| ID | date | status | what is missing | harder than expected |
| --- | --- | --- | --- | --- |
| S01 Welcome | 2026-11-13 | done | — | — |
| S02 Sign up | 2026-11-13 | partial | real accounts (backend); Google and Apple sign-in | — |
| S03 Sign in | 2026-11-13 | partial | real accounts (backend). The password reset screen sends no email yet. The sign-in screen shows the test account hint, which must go when the backend arrives. | Signing out left the router on `/`, which only exists inside the protected area: "Unmatched Route". Fixed with an explicit redirect plus a `+not-found` screen that sends guests to the welcome screen. |
| S04 Level questionnaire | — | stub | everything; everyone starts at level 4.0 | — |
| S05 Matches | 2026-11-13 | partial | backend | The tab bar's default height cut the labels at 390 px; it now uses the `tab-bar` token plus the safe area. |
| S06 Create match | 2026-11-13 | partial | backend | Day and time chips instead of a native date picker, so it works the same on web and phones. Times are entered in Gdańsk time and stored in UTC (`src/lib/time.ts`), including around clock changes. |
| S07 Match detail | 2026-11-13 | partial | backend; decline a join request; share link | Biggest screen: join, request, leave, cancel, accept, enter result, confirm, dispute, and the host's 7-day confirmation all live here. |
| S08 Enter result | 2026-11-13 | partial | backend | — |
| S09 Recent matches | 2026-11-13 | partial | backend | — |
| S10 Ranking | 2026-11-13 | partial | backend; extra stats (losses, streak, sets) | Long names and "100 %" broke the row at 390 px: names now wrap to two lines and the win-rate column is wider. |
| S11 My profile | 2026-11-13 | partial | backend; Edit profile (S12) is a stub | — |
| S12 Edit profile | 2026-11-13 | partial | photo upload (backend); backend | A segmented control with four options cut "Sin indicar"; labels may now take two lines. |
| S13 Another player's profile | 2026-11-13 | partial | backend; follow (could) | Match cards showed "Jugado" from the viewer's side; they now show that player's win or loss. |
| S14 Settings | 2026-11-13 | partial | notification settings; delete account (backend) | — |
| S15 Notifications | 2026-11-13 | partial | real push (backend + Expo push) | — |
| S16 Search players | 2026-11-13 | partial | backend | — |
| S17 Tournaments | 2026-11-13 | partial | backend | Invitations waiting for me sit on top, with accept and decline. |
| S18 Create tournament | 2026-11-13 | partial | backend | — |
| S19 Tournament detail | 2026-11-13 | partial | backend; reschedule a tournament match (could) | It holds every state: open, invited, waiting for my partner, confirmed, drawn with my next match, finished with champions, cancelled. The organizer also gets cancel. |
| S20 Register a pair | 2026-11-13 | partial | backend | The partner is picked from a list, never typed, because names are not unique. Players already in a pair are shown but disabled. |
| S21 Bracket | 2026-11-13 | partial | backend | — |

## Core loop (scripted click-through)

1. **S05:** lists my upcoming matches and the open ones.
2. **Keyboard:** Tab reaches "Crear partido" with a visible focus ring, and Enter opens S06.
3. **S06:** creates a match for tomorrow at 19:30 on court 3, and lands on its S07.
4. **S09:** shows the finished match as "Falta el resultado".
5. **S07 → S08:** enter 6-3 6-2, and S07 shows it waiting for the other team.
6. **S15 → S07:** the other team's result is confirmed from its notification.
7. **S07:** joins an open match, and sends a request for one outside my level range.
8. **S10:** shows the ranking by season and all time.
9. **S11:** shows the profile.
10. **S14:** switches to English, and signing out lands on S01.
11. **S02 and S03:** sign-up shows every field error at once, a wrong password shows an error, and the right one signs in.

## Batch 2 (scripted click-through, `replica/tests/batch2-flow.mjs`)

The 6 steps pass with 0 console errors, and the batch 1 core loop still passes all 11 steps:

1. **S16 → S13:** search "eva" and open her profile.
2. **S12:** change name, hand and side; S11 shows them.
3. **S17:** accepting the last pending invitation fills the cap. The draw runs on its own, and S19 shows "Tu próximo partido" and "Ver cuadro". S21 shows the semi-finals.
4. **S15:** shows the draw and the new tournament match.
5. **S18 → S19 → S20:** create a tournament, invite Marc, and S19 waits for him.
6. **Organizer:** settles both semi-finals and the final of a running tournament (S07 and S08 in organizer mode). The winners move on, and S21 and S19 name the champions.

Found and fixed in batch 2:
- **Toast over the main action:** the toast sat right on top of a screen's main footer button and caught taps for 3 seconds; it is how "Inscribirme con pareja" stopped responding.
  - **Position:** it now shows under the header.
  - **Taps:** it lets touches through.
  - **Spec:** `components.md` is updated.
- **Tournament matches in S07:** they now show the tournament (with a link), and the organizer's "Fijar resultado" button.
- **Tournament notifications:** they open the tournament.
- **Ranking rows:** they open the player.

Not built (not requested for this batch):
- **S04:** the level questionnaire.
- **Join requests:** declining one.
- **Tournament matches:** rescheduling one.
- **Push:** the reminder push and the 7-day host push, both of which need the backend.

## Decisions in this batch

- **Repository:** the project got its own git repository (`main` plus this branch), because git used to see it inside the home folder's repository.
- **i18n:** a typed dictionary (`src/i18n/`) instead of i18next. If a key is missing in English, the type check fails. Plurals use `Intl.PluralRules`. The language follows the phone, and then the profile's choice.
- **Clock in screens:** they read the time through `useNow()`, never during rendering (React Compiler rule).
- **Web preview:** `web.output` is `single`, not `server`, because server rendering caused a hydration mismatch with the theme.

## Next

- **Every screen in the inventory now exists.** S04 is still a placeholder.
- **`/replica-backend`:** this is what turns the `partial` rows into `yes`.
- **Small items before or after it:** the S04 questionnaire, declining a join request, rescheduling a tournament match.
