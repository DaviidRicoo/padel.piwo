// F04 Enter a result: S07 -> S08 -> S07 -> S09. Seed: m_seed_15 finished with no result
// (Marc+Ana vs Diego+Jan), m_seed_14 sent by Eva's team for Ana to confirm, m_seed_13 sent
// 8 days ago by Ana's partner (Ana can confirm as host).
import { bump, expect, navigate, openApp, seeText, signInAs, stepperValue, tab, tap, tapAndConfirm, test, type Page } from './fixtures';

/** A common-score chip of one set ("6-3"), by its visible text. */
const quick = (page: Page, set: number, score: string) =>
  page
    .getByRole('radiogroup', { name: `Resultados habituales, Set ${set}` })
    .filter({ visible: true })
    .last()
    .getByRole('radio', { name: new RegExp(`^${score},`) });

async function enter(page: Page, sets: [number, number][]) {
  await openApp(page, '/match/m_seed_15');
  await tap(page, 'Introducir resultado');
  await seeText(page, 'Enviar resultado');
  if (sets.length === 3) await tap(page, 'Añadir tercer set');
  for (const [i, [a, b]] of sets.entries()) {
    await bump(page, `Set ${i + 1}, Equipo A`, a);
    await bump(page, `Set ${i + 1}, Equipo B`, b);
  }
}

const levelOnProfile = async (page: Page) => {
  await navigate(page, '/profile');
  const chip = page.getByText(/^\d,\d\d$/).filter({ visible: true }).first();
  await expect(chip).toBeVisible();
  return Number((await chip.innerText()).replace(',', '.'));
};

test.describe('F04 enter and confirm a result', () => {
  test('F04-H1 Ana sends 6-3 6-2, a rival confirms, both see it in Recientes', async ({ page }) => {
    await enter(page, [
      [6, 3],
      [6, 2],
    ]);
    await tap(page, 'Enviar resultado');
    await seeText(page, 'Falta que el otro equipo lo confirme.');
    await expect(page.getByRole('button', { name: 'Confirmar resultado' })).toHaveCount(0);
    await signInAs(page, 'diego');
    await tab(page, 'Recientes').click();
    await tap(page, /Pista 2, Competitivo, .*Por confirmar/);
    await tap(page, 'Confirmar resultado');
    await seeText(page, 'Resultado confirmado');
    await page.goBack();
    await expect(page.getByRole('button', { name: /Pista 2, Competitivo, 6-3 6-2, Derrota/ })).toBeVisible();
  });

  test('F04-H2 6-3 6-2 in five taps with the common scores', async ({ page }) => {
    await openApp(page, '/');
    await tab(page, 'Recientes').click();
    await tap(page, /Falta el resultado/); // 1
    await tap(page, 'Introducir resultado'); // 2
    await quick(page, 1, '6-3').click(); // 3
    await quick(page, 2, '6-2').click(); // 4
    await expect(quick(page, 1, '6-3')).toHaveAttribute('aria-checked', 'true');
    expect(await stepperValue(page, 'Set 1, Equipo A')).toBe(6);
    expect(await stepperValue(page, 'Set 1, Equipo B')).toBe(3);
    await tap(page, 'Enviar resultado'); // 5
    await seeText(page, 'Falta que el otro equipo lo confirme.');
    await signInAs(page, 'diego');
    await tab(page, 'Recientes').click();
    await expect(page.getByRole('button', { name: /Pista 2, Competitivo, 6-3 6-2, Por confirmar/ })).toBeVisible();
  });

  test('F04-H3 a set the other team won, then fine-tuned with the counters', async ({ page }) => {
    await openApp(page, '/match/m_seed_15');
    await tap(page, 'Introducir resultado');
    // keyboard: Space picks a chip (BUG-005)
    await quick(page, 1, '4-6').focus();
    await page.keyboard.press('Space');
    await expect(quick(page, 1, '4-6')).toHaveAccessibleName(/^4-6, gana Equipo B/);
    expect(await stepperValue(page, 'Set 1, Equipo A')).toBe(4);
    expect(await stepperValue(page, 'Set 1, Equipo B')).toBe(6);
    // 6-7 by chip, then the counter takes it to 8-6 style scores the chips do not have
    await quick(page, 2, '6-7').click();
    await bump(page, 'Set 2, Equipo B', -1);
    await expect(page.getByRole('radiogroup', { name: 'Resultados habituales, Set 2' }).locator('[aria-checked="true"]')).toHaveCount(0);
    await expect(quick(page, 2, '6-6')).toHaveCount(0);
    await seeText(page, 'Un set no puede acabar en empate.');
  });

  test('F04-E1 a tied set is refused straight away', async ({ page }) => {
    await enter(page, [
      [6, 6],
      [6, 2],
    ]);
    await seeText(page, 'Un set no puede acabar en empate.');
    await tap(page, 'Enviar resultado');
    await expect(page.getByText('Resultado enviado. Falta que lo confirme el otro equipo.')).toHaveCount(0);
  });

  test('F04-E2 one set each needs a third; with it the result goes through', async ({ page }) => {
    await enter(page, [
      [6, 3],
      [2, 6],
    ]);
    await tap(page, 'Enviar resultado');
    await seeText(page, 'Con estos sets no gana nadie: añade el tercero.');
    await tap(page, 'Añadir tercer set');
    await bump(page, 'Set 3, Equipo A', 10);
    await bump(page, 'Set 3, Equipo B', 8);
    await tap(page, 'Enviar resultado');
    await seeText(page, 'Falta que el otro equipo lo confirme.');
  });

  test('F04-E3 the rival disputes; anyone in the match can then send a new one', async ({ page }) => {
    await enter(page, [
      [6, 1],
      [6, 1],
    ]);
    await tap(page, 'Enviar resultado');
    await seeText(page, 'Falta que el otro equipo lo confirme.');
    await signInAs(page, 'diego');
    await tab(page, 'Recientes').click();
    await tap(page, /Pista 2, Competitivo, .*Por confirmar/);
    await tapAndConfirm(page, 'No es correcto');
    await seeText(page, 'Has marcado el resultado como incorrecto');
    await seeText(page, 'El resultado se marcó como incorrecto. Cualquiera del partido puede enviar uno nuevo.');
    await expect(page.getByRole('button', { name: 'Enviar un resultado nuevo' })).toBeVisible();
    await signInAs(page, 'ana');
    await tap(page, /^Avisos/);
    await seeText(page, 'Diego Martín dice que el resultado no es correcto');
  });

  test('F04-E4 the partner of whoever sent it cannot confirm it', async ({ page }) => {
    await enter(page, [
      [6, 4],
      [6, 4],
    ]);
    await tap(page, 'Enviar resultado');
    await seeText(page, 'Falta que el otro equipo lo confirme.');
    await signInAs(page, 'marc');
    await tab(page, 'Recientes').click();
    await tap(page, /Pista 2, Competitivo, .*Por confirmar/);
    await seeText(page, 'Falta que el otro equipo lo confirme.');
    await expect(page.getByRole('button', { name: 'Confirmar resultado' })).toHaveCount(0);
  });

  test('F04-E5 after 7 days with no answer the host confirms it', async ({ page }) => {
    await openApp(page, '/match/m_seed_13');
    await seeText(page, 'Han pasado 7 días y el otro equipo no lo ha confirmado.');
    await tap(page, 'Confirmar como organizador');
    await seeText(page, 'Resultado confirmado');
    await expect(page.getByRole('button', { name: 'Confirmar como organizador' })).toHaveCount(0);
  });

  test('F04-E6 a competitive loss lowers the level once confirmed', async ({ page }) => {
    await openApp(page);
    const before = await levelOnProfile(page);
    await openApp(page, '/match/m_seed_14');
    await tap(page, 'Confirmar resultado');
    await seeText(page, 'Resultado confirmado');
    const after = await levelOnProfile(page);
    expect(after).toBeLessThan(before);
  });

  test('F04-E7 a result already sent cannot be sent again by the other team', async ({ page }) => {
    await openApp(page, '/match/m_seed_14/result');
    await seeText(page, 'Todavía no se puede enviar el resultado.');
  });

  test('F04-E8 a match that has not started takes no result', async ({ page }) => {
    await openApp(page, '/match/m_seed_16');
    await seeText(page, 'Organiza Ana García');
    await expect(page.getByRole('button', { name: 'Introducir resultado' })).toHaveCount(0);
    await openApp(page, '/match/m_seed_16/result');
    await seeText(page, 'Todavía no se puede enviar el resultado.');
  });
});
