// F02 Create a match: S05 -> S06 -> S07.
import { bump, expect, field, openApp, seeText, stepperValue, tap, test } from './fixtures';

test.describe('F02 create a match', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await tap(page, 'Crear partido');
    await seeText(page, 'Duración');
  });

  test('F02-H1 tomorrow 19:30, friendly, level 3-5: S07 shows it and S05 lists it', async ({ page }) => {
    await tap(page, /^Mañana/);
    await tap(page, '19:30');
    await tap(page, '60 min');
    await field(page, 'Lugar').fill('Pista 3 — la del fondo');
    await tap(page, 'Amistoso');
    await bump(page, 'Nivel permitido, Mínimo', 4);
    await field(page, 'Notas (opcional)').fill('Traigo bolas nuevas 🎾');
    await tap(page, 'Publicar partido');
    await seeText(page, 'Organiza Ana García');
    await seeText(page, 'Pista 3 — la del fondo');
    await seeText(page, 'Traigo bolas nuevas 🎾');
    await page.goBack();
    await expect(page.getByRole('button', { name: /19:30, Pista 3 — la del fondo, Amistoso, 3 plazas libres/ })).toBeVisible();
  });

  test('F02-E1 no time picked: the form says so and nothing is created', async ({ page }) => {
    await tap(page, 'Publicar partido');
    await seeText(page, 'Elige una hora.');
    await expect(page.getByText('Partido publicado')).toHaveCount(0);
  });

  test('F02-E2 empty place falls back to the placeholder court', async ({ page }) => {
    await tap(page, /^Mañana/);
    await tap(page, '20:00');
    await tap(page, 'Publicar partido');
    await seeText(page, 'Organiza Ana García');
    await seeText(page, 'Pista 1');
  });

  test('F02-E3 minimum level above the maximum drags the maximum up', async ({ page }) => {
    // the maximum starts at the top of the scale; bring it down to 4, then push the minimum to 8
    await bump(page, 'Nivel permitido, Máximo', -12);
    expect(await stepperValue(page, 'Nivel permitido, Máximo')).toBe(4);
    await bump(page, 'Nivel permitido, Mínimo', 14);
    expect(await stepperValue(page, 'Nivel permitido, Mínimo')).toBe(8);
    expect(await stepperValue(page, 'Nivel permitido, Máximo')).toBe(8);
  });

  test('F02-E4 a double tap on "Publicar partido" creates one match', async ({ page }) => {
    await tap(page, /^Mañana/);
    await tap(page, '21:30');
    await field(page, 'Lugar').fill('Pista doble');
    await page.getByRole('button', { name: 'Publicar partido' }).dblclick();
    await seeText(page, 'Organiza Ana García');
    await page.goBack();
    await expect(page.getByRole('button', { name: /Pista doble/ })).toHaveCount(1);
  });

  test('F02-E5 leaving the form half filled creates nothing', async ({ page }) => {
    await tap(page, /^Mañana/);
    await tap(page, '08:00');
    await field(page, 'Lugar').fill('Pista abandonada');
    await page.goBack();
    await seeText(page, 'Partidos abiertos');
    await expect(page.getByRole('button', { name: /Pista abandonada/ })).toHaveCount(0);
  });

  test('F02-E6 today: hours already gone cannot be picked', async ({ page }) => {
    const first = page.getByRole('radio', { name: '08:00' });
    // unless the test runs before 8:00 in Gdańsk, 8:00 today is in the past
    const hour = Number(new Intl.DateTimeFormat('en', { hour: 'numeric', hour12: false, timeZone: 'Europe/Warsaw' }).format(new Date()));
    test.skip(hour < 8, 'before 8:00 every slot today is still open');
    await expect(first).toBeDisabled();
  });

  test.describe('phone in another time zone', () => {
    test.use({ timezoneId: 'America/New_York' });

    test('F02-E8 a match made at 19:30 shows 19:30 Gdańsk time, wherever the phone is', async ({ page }) => {
      await tap(page, /^Mañana/);
      await tap(page, '19:30');
      await field(page, 'Lugar').fill('Pista horaria');
      await tap(page, 'Publicar partido');
      await seeText(page, 'Organiza Ana García');
      await seeText(page, /19:30/);
    });
  });

  test('F02-E7 a 120-character place is the limit', async ({ page }) => {
    await field(page, 'Lugar').fill('P'.repeat(150));
    await expect(field(page, 'Lugar')).toHaveValue('P'.repeat(120));
  });
});
