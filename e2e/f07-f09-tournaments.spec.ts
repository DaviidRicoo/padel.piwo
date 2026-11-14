// F07 create a tournament, F08 register as a pair, F09 play it.
// Seed: "Copa de otoño" (Marc, 3 of 4 pairs, Luis invited Ana), "Liga relámpago"
// (Ana organizes and plays, semifinal 2 pending), "Torneo de la cerveza" (finished).
import { bump, expect, field, openApp, seeText, signInAs, tab, tap, tapAndConfirm, test, type Page } from './fixtures';

async function createTournament(page: Page, name: string, players: '8' | '16' | '32' = '8') {
  await tab(page, 'Torneos').click();
  await tap(page, 'Crear torneo');
  await seeText(page, 'Días por ronda');
  await field(page, 'Nombre del torneo').fill(name);
  await tap(page, `${players} jugadores`);
  await tap(page, 'Crear torneo', 'last');
  await seeText(page, 'Inscribirme con pareja');
}

async function invite(page: Page, partner: string, query: string) {
  await tap(page, 'Inscribirme con pareja');
  await field(page, 'Buscar compañero').fill(query);
  await tap(page, partner);
  await tap(page, 'Enviar invitación');
  await seeText(page, `Esperando a que ${partner} acepte la invitación.`);
}

test.describe('F07 create a tournament', () => {
  test.beforeEach(async ({ page }) => openApp(page));

  test('F07-H1 a 16-player tournament: S19 shows it open with 0 of 8 pairs', async ({ page }) => {
    await createTournament(page, 'Copa de invierno ❄️', '16');
    await seeText(page, 'Organiza Ana García');
    await seeText(page, 'Aún no hay parejas inscritas.');
    await page.goBack();
    await expect(page.getByRole('button', { name: /Copa de invierno ❄️, .*16 jugadores, Inscripción, 0 de 8 parejas/ })).toBeVisible();
  });

  test('F07-E1 a one-letter name is refused', async ({ page }) => {
    await tab(page, 'Torneos').click();
    await tap(page, 'Crear torneo');
    await field(page, 'Nombre del torneo').fill('X');
    await tap(page, 'Crear torneo', 'last');
    await seeText(page, 'Escribe un nombre de al menos 2 caracteres.');
  });

  test('F07-E2 the organizer cancels with a pair invited: the partner is told', async ({ page }) => {
    await createTournament(page, 'Copa cancelada');
    await invite(page, 'Marc Ruiz', 'mar');
    await tapAndConfirm(page, 'Cancelar torneo');
    await seeText(page, 'Torneo cancelado');
    await seeText(page, 'Este torneo se canceló.');
    await signInAs(page, 'marc');
    await tab(page, 'Torneos').click();
    await expect(page.getByText(/te ha invitado a jugar en pareja en «Copa cancelada»/)).toHaveCount(0);
    await tab(page, 'Partidos').click();
    await tap(page, /^Avisos/);
    await seeText(page, 'Se ha cancelado un torneo en el que estabas');
  });
});

test.describe('F08 register as a pair', () => {
  test.beforeEach(async ({ page }) => openApp(page));

  test('F08-H1 Ana invites Marc, Marc accepts, both see the pair confirmed', async ({ page }) => {
    await createTournament(page, 'Copa de parejas');
    await invite(page, 'Marc Ruiz', 'MARC');
    await signInAs(page, 'marc');
    await tab(page, 'Torneos').click();
    await seeText(page, 'Ana García te ha invitado a jugar en pareja en «Copa de parejas».');
    await tap(page, 'Aceptar');
    await seeText(page, 'Invitación aceptada');
    await tap(page, /^Copa de parejas/);
    await seeText(page, 'Estás inscrito con Ana García.');
  });

  test('F08-E1 players already in a pair cannot be picked', async ({ page }) => {
    await openApp(page, '/tournament/t_seed_autumn/register');
    await seeText(page, 'Enviar invitación');
    await field(page, 'Buscar compañero').fill('diego');
    const diego = page.getByRole('radio', { name: /Diego Martín, Ya está inscrito en este torneo/ });
    await expect(diego).toBeVisible();
    await expect(diego).toBeDisabled();
  });

  test('F08-E2 Ana declines Luis: the invitation goes and Luis is told', async ({ page }) => {
    await tab(page, 'Torneos').click();
    await seeText(page, 'Luis Gil te ha invitado a jugar en pareja en «Copa de otoño».');
    await tap(page, 'Rechazar');
    await seeText(page, 'Invitación rechazada');
    await expect(page.getByText('Luis Gil te ha invitado a jugar en pareja en «Copa de otoño».')).toHaveCount(0);
    await signInAs(page, 'luis');
    await tap(page, /^Avisos/);
    await seeText(page, 'Ana García no puede jugar contigo en el torneo');
  });

  test('F08-E3 withdraw before the draw, then register again', async ({ page }) => {
    await createTournament(page, 'Copa de ida y vuelta');
    await invite(page, 'Marc Ruiz', 'marc');
    await tapAndConfirm(page, 'Retirar pareja');
    await seeText(page, 'Pareja retirada');
    await seeText(page, 'Aún no hay parejas inscritas.');
    await invite(page, 'Eva Nowak', 'eva');
  });

  test('F08-E4 the cap fills while an invitation is pending: that invitation lapses', async ({ page }) => {
    // Lucía invites Kasia to the Copa de otoño (3 of 4 confirmed); then Ana accepts Luis and fills it
    await signInAs(page, 'lucia');
    await tab(page, 'Torneos').click();
    await tap(page, /^Copa de otoño/);
    await invite(page, 'Kasia Wójcik', 'kasia');
    await signInAs(page, 'ana');
    await tab(page, 'Torneos').click();
    await tap(page, 'Aceptar');
    await seeText(page, 'Invitación aceptada');
    await signInAs(page, 'lucia');
    await tab(page, 'Torneos').click();
    await tap(page, /^Copa de otoño/);
    await seeText(page, 'En curso');
    await expect(page.getByText('Esperando a que Kasia Wójcik acepte la invitación.')).toHaveCount(0);
    await expect(page.getByText(/Kasia/)).toHaveCount(0);
  });

  test('F08-E5 nobody can pick themselves as partner', async ({ page }) => {
    await createTournament(page, 'Copa en solitario');
    await tap(page, 'Inscribirme con pareja');
    await field(page, 'Buscar compañero').fill('ana');
    await expect(page.getByRole('radio', { name: /^Ana García/ })).toHaveCount(0);
  });
});

test.describe('F09 play the tournament', () => {
  test.beforeEach(async ({ page }) => openApp(page));

  test('F09-H1 the last acceptance draws the bracket and creates the semifinals', async ({ page }) => {
    await tab(page, 'Torneos').click();
    await tap(page, 'Aceptar');
    await seeText(page, 'Invitación aceptada');
    await tap(page, /^Copa de otoño/);
    await seeText(page, 'Tu próximo partido');
    await tap(page, 'Ver cuadro');
    await expect(page.getByRole('button', { name: /^Semifinal 1:/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Semifinal 2:/ })).toBeVisible();
    await seeText(page, 'Final');
  });

  test('F09-E1 a tournament match cannot be left or cancelled', async ({ page }) => {
    await openApp(page, '/match/m_t_flash_s2');
    await seeText(page, /Partido de torneo · Liga relámpago/);
    await expect(page.getByRole('button', { name: 'Salir del partido' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Cancelar partido' })).toHaveCount(0);
  });

  test('F09-E2 the organizer settles the semifinal and the final; champions are named', async ({ page }) => {
    await openApp(page, '/tournament/t_seed_flash/bracket');
    await tap(page, /^Semifinal 2:/);
    await tap(page, 'Fijar resultado como organizador');
    await seeText(page, 'Como organizador, este resultado cuenta directamente, sin confirmación.');
    await bump(page, 'Set 1, Equipo A', 6);
    await bump(page, 'Set 1, Equipo B', 3);
    await bump(page, 'Set 2, Equipo A', 6);
    await bump(page, 'Set 2, Equipo B', 4);
    await tap(page, 'Enviar resultado');
    await seeText(page, 'Resultado fijado');
    await page.goBack();
    await tap(page, /^Final 1:/);
    await tap(page, 'Fijar resultado como organizador');
    await bump(page, 'Set 1, Equipo A', 6);
    await bump(page, 'Set 1, Equipo B', 2);
    await bump(page, 'Set 2, Equipo A', 7);
    await bump(page, 'Set 2, Equipo B', 5);
    await tap(page, 'Enviar resultado');
    await seeText(page, 'Resultado fijado');
    await page.goBack();
    await seeText(page, 'Campeones');
  });

  test('F09-E3 a pair disputes a tournament result; the organizer can still settle it', async ({ page }) => {
    await signInAs(page, 'sara');
    await tab(page, 'Torneos').click();
    await tap(page, /^Liga relámpago/);
    await seeText(page, 'Tu próximo partido');
    await openApp(page, '/tournament/t_seed_flash/bracket');
    // the match is in two days: no result yet, but the organizer can settle it any time
    await tap(page, /^Semifinal 2:/);
    await expect(page.getByRole('button', { name: 'Fijar resultado como organizador' })).toBeVisible();
  });
});
