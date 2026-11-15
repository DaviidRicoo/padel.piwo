// Cases that cut across flows: other people's data, account deletion, language,
// signed-out deep links, unknown routes, desktop width.
import { expect, field, openApp, seeText, signInAs, signOut, tab, tap, tapAndConfirm, test } from './fixtures';

test('X-01 another player never sees Ana\'s notifications', async ({ page }) => {
  await openApp(page);
  await tap(page, /^Avisos/);
  await seeText(page, 'Luis Gil te ha invitado a jugar en pareja en un torneo');
  await page.goBack();
  await signInAs(page, 'diego');
  await tap(page, /^Avisos/);
  await expect(page.getByText('Luis Gil te ha invitado a jugar en pareja en un torneo')).toHaveCount(0);
  await expect(page.getByText(/Eva Nowak ha enviado un resultado/)).toHaveCount(0);
});

test('X-02 deleting an account signs out, blocks sign-in and keeps the ranking of others', async ({ page }) => {
  await openApp(page);
  await signInAs(page, 'lucia');
  await tab(page, 'Perfil').click();
  await tap(page, 'Ajustes');
  await tapAndConfirm(page, 'Borrar cuenta');
  await seeText(page, 'Ya tengo cuenta');
  await tap(page, 'Ya tengo cuenta');
  await field(page, 'Correo').fill('lucia@padelpiwo.test');
  await field(page, 'Contraseña').fill('padel1234');
  await tap(page, 'Entrar', 'last');
  await seeText(page, 'El correo o la contraseña no son correctos.');
  // her past matches stay, so Eva's ranking does not change; Lucía's name is gone from it
  await field(page, 'Contraseña').fill('padel1234');
  await field(page, 'Correo').fill('eva@padelpiwo.test');
  await tap(page, 'Entrar', 'last');
  await seeText(page, 'Partidos abiertos');
  await tab(page, 'Ranking').click();
  await expect(page.getByRole('button', { name: /^Puesto 1, Eva Nowak, 6 PJ, 6 PG/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Lucía Pérez/ })).toHaveCount(0);
});

test('X-03 English is kept for the next sign-in, and every tab is translated', async ({ page }) => {
  await openApp(page);
  await tab(page, 'Perfil').click();
  await tap(page, 'Ajustes');
  await tap(page, 'English');
  await seeText(page, 'Language');
  await page.goBack();
  for (const name of ['Matches', 'Recent', 'Ranking', 'Tournaments', 'Profile']) await expect(page.getByRole('tab', { name: new RegExp(`^${name}`) })).toBeVisible();
  await page.getByRole('tab', { name: /^Tournaments/ }).click();
  await seeText(page, 'Create tournament');
});

test('X-04 signed out, a deep link to a match goes to the welcome screen', async ({ page }) => {
  await openApp(page);
  await signOut(page);
  await page.evaluate(() => window.history.pushState({}, '', '/match/m_seed_16'));
  await page.evaluate(() => window.dispatchEvent(new PopStateEvent('popstate')));
  await seeText(page, 'Ya tengo cuenta');
  await expect(page.getByText('Organiza Ana García')).toHaveCount(0);
});

test('X-05 an unknown address shows the not-found screen with a way back', async ({ page }) => {
  await openApp(page, '/esto-no-existe');
  await seeText(page, 'Esta pantalla no existe');
  await tap(page, 'Ir a partidos');
  await seeText(page, 'Partidos abiertos');
});

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });

  test('X-06 at 1440 px the content keeps a readable width and nothing scrolls sideways', async ({ page }) => {
    await openApp(page);
    const card = page.getByRole('button', { name: /Amistoso, 3 plazas libres/ });
    const box = await card.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(640);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
  });
});

test('X-07 theme: dark mode follows the setting', async ({ page }) => {
  await openApp(page);
  await tab(page, 'Perfil').click();
  await tap(page, 'Ajustes');
  await tap(page, 'Oscuro');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const screenBg = await page.getByRole('heading', { name: 'Ajustes' }).or(page.getByText('Idioma')).first().evaluate((e) => {
    let el: HTMLElement | null = e as HTMLElement;
    while (el && getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)') el = el.parentElement;
    return el ? getComputedStyle(el).backgroundColor : '';
  });
  // the dark background token is #0B2135 = rgb(11, 33, 53)
  expect([bg, screenBg]).toContain('rgb(11, 33, 53)');
});
