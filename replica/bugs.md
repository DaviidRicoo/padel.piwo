# Bugs

Found by `/replica-test` on 2026-11-14 (build `eb11de4`, web, Microsoft Edge, 390 px, fake data layer).
Only what was reproduced is here; guesses are under "To check" in `test-plan.md`.

| | open | fixed |
| --- | --- | --- |
| S1 | 0 | 2 |
| S2 | 0 | 1 |
| S3 | 0 | 4 |
| S4 | 1 | 0 |

### BUG-008: on a phone, the app crashes on the first tap of a button

- Severity: S1 (nothing can be used on a phone)
- Flow / case: every flow
- Screen: S01 Welcome first, then every Button and tappable Card
- Build: cb879b6 + the BUG-007 fix  Browser / device: owner's iPhone, Expo Go (2026-11-15)

Steps
1. Open the app on a phone and tap "Crear cuenta" or "Entrar".

Expected: the button shrinks slightly while pressed and opens the next screen.
Actual: "TypeError: Cannot read property 'forEach' of null" in `processTransform.js`, from `Button.tsx`.
Cause: the pressed style set `transform` to a scale and, on release, to `undefined`; React Native on phones runs every transform it diffs through `processTransform`, which does not accept an empty one. react-native-web does, so the web suite never saw it.
Fix: `Button` and `Card` always set a transform, scale 1 at rest.
Status: fixed on 2026-11-15 (`design/refresh`), checked on the owner's iPhone.

### BUG-007: on an iPhone, the app does not start

- Severity: S1 (red screen before the first screen)
- Flow / case: start-up
- Screen: all
- Build: cb879b6  Browser / device: owner's iPhone, Expo Go (2026-11-15)

Steps
1. Open the app on an iPhone.

Expected: the welcome screen.
Actual: "Render Error: undefined cannot be used as a constructor" at `new Intl.PluralRules` in `src/i18n/index.tsx`.
Cause: Hermes on iOS has no `Intl.PluralRules`, and its `Intl.DateTimeFormat` has `format()` but no `formatToParts()`, which `zonedParts()` in `src/lib/time.ts` used (the next crash in line). Web and Android have both.
Fix: plurals use `count === 1` (the rule for both Spanish and English); `zonedParts()` reads the numbers of the en-GB text when `formatToParts` is missing, checked equal to `formatToParts` over 150,172 instants across two years and their clock changes.
Status: fixed on 2026-11-15 (`design/refresh`), checked on the owner's iPhone.

### BUG-006: password recovery signs the player in even when the new password is not saved

- Severity: S3 (the player lands in the app with the old password and an error about the code; typing the current password as the "new" one gave "unknown")
- Flow / case: F01 / F01-N2
- Screen: forgot password
- Build: 36a343a (code review, real Supabase layer only; the fake layer cannot show it)

Steps
1. Forgot password, enter the emailed code and, as the new password, the current one.

Expected: the player is signed in (the password they typed works).
Actual: `verifyOtp` signs the login in, `onAuthStateChange` opens the app, then `updateUser` fails with `same_password` and the screen shows an unknown error. Any other failure of `updateUser` (network) left the player signed in with the old password.
Cause: `resetPassword()` in `src/data/supabase/supabaseApi.ts` let the auth listener react to the recovery session before the password was saved.
Fix: the listener is held back while `resetPassword()` runs; `same_password` counts as success; any other failure signs the recovery session out and shows the error.
Status: fixed on 2026-11-15 (`design/refresh`), not yet tried with a real mailbox.

### BUG-005: on the web, Space does not toggle a switch or pick a chip or segment

- Severity: S3 (keyboard users must know to press Enter instead; the ARIA patterns for switch and radio use Space)
- Flow / case: F04, S14 / S14-E1, F04-H3
- Screen: S06, S08, S12, S14, S18, S20, every ChipGroup, SegmentedControl and switch row
- Build: 104fd36 + working tree (2026-11-15)  Browser / device: Edge 157 headless, 390 px

Steps
1. Open S14 Ajustes with the keyboard only.
2. Tab to the "Torneos" switch, press Space.

Expected: the switch turns off.
Actual: nothing happens; Enter works.
Evidence: react-native-web 0.21's `isValidKeyPress` (`node_modules/react-native-web/dist/modules/usePressEvents/PressResponder.js`, line 66) accepts Space only when the element is a `<button>` or has `role="button"`; switches and radios get Enter only. S14-E1 first failed with `aria-checked` still "true", but that run also pressed Space before the switches had loaded, so the source is the firm evidence.
Cause: as above.
Fix: `spaceToPress()` in `src/components/ui/focus.ts`, spread on ChipGroup chips, SegmentedControl segments and switch rows (web only; it also stops the page scrolling). While fixing it, axe found that a switch row on the web also held react-native-web's own unlabeled `<input>` (rules `label` and `nested-interactive`, S14): on the web the row now draws the track itself.
Status: fixed on 2026-11-15 (`design/refresh`); see the commit that adds S14-E1.

### BUG-002: on the web, screen readers are not told which chip is selected, and the − and + of every counter have no name

- Severity: S2 (screen reader users cannot pick a day, time, duration, language or partner with confidence, nor enter a score; no workaround for them)
- Flow / case: F02, F04, F08, S14 / A11Y
- Screen: S06, S08, S10, S12, S14, S18, S20
- Build: eb11de4  Browser / device: Edge 157 headless, 390 px

Steps
1. Open S06 Crear partido with a screen reader, or run axe.
2. Move to the "Hora" chips, then to the "Nivel permitido" counters.

Expected: each chip says "selected" or "not selected"; each counter says its value and its − and + buttons have names.
Actual: 51 `aria-required-attr` violations on S06 alone (role radio with no `aria-checked`, role slider with no `aria-valuenow`). The counter buttons take keyboard focus but are read as an unnamed "group".
Evidence: `e2e/a11y.spec.ts` (S06, S08, S10, S12, S14, S18, S20, light and dark); axe rule `aria-required-attr`.
Suspected cause: react-native-web 0.21 ignores `accessibilityState` and `accessibilityValue`; it reads the `aria-*` props.
Fix: `aria-checked`, `aria-disabled`, `aria-busy`, `aria-value*` props in ChipGroup, SegmentedControl, Button, ListItem, ProgressBar, SelectField, PlayerSlot and PlayerRow (React Native reads them on phones too). The Stepper stays one "adjustable" element on phones; on the web it is a named group with "Bajar: …" and "Subir: …" buttons and a live value.
Status: fixed in b3630ff (`design/refresh`); the a11y suite now passes on all 19 screens in both themes.

### BUG-001: a name that ends in an emoji shows half a character in the avatar

- Severity: S3 (visibly wrong; the name itself is fine)
- Flow / case: F01 / F01-H1
- Screen: S11, and every avatar of that player
- Build: eb11de4  Browser / device: Edge 157 headless, 390 px

Steps
1. Sign up with the name "Zoë Núñez-Łukasz 🎾".
2. Open Perfil.

Expected: initials "ZN".
Actual: "Z" followed by a replacement character (half of the emoji's surrogate pair).
Evidence: `e2e/results/.../test-failed-1.png` from the first run; test F01-H1.
Suspected cause: `initials()` took `word[0]`, a UTF-16 code unit, from the first and last words.
Fix: take the first letter (`\p{L}`) of the first and last words that have one.
Status: fixed in b3630ff (`design/refresh`).

### BUG-004: a match card's spoken name repeats its status and leaves out the score

- Severity: S3 (screen reader users hear "Falta el resultado, Falta el resultado" and must open each match in Recientes to learn the score)
- Flow / case: F04 / A11Y
- Screen: S05, S09, S11, S13
- Build: eb11de4  Browser / device: Edge 157 headless, 390 px

Steps
1. Open Recientes with a screen reader.
2. Move to the match from two hours ago, then to a played match.

Expected: "…, Falta el resultado" once; a played match says its score, e.g. "6-4 7-6, Por confirmar".
Actual: "…, Competitivo, Falta el resultado, Falta el resultado"; played matches say "Victoria" with no score.
Evidence: aria-labels read in the axe probe of S09.
Fix: `MatchCard` adds the score and drops repeated parts.
Status: fixed in b3630ff (`design/refresh`).

### BUG-003: cards and rows are named with a summary that leaves out some visible text

- Severity: S4 (WCAG 2.5.3 Label in Name; affects voice control on the web build)
- Flow / case: A11Y
- Screen: S05, S09, S10, S11, S13, S15, S16, S17, S21
- Build: eb11de4  Browser / device: Edge 157 headless, 390 px

Steps
1. Run axe with the rule `label-content-name-mismatch` on S10 Ranking.

Expected: each row's accessible name contains the text shown in it.
Actual: "Puesto 1, Eva Nowak, 6 PJ, 6 PG, 100 %" while the row shows "1 EN Eva Nowak 5,64 6 6 100 %": the avatar initials and the level are not in the name. The same on match cards ("VS", initials, "90 min"), search rows (the level) and notifications (initials).
Evidence: `e2e/a11y.spec.ts`, test "BUG-003 …" (marked `test.fixme`).
Suspected cause: the summaries were written for screen readers; avatar initials are visible text inside the card.
Fix idea: hide the avatar initials from the accessibility tree (the avatar already has the name as its label) and add the level to row names.
Status: open.
