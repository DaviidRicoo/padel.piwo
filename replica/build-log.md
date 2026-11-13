# Build log: Padel & Piwo

Batch 1: the app shell and the core loop. Date: 2026-11-13. Branch: `build/shell-and-core-loop`.

Everything runs on the fake data layer (`src/data/fake/`), which applies the same rules as `replica/schema.sql` and keeps its data in memory. A reload resets it. No feature is usable by real people until `/replica-backend` swaps in Supabase behind the same `Api` interface (`src/data/api.ts`). That is why almost every feature is `partial` in `features.csv`.

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
| S12 Edit profile | — | stub | everything | — |
| S13 Another player's profile | — | stub | everything | — |
| S14 Settings | 2026-11-13 | partial | notification settings; delete account (backend) | — |
| S15 Notifications | 2026-11-13 | partial | real push (backend + Expo push) | — |
| S16 Search players | — | stub | everything | — |
| S17 Tournaments | — | stub | the whole tournament area | — |
| S18 Create tournament | — | stub | | |
| S19 Tournament detail | — | stub | | |
| S20 Register a pair | — | stub | | |
| S21 Bracket | — | stub | | |

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

## Decisions in this batch

- **Repository:** the project got its own git repository (`main` plus this branch), because git used to see it inside the home folder's repository.
- **i18n:** a typed dictionary (`src/i18n/`) instead of i18next. If a key is missing in English, the type check fails. Plurals use `Intl.PluralRules`. The language follows the phone, and then the profile's choice.
- **Clock in screens:** they read the time through `useNow()`, never during rendering (React Compiler rule).
- **Web preview:** `web.output` is `single`, not `server`, because server rendering caused a hydration mismatch with the theme.

## Next

- **Batch 2:**
  - S12 edit profile, S13 another player's profile, S16 search;
  - S04 level questionnaire;
  - decline a join request;
  - then the tournament area, S17 to S21.
- **Then `/replica-backend`:** this is what turns the `partial` rows into `yes`.
