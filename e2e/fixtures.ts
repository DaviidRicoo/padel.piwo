// Shared setup for every spec: fail on console errors and 5xx responses,
// plus helpers that drive the app the way a person does (roles and labels only).
import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, type Locator, type Page } from '@playwright/test';

export const SEED_PASSWORD = 'padel1234';

export const test = base.extend<{ problems: string[] }>({
  problems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') problems.push(`console error: ${msg.text().slice(0, 300)}`);
      });
      page.on('pageerror', (err) => problems.push(`page error: ${err.message.slice(0, 300)}`));
      page.on('response', (res) => {
        if (res.status() >= 500) problems.push(`${res.status()} on ${res.url()}`);
      });
      await use(problems);
      expect(problems, 'console errors, page errors or 5xx responses').toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

/** any element whose accessible name is exactly this (buttons, tabs, links, cards) */
export const named = (page: Page, name: string | RegExp) => {
  const exact = typeof name === 'string';
  return page
    .getByRole('button', { name, exact })
    .or(page.getByRole('link', { name, exact }))
    .or(page.getByRole('radio', { name, exact }))
    .or(page.getByRole('tab', { name, exact }))
    .filter({ visible: true });
};

export async function tap(page: Page, name: string | RegExp, which: 'first' | 'last' = 'first') {
  const target = which === 'first' ? named(page, name).first() : named(page, name).last();
  await target.scrollIntoViewIfNeeded();
  await target.click();
}

/** the in-app tab bar */
export const tab = (page: Page, name: string) => page.getByRole('tab', { name: new RegExp(`^${name}`) });

/** a text field, by its visible label (the last one: the screen on top of the stack) */
export const field = (page: Page, label: string) => page.locator(`input[aria-label="${label}"], textarea[aria-label="${label}"]`).filter({ visible: true }).last();

/** a stepper (a named group on the web) by its label prefix, and the number it shows */
export const stepper = (page: Page, labelPrefix: string) => page.getByRole('group', { name: labelPrefix }).filter({ visible: true }).last();
export const stepperValue = async (page: Page, labelPrefix: string) => Number((await stepper(page, labelPrefix).locator('> *').nth(1).innerText()).replace(',', '.'));

export async function seeText(page: Page, text: string | RegExp, timeout?: number) {
  await expect(page.getByText(text).filter({ visible: true }).first()).toBeVisible({ timeout });
}

/** open the app fresh (new seed), signed in as Ana */
export async function openApp(page: Page, path = '/') {
  await page.goto(path);
  if (path === '/') await seeText(page, 'Partidos abiertos', 60_000);
}

/** press the + of a stepper n times (the − for a negative n); the stepper is found by its label prefix */
export async function bump(page: Page, labelPrefix: string, times: number) {
  // the − and + are buttons named after the stepper ("Subir: Set 1, Equipo A")
  const button = stepper(page, labelPrefix).getByRole('button', { name: new RegExp(`^${times >= 0 ? 'Subir' : 'Bajar'}: `) });
  for (let i = 0; i < Math.abs(times); i++) await button.click();
}

/** confirm dialogs repeat the action label on the dialog's own button */
export async function tapAndConfirm(page: Page, label: string | RegExp) {
  await tap(page, label);
  await expect(named(page, label)).toHaveCount(2);
  await tap(page, label, 'last');
}

/**
 * Move inside the app without reloading it (a reload would reset the in-memory data):
 * the router follows history changes like a link.
 */
export async function navigate(page: Page, path: string) {
  await page.evaluate((p) => {
    window.history.pushState(null, '', p);
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
  }, path);
}

// seed players with English as their language (src/data/fake/seed.ts)
const ENGLISH = ['piotr', 'kasia', 'jan', 'ola', 'tomek'];

export async function signOut(page: Page) {
  await navigate(page, '/settings');
  await tapAndConfirm(page, /^(Cerrar sesión|Sign out)$/);
  await seeText(page, /^(Ya tengo cuenta|I already have an account)$/);
}

/**
 * Sign out of whoever is in and sign in as a seed player (same page, same in-memory data).
 * Piotr, Kasia, Jan, Ola and Tomek use the app in English.
 */
export async function signInAs(page: Page, who: string) {
  await signOut(page);
  const wasEnglish = await page.getByText('I already have an account').isVisible();
  await tap(page, wasEnglish ? 'I already have an account' : 'Ya tengo cuenta');
  await field(page, wasEnglish ? 'Email' : 'Correo').fill(`${who}@padelpiwo.test`);
  await field(page, wasEnglish ? 'Password' : 'Contraseña').fill(SEED_PASSWORD);
  await tap(page, wasEnglish ? 'Sign in' : 'Entrar', 'last');
  await seeText(page, ENGLISH.includes(who) ? 'Open matches' : 'Partidos abiertos');
}

/**
 * WCAG 2.1 A and AA scan of what is on screen; returns the violations, one line each.
 * label-content-name-mismatch is known and open (BUG-003); it has its own test in a11y.spec.ts.
 */
export async function a11y(page: Page, { only }: { only?: string[] } = {}): Promise<string[]> {
  const builder = new AxeBuilder({ page });
  if (only) builder.withRules(only);
  else builder.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).disableRules(['label-content-name-mismatch']);
  const res = await builder.analyze();
  return res.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} × ${v.help} — ${v.nodes[0]?.target.join(' ')}`);
}

export type { Locator, Page };
