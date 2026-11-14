// axe (WCAG 2.1 A and AA) on every screen, in light and dark, plus no sideways
// scroll at phone width. Seed ids come from src/data/fake/seed.ts.
import { a11y, expect, openApp, seeText, signOut, tap, test, type Page } from './fixtures';

const SCREENS: [id: string, path: string, ready: string | RegExp][] = [
  ['S05 partidos', '/', 'Partidos abiertos'],
  ['S06 crear partido', '/match/new', 'Duración'],
  ['S07 partido abierto', '/match/m_seed_16', 'Unirme al partido'],
  ['S07 resultado por confirmar', '/match/m_seed_14', 'Confirmar resultado'],
  ['S08 resultado', '/match/m_seed_15/result', 'Enviar resultado'],
  ['S09 recientes', '/recent', 'Por confirmar'],
  ['S10 ranking', '/ranking', 'PJ'],
  ['S11 perfil', '/profile', 'Victorias'],
  ['S12 editar perfil', '/profile-edit', 'Mano con la que juegas'],
  ['S13 jugador', '/player/p_eva', 'Partidos recientes'],
  ['S14 ajustes', '/settings', 'Idioma'],
  ['S15 avisos', '/notifications', 'Marcar todo como leído'],
  ['S16 buscar', '/search', 'Buscar por nombre'],
  ['S17 torneos', '/tournaments', 'Inscripción abierta'],
  ['S18 crear torneo', '/tournament/new', 'Días por ronda'],
  ['S19 torneo', '/tournament/t_seed_autumn', 'Parejas'],
  ['S20 inscribir pareja', '/tournament/t_seed_autumn/register', 'Enviar invitación'],
  ['S21 cuadro', '/tournament/t_seed_flash/bracket', 'Semifinal'],
];

async function check(page: Page) {
  const violations = await a11y(page);
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect.soft(violations, 'axe WCAG 2.1 AA').toEqual([]);
  expect.soft(sideways, 'no horizontal scroll at 390 px').toBe(false);
}

// BUG-003 (S4, open): cards and rows are named with a summary ("Puesto 1, Eva Nowak, 6 PJ...")
// that leaves out visible bits (avatar initials, "VS", the level). Voice-control users on the
// web cannot always say what they see. Remove the fixme once the names include the visible text.
test.fixme('BUG-003 cards and rows carry their visible text in their name (WCAG 2.5.3)', async ({ page }) => {
  for (const [, path, ready] of SCREENS) {
    await openApp(page, path);
    await seeText(page, ready, 60_000);
    expect.soft(await a11y(page, { only: ['label-content-name-mismatch'] }), path).toEqual([]);
  }
});

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`a11y ${scheme}`, () => {
    test.use({ colorScheme: scheme });

    for (const [id, path, ready] of SCREENS) {
      test(`${id}`, async ({ page }) => {
        await openApp(page, path);
        await seeText(page, ready, 60_000);
        await page.waitForTimeout(400); // let the entry fade finish, or axe measures half-faded text
        await check(page);
      });
    }

    test('S01 S02 S03 bienvenida, registro, entrar', async ({ page }) => {
      await openApp(page);
      await signOut(page);
      await page.waitForTimeout(400);
      await check(page);
      await tap(page, 'Crear cuenta');
      await seeText(page, 'Al menos 8 caracteres.');
      await check(page);
      await page.goBack();
      await tap(page, 'Ya tengo cuenta');
      await seeText(page, '¿Has olvidado la contraseña?');
      await check(page);
    });
  });
}
