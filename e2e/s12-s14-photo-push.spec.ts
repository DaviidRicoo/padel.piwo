// S12 profile photo and S14 push switches, on the fake data layer (signed in as Ana).
import { deflateSync } from 'node:zlib';

import { expect, navigate, openApp, seeText, signInAs, tap, test, type Page } from './fixtures';

/** A solid-colour PNG of w × h, built here so the test needs no image file. */
function png(w: number, h: number): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, Buffer.from([0x20, 0x8a, 0xef]))]);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

async function choosePhoto(page: Page, file: Buffer) {
  const chooser = page.waitForEvent('filechooser');
  await tap(page, /^(Elegir foto|Cambiar foto)$/);
  await (await chooser).setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: file });
}

/** the <img> of the first visible avatar named `name` */
const avatarImg = (page: Page, name: string) => page.getByRole('img', { name }).filter({ visible: true }).first().locator('img');

test.describe('S12 profile photo', () => {
  test('S12-H1 a wide photo is cropped square, shrunk, saved, and shown to other players', async ({ page }) => {
    await openApp(page, '/profile-edit');
    await seeText(page, 'Sin foto: se muestran tus iniciales.');
    await choosePhoto(page, png(900, 600));
    await seeText(page, 'Foto guardada');
    await expect(page.getByRole('button', { name: 'Cambiar foto' })).toBeVisible();
    const img = avatarImg(page, 'Ana García');
    await expect(img).toHaveAttribute('src', /^data:image\/jpeg;base64,/);
    // square and no bigger than 512 px
    const size = await img.evaluate(async (el: HTMLImageElement) => {
      const probe = new Image();
      probe.src = el.src;
      await probe.decode();
      return [probe.naturalWidth, probe.naturalHeight];
    });
    expect(size).toEqual([512, 512]);

    // Diego sees it on her profile
    await signInAs(page, 'diego');
    await navigate(page, '/search');
    await tap(page, /Ana García/);
    await expect(avatarImg(page, 'Ana García')).toHaveAttribute('src', /^data:image\/jpeg/);
  });

  test('S12-E1 a small photo is not enlarged; removing it brings the initials back', async ({ page }) => {
    await openApp(page, '/profile-edit');
    await choosePhoto(page, png(120, 160));
    await seeText(page, 'Foto guardada');
    const size = await avatarImg(page, 'Ana García').evaluate(async (el: HTMLImageElement) => {
      const probe = new Image();
      probe.src = el.src;
      await probe.decode();
      return [probe.naturalWidth, probe.naturalHeight];
    });
    expect(size).toEqual([120, 120]);
    await tap(page, 'Quitar foto');
    await seeText(page, 'Foto quitada');
    await expect(page.getByRole('button', { name: 'Elegir foto' })).toBeVisible();
    await expect(avatarImg(page, 'Ana García')).toHaveCount(0);
  });

  test('S12-E2 backing out of the picker changes nothing', async ({ page }) => {
    await openApp(page, '/profile-edit');
    const chooser = page.waitForEvent('filechooser');
    await tap(page, 'Elegir foto');
    await (await chooser).setFiles([]);
    await expect(page.getByRole('button', { name: 'Elegir foto' })).toBeVisible();
    await expect(page.getByText('Foto guardada')).toHaveCount(0);
  });
});

test.describe('S14 push switches', () => {
  const sw = (page: Page, title: string) => page.getByRole('switch', { name: new RegExp(`^${title}, `) }).filter({ visible: true }).last();

  test('S14-H1 all on by default; switching one off is kept, and only for that player', async ({ page }) => {
    await openApp(page, '/settings');
    await seeText(page, 'Notificaciones en el móvil');
    for (const name of ['Partidos', 'Resultados', 'Recordatorios', 'Torneos']) await expect(sw(page, name)).toHaveAttribute('aria-checked', 'true');
    await sw(page, 'Recordatorios').click();
    await expect(sw(page, 'Recordatorios')).toHaveAttribute('aria-checked', 'false');
    await navigate(page, '/');
    await navigate(page, '/settings');
    await expect(sw(page, 'Recordatorios')).toHaveAttribute('aria-checked', 'false');
    await expect(sw(page, 'Partidos')).toHaveAttribute('aria-checked', 'true');
    await signInAs(page, 'diego');
    await navigate(page, '/settings');
    await expect(sw(page, 'Recordatorios')).toHaveAttribute('aria-checked', 'true');
  });

  test('S14-E1 keyboard (BUG-005): Space toggles a switch and picks a segment; Enter still works', async ({ page }) => {
    await openApp(page, '/settings');
    // the switches are disabled until the settings have loaded
    await expect(sw(page, 'Torneos')).not.toHaveAttribute('aria-disabled', 'true');
    await expect(sw(page, 'Torneos')).toHaveAttribute('aria-checked', 'true');
    await sw(page, 'Torneos').focus();
    await page.keyboard.press('Space');
    await expect(sw(page, 'Torneos')).toHaveAttribute('aria-checked', 'false');
    await page.keyboard.press('Enter');
    await expect(sw(page, 'Torneos')).toHaveAttribute('aria-checked', 'true');
    const dark = page.getByRole('radio', { name: 'Oscuro', exact: true }).filter({ visible: true }).last();
    await dark.focus();
    await page.keyboard.press('Space');
    await expect(dark).toHaveAttribute('aria-checked', 'true');
  });
});
