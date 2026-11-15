// F01 Sign up: S01 -> S02 -> (S04 not built yet) -> S05, plus sign in (S03).
import { expect, field, openApp, SEED_PASSWORD, seeText, signOut, tab, tap, test } from './fixtures';

test.describe('F01 sign up and sign in', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await signOut(page);
  });

  test('F01-H1 a new resident signs up and lands on the matches tab', async ({ page }) => {
    await tap(page, 'Crear cuenta');
    await field(page, 'Nombre').fill('Zoë Núñez-Łukasz 🎾');
    await field(page, 'Correo').fill('  Zoe.Nueva@Example.com ');
    await field(page, 'Contraseña').fill('una-clave-larga');
    await tap(page, 'Crear cuenta', 'last');
    await seeText(page, 'Partidos abiertos');
    await tab(page, 'Perfil').click();
    await seeText(page, 'Zoë Núñez-Łukasz 🎾');
    // the starting level everyone gets until the questionnaire (S04) exists
    await seeText(page, '4,00');
    // BUG-001: initials come from the words with letters, never half of an emoji
    expect(await page.getByRole('img', { name: 'Zoë Núñez-Łukasz 🎾' }).first().innerText()).toBe('ZN');
  });

  test('F01-E1 an email already in use is rejected on the email field', async ({ page }) => {
    await tap(page, 'Crear cuenta');
    await field(page, 'Nombre').fill('Otra Ana');
    await field(page, 'Correo').fill('ANA@padelpiwo.test');
    await field(page, 'Contraseña').fill('padel1234');
    await tap(page, 'Crear cuenta', 'last');
    await seeText(page, 'Ya hay una cuenta con ese correo.');
  });

  test('F01-E2 empty form shows every problem at once', async ({ page }) => {
    await tap(page, 'Crear cuenta');
    await tap(page, 'Crear cuenta', 'last');
    await seeText(page, 'Escribe un nombre de hasta 40 caracteres.');
    await seeText(page, 'Escribe un correo válido.');
    await seeText(page, 'La contraseña necesita al menos 8 caracteres.');
  });

  test('F01-E3 a name of spaces only is refused, a long name is cut at 40', async ({ page }) => {
    await tap(page, 'Crear cuenta');
    await field(page, 'Nombre').fill('     ');
    await field(page, 'Correo').fill('espacios@example.com');
    await field(page, 'Contraseña').fill('padel1234');
    await tap(page, 'Crear cuenta', 'last');
    await seeText(page, 'Escribe un nombre de hasta 40 caracteres.');
    await field(page, 'Nombre').fill('A'.repeat(60));
    await expect(field(page, 'Nombre')).toHaveValue('A'.repeat(40));
  });

  test('F01-E4 a double tap on "Crear cuenta" makes one account and no error', async ({ page }) => {
    await tap(page, 'Crear cuenta');
    await field(page, 'Nombre').fill('Doble Toque');
    await field(page, 'Correo').fill('doble@example.com');
    await field(page, 'Contraseña').fill('padel1234');
    await page.getByRole('button', { name: 'Crear cuenta', exact: true }).last().dblclick();
    await seeText(page, 'Partidos abiertos');
    await expect(page.getByText('Ya hay una cuenta con ese correo.')).toHaveCount(0);
  });

  test('F01-E5 the back button mid-form returns to the welcome screen', async ({ page }) => {
    await tap(page, 'Crear cuenta');
    await field(page, 'Nombre').fill('A medias');
    await page.goBack();
    await seeText(page, 'Ya tengo cuenta');
  });

  test('F01-N1 a wrong password says so and keeps the email', async ({ page }) => {
    await tap(page, 'Ya tengo cuenta');
    await field(page, 'Correo').fill('ana@padelpiwo.test');
    await field(page, 'Contraseña').fill('no-es-esta');
    await tap(page, 'Entrar', 'last');
    await seeText(page, 'El correo o la contraseña no son correctos.');
    await expect(field(page, 'Correo')).toHaveValue('ana@padelpiwo.test');
    await field(page, 'Contraseña').fill('padel1234');
    await field(page, 'Contraseña').press('Enter');
    await seeText(page, 'Partidos abiertos');
  });

  test('F01-H2 password recovery: code, new password, signed in; the old password stops working', async ({ page }) => {
    await tap(page, 'Ya tengo cuenta');
    await tap(page, '¿Has olvidado la contraseña?');
    await field(page, 'Correo').fill('ana@padelpiwo.test');
    await tap(page, 'Enviar código');
    await seeText(page, /Si hay una cuenta con ana@padelpiwo.test/);
    await tap(page, 'Reenviar código');
    await seeText(page, 'Te hemos enviado un código nuevo');
    await field(page, 'Código').fill('482913');
    await field(page, 'Contraseña nueva').fill('nueva-clave-9');
    await tap(page, 'Guardar contraseña');
    await seeText(page, 'Contraseña cambiada');
    await seeText(page, 'Partidos abiertos');
    await signOut(page);
    await tap(page, 'Ya tengo cuenta');
    await field(page, 'Correo').fill('ana@padelpiwo.test');
    await field(page, 'Contraseña').fill(SEED_PASSWORD);
    await field(page, 'Contraseña').press('Enter');
    await seeText(page, 'El correo o la contraseña no son correctos.');
    await field(page, 'Contraseña').fill('nueva-clave-9');
    await field(page, 'Contraseña').press('Enter');
    await seeText(page, 'Partidos abiertos');
  });

  test('F01-N2 password recovery with a bad code is refused', async ({ page }) => {
    await tap(page, 'Ya tengo cuenta');
    await tap(page, '¿Has olvidado la contraseña?');
    await field(page, 'Correo').fill('ana@padelpiwo.test');
    await tap(page, 'Enviar código');
    await field(page, 'Código').fill('12ab');
    await field(page, 'Contraseña nueva').fill('otra-clave-1');
    await tap(page, 'Guardar contraseña');
    await seeText(page, 'El código no es correcto o ha caducado.');
  });
});
