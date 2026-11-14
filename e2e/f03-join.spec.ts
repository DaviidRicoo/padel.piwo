// F03 Join a match: S05 -> S07 -> join. Seed: Luis's friendly (3 free), Eva's 4.8-7 (1 free),
// Lucía's cancelled match m_seed_21, Ana's own match tomorrow m_seed_16.
import { expect, openApp, seeText, signInAs, tap, tapAndConfirm, test } from './fixtures';

test.describe('F03 join a match', () => {
  test.beforeEach(async ({ page }) => openApp(page));

  test('F03-H1 join a friendly: a slot fills and it moves to "my upcoming matches"', async ({ page }) => {
    await tap(page, /Amistoso, 3 plazas libres/);
    await tap(page, 'Unirme al partido', 'last');
    await seeText(page, 'Te has unido al partido');
    await expect(page.getByRole('button', { name: 'Salir del partido' })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('button', { name: /10:00, Pista 1, Amistoso, 2 plazas libres/ })).toBeVisible();
  });

  test('F03-E1 outside the level range: a request, and the host accepts it', async ({ page }) => {
    await tap(page, /Pista 2, Competitivo, 1 plaza libre/);
    await tap(page, 'Unirme al partido', 'last');
    await seeText(page, 'Tu nivel está fuera del rango. Hemos enviado tu solicitud al organizador.');
    await seeText(page, 'Esperando a que el organizador acepte tu solicitud.');
    await signInAs(page, 'eva');
    await tap(page, /^Avisos/);
    await tap(page, /Ana García quiere unirse a tu partido/);
    await seeText(page, 'Solicitudes');
    await tap(page, 'Aceptar');
    await seeText(page, 'Solicitud aceptada');
    await expect(page.getByRole('img', { name: 'Ana García' }).first()).toBeVisible();
  });

  test('F03-E2 a cancelled match cannot be joined', async ({ page }) => {
    await openApp(page, '/match/m_seed_21');
    await seeText(page, 'Este partido se canceló.');
    await expect(page.getByRole('button', { name: 'Unirme al partido', exact: true })).toHaveCount(0);
    // the three empty slots stay, but cannot be tapped
    const slots = page.getByRole('button', { name: /^Unirme al partido, Equipo/ });
    await expect(slots).toHaveCount(3);
    for (const slot of await slots.all()) await expect(slot).toHaveAttribute('aria-disabled', 'true');
  });

  test('F03-E3 a double tap on join joins once, with no error', async ({ page }) => {
    await tap(page, /Amistoso, 3 plazas libres/);
    await page.getByRole('button', { name: 'Unirme al partido' }).last().dblclick();
    await seeText(page, 'Te has unido al partido');
    await expect(page.getByText('Ya estás en este partido.')).toHaveCount(0);
    await page.goBack();
    await expect(page.getByRole('button', { name: /10:00, Pista 1, Amistoso, 2 plazas libres/ })).toBeVisible();
  });

  test('F03-E4 leave a match: the slot is free again; the host cannot leave, only cancel', async ({ page }) => {
    await tap(page, /Amistoso, 3 plazas libres/);
    await tap(page, 'Unirme al partido', 'last');
    await seeText(page, 'Te has unido al partido');
    await tapAndConfirm(page, 'Salir del partido');
    await seeText(page, 'Has salido del partido');
    await expect(page.getByRole('button', { name: 'Unirme al partido' }).last()).toBeVisible();
    await openApp(page, '/match/m_seed_16');
    await seeText(page, 'Organiza Ana García');
    await expect(page.getByRole('button', { name: 'Salir del partido' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Cancelar partido' })).toBeVisible();
  });

  test('F03-E5 the host cancels: players are told and the match shows as cancelled', async ({ page }) => {
    await openApp(page, '/match/m_seed_16');
    await tapAndConfirm(page, 'Cancelar partido');
    await seeText(page, 'Partido cancelado');
    await seeText(page, 'Este partido se canceló.');
    await signInAs(page, 'marc');
    await tap(page, /^Avisos/);
    await seeText(page, 'Se ha cancelado un partido en el que estabas');
  });

  test('F03-E6 keyboard only: Tab to a match, Enter opens it, Tab to join, Enter joins', async ({ page }) => {
    const card = page.getByRole('button', { name: /Amistoso, 3 plazas libres/ });
    for (let i = 0; i < 40 && !(await card.evaluate((e) => e === document.activeElement)); i++) await page.keyboard.press('Tab');
    await expect(card).toBeFocused();
    await page.keyboard.press('Enter');
    await seeText(page, 'Organiza Luis Gil');
    const join = page.getByRole('button', { name: 'Unirme al partido' }).last();
    for (let i = 0; i < 40 && !(await join.evaluate((e) => e === document.activeElement)); i++) await page.keyboard.press('Tab');
    await expect(join).toBeFocused();
    await page.keyboard.press('Enter');
    await seeText(page, 'Te has unido al partido');
  });

  test('F03-N1 a match that does not exist says so', async ({ page }) => {
    await openApp(page, '/match/no-existe');
    await seeText(page, 'No encontramos este partido.');
  });
});
