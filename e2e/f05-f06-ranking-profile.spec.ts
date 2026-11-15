// F05 Ranking (S10) and F06 Edit profile (S11 -> S12 -> S11), plus S13 and S16.
import { expect, field, openApp, seeText, signOut, tab, tap, test } from './fixtures';

test.describe('F05 ranking', () => {
  test.beforeEach(async ({ page }) => openApp(page));

  test('F05-H1 ranking by season and all time, rows open the player', async ({ page }) => {
    await tab(page, 'Ranking').click();
    await expect(page.getByRole('button', { name: /^Puesto 1, / })).toBeVisible();
    await tap(page, 'Total');
    await expect(page.getByRole('button', { name: /^Puesto 1, / })).toBeVisible();
    await tap(page, /^Puesto 1, Eva Nowak/);
    await seeText(page, 'Partidos recientes');
  });

  test('F05-E1 only competitive confirmed matches count (the friendly of Sara, Ola, Kasia, Tomek does not)', async ({ page }) => {
    await tab(page, 'Ranking').click();
    // Ola lost her 4 competitive matches and won the friendly with Sara: 4 played, 0 won
    await expect(page.getByRole('button', { name: /Ola Lewandowska, 4 PJ, 0 PG, 0\s?%/ })).toBeVisible();
  });

  test('F05-E2 a new player with no matches is not ranked', async ({ page }) => {
    await signOut(page);
    await tap(page, 'Crear cuenta');
    await field(page, 'Nombre').fill('Recién Llegada');
    await field(page, 'Correo').fill('nueva@example.com');
    await field(page, 'Contraseña').fill('padel1234');
    await tap(page, 'Crear cuenta', 'last');
    await seeText(page, 'Partidos abiertos');
    await tab(page, 'Ranking').click();
    await expect(page.getByRole('button', { name: /^Puesto 1, / })).toBeVisible();
    await expect(page.getByRole('button', { name: /Recién Llegada/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Puesto \d+, / })).toHaveCount(12);
  });
});

test.describe('F06 edit profile', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await tab(page, 'Perfil').click();
    await tap(page, 'Editar perfil');
    await seeText(page, 'Mano con la que juegas');
  });

  test('F06-H1 name with accents, hand and side are saved and shown', async ({ page }) => {
    await field(page, 'Nombre').fill('Ana Gª Muñoz-Żak');
    await tap(page, 'Izquierda');
    await tap(page, 'Revés');
    await tap(page, 'Guardar cambios');
    await seeText(page, 'Perfil guardado');
    await seeText(page, 'Ana Gª Muñoz-Żak');
    await seeText(page, /Mano: izquierda/);
    await seeText(page, /Lado: revés/);
  });

  test('F06-E1 an empty name is refused and nothing is saved', async ({ page }) => {
    await field(page, 'Nombre').fill('   ');
    await tap(page, 'Guardar cambios');
    await seeText(page, 'Escribe un nombre de hasta 40 caracteres.');
    await expect(page.getByText('Perfil guardado')).toHaveCount(0);
  });

  test('F06-E2 a long name is cut at 40 characters', async ({ page }) => {
    await field(page, 'Nombre').fill('N'.repeat(60));
    await expect(field(page, 'Nombre')).toHaveValue('N'.repeat(40));
  });

  test('F06-E3 leaving without saving keeps the old name', async ({ page }) => {
    await field(page, 'Nombre').fill('Nombre sin guardar');
    await page.goBack();
    await seeText(page, 'Ana García');
    await expect(page.getByText('Nombre sin guardar')).toHaveCount(0);
  });
});

test.describe('S16 search and S13 player', () => {
  test('S16-H1 search ignores accents and case; no match shows the empty state', async ({ page }) => {
    await openApp(page);
    await tap(page, 'Buscar jugadores');
    await field(page, 'Buscar por nombre').fill('LUCIA');
    await expect(page.getByRole('button', { name: 'Lucía Pérez' })).toBeVisible();
    await field(page, 'Buscar por nombre').fill('zzz');
    await seeText(page, 'Nadie con ese nombre');
  });

  test('S13-N1 a player that does not exist says so', async ({ page }) => {
    await openApp(page, '/player/p_nadie');
    await seeText(page, 'No encontramos a este jugador.');
  });
});
