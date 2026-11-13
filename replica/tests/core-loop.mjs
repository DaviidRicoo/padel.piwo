// Core-loop click-through used by /replica-build (S01-S03, S05-S11, S14, S15).
// Needs Microsoft Edge and the web dev server signed in as the demo user:
//   EXPO_PUBLIC_DEMO_USER=ana@padelpiwo.test npx expo start --web --port 8081
//   node replica/tests/core-loop.mjs http://localhost:8081 replica/clone-screens
// /replica-test should replace it with Playwright.
// Click-through of the core loop on the web build, through the DevTools protocol.
// node core-loop.mjs <base-url> <screens-dir>
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [BASE = 'http://localhost:8081', OUT = './shots'] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9334;
const W = 390, H = 844;
const browser = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'cdp-'))}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ws, id = 0;
const pending = new Map();
const consoleErrors = [];
const steps = [];

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
      await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
      ws.onmessage = (m) => {
        const msg = JSON.parse(m.data);
        if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
        else if (msg.method === 'Runtime.exceptionThrown') consoleErrors.push('exception: ' + (msg.params.exceptionDetails.exception?.description ?? '').split('\n')[0]);
        else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') consoleErrors.push('error: ' + msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200));
      };
      return;
    } catch { await sleep(200); }
  }
  throw new Error('no browser');
}
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const n = ++id;
  pending.set(n, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)));
  ws.send(JSON.stringify({ id: n, method, params }));
});
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;

// find a visible element by aria-label (exact, or prefix with "^") or by its text, and return its centre
const FIND = `(q) => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const all = [...document.querySelectorAll('[aria-label],[role=button],[role=tab],[role=radio],a,button,div[tabindex]')].filter(vis);
  let hit;
  if (q.startsWith('^')) hit = all.filter((e) => (e.getAttribute('aria-label') || '').startsWith(q.slice(1)));
  else if (q.startsWith('~')) hit = all.filter((e) => (e.getAttribute('aria-label') || '').includes(q.slice(1)));
  else hit = all.filter((e) => e.getAttribute('aria-label') === q);
  if (!hit.length) hit = [...document.querySelectorAll('[role=button],[role=tab],[role=radio],a')].filter(vis).filter((e) => e.innerText.trim() === q);
  return hit;
}`;

async function centerOf(q, pick = 'first') {
  return evaluate(`(() => { const hit = (${FIND})(${JSON.stringify(q)}); const el = ${pick === 'last' ? 'hit[hit.length-1]' : 'hit[0]'}; if (!el) return null; el.scrollIntoView({block:'center'}); const r = el.getBoundingClientRect(); return {x: r.x + r.width/2, y: r.y + r.height/2}; })()`);
}

async function tap(x, y) {
  for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  await sleep(150);
}

async function click(q, pick) {
  for (let i = 0; i < 40; i++) {
    const c = await centerOf(q, pick);
    if (c) { await sleep(100); const c2 = await centerOf(q, pick); await tap(c2.x, c2.y); return; }
    await sleep(250);
  }
  throw new Error(`not found: ${q}`);
}

async function waitText(text, timeout = 12000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`)) return;
    await sleep(200);
  }
  throw new Error(`text never appeared: ${text}`);
}

/** click the + of a stepper n times (the stepper is found by its aria-label prefix) */
async function bump(labelPrefix, times) {
  for (let i = 0; i < times; i++) {
    const c = await evaluate(`(() => { const el = [...document.querySelectorAll('[aria-label]')].find((e) => e.getAttribute('aria-label').startsWith(${JSON.stringify(labelPrefix)})); if (!el) return null; el.scrollIntoView({block:'center'}); const r = el.lastElementChild.getBoundingClientRect(); return {x: r.x + r.width/2, y: r.y + r.height/2}; })()`);
    if (!c) throw new Error('stepper not found: ' + labelPrefix);
    await tap(c.x, c.y);
  }
}

async function typeInto(label, text) {
  const c = await evaluate(`(() => { const el = [...document.querySelectorAll('input,textarea')].find((e) => e.getAttribute('aria-label') === ${JSON.stringify(label)}); if (!el) return null; el.scrollIntoView({block:'center'}); const r = el.getBoundingClientRect(); return {x: r.x + 10, y: r.y + r.height/2}; })()`);
  if (!c) throw new Error('input not found: ' + label);
  await tap(c.x, c.y);
  await send('Input.insertText', { text });
  await sleep(100);
}

async function shot(name) {
  await sleep(700);
  const h = await evaluate(`(() => { let max = innerHeight; for (const el of document.querySelectorAll('*')) { const s = getComputedStyle(el); if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 4) max = Math.max(max, innerHeight + el.scrollHeight - el.clientHeight); } return Math.min(Math.ceil(max), 9000); })()`);
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: h, deviceScaleFactor: 1, mobile: true });
  await sleep(600);
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(data, 'base64'));
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: true });
  await sleep(300);
}

async function step(name, fn) {
  try { await fn(); steps.push(`PASS  ${name}`); }
  catch (e) { steps.push(`FAIL  ${name}: ${e.message}`); await shot(`FAIL-${name.replace(/\W+/g, '-')}`).catch(() => {}); throw e; }
}

try {
  await connect();
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: BASE + '/' });

  await step('S05 lists my upcoming and the open matches', async () => {
    await waitText('Partidos abiertos', 60000);
    await waitText('Mis próximos partidos');
    await shot('S05');
  });

  await step('keyboard: Tab reaches "Crear partido" and Enter opens S06', async () => {
    const seen = [];
    for (let i = 0; i < 40; i++) {
      for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      const label = await evaluate(`document.activeElement?.getAttribute('aria-label') || document.activeElement?.innerText?.slice(0, 30) || ''`);
      seen.push(label);
      if (label === 'Crear partido') break;
    }
    if (seen[seen.length - 1] !== 'Crear partido') throw new Error('never focused: ' + seen.join(' | '));
    // a real Enter press: keyDown carries the "\r" character, like a physical keyboard
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await waitText('Duración');
    await shot('S05-keyboard-focus-then-S06');
    await evaluate('history.back()');
    await waitText('Partidos abiertos');
    console.log('  tab order: ' + seen.filter(Boolean).join(' > '));
  });

  await step('S06 create a match for tomorrow at 19:30', async () => {
    await click('Crear partido');
    await waitText('Duración');
    await click('^Mañana');
    await click('19:30');
    await typeInto('Lugar', 'Pista 3');
    await shot('S06');
    await click('Publicar partido');
    await waitText('Organiza Ana García');
    await waitText('Pista 3');
    await shot('S07-new-match');
  });

  await step('S09 recent shows the match waiting for a result', async () => {
    await evaluate('history.back()');
    await waitText('Partidos abiertos');
    await click('Recientes');
    await waitText('Falta el resultado');
    await shot('S09');
  });

  await step('S07 and S08 enter the result of the finished match', async () => {
    await click('~Falta el resultado');
    await waitText('Introducir resultado');
    await shot('S07-awaiting-result');
    await click('Introducir resultado');
    await waitText('Enviar resultado');
    await bump('Set 1, Equipo A', 6);
    await bump('Set 1, Equipo B', 3);
    await bump('Set 2, Equipo A', 6);
    await bump('Set 2, Equipo B', 2);
    await shot('S08');
    await click('Enviar resultado');
    await waitText('Falta que el otro equipo lo confirme.');
    await shot('S07-result-sent');
  });

  await step('S15 and S07 confirm the result the other team sent', async () => {
    await evaluate('history.back()');
    await click('Partidos');
    await waitText('Partidos abiertos');
    await click('^Avisos');
    await waitText('Marcar todo como leído');
    await shot('S15');
    await click('~ha enviado un resultado');
    await waitText('Confirmar resultado');
    await shot('S07-to-confirm');
    await click('Confirmar resultado');
    await waitText('Resultado confirmado');
  });

  await step('S07 join an open match, and ask for a spot outside the level range', async () => {
    await evaluate('history.back()'); await evaluate('history.back()');
    await waitText('Partidos abiertos');
    await click('~Amistoso, 3 plazas libres');
    await waitText('Unirme al partido');
    await click('Unirme al partido', 'last');
    await waitText('Te has unido al partido');
    await shot('S07-joined');
    await evaluate('history.back()');
    await waitText('Partidos abiertos');
    await click('~1 plaza libre');
    await click('Unirme al partido', 'last');
    await waitText('Esperando a que el organizador acepte tu solicitud.');
    await shot('S07-requested');
  });

  await step('S10 ranking by season and all time', async () => {
    await evaluate('history.back()');
    await click('Ranking');
    await waitText('PJ');
    await shot('S10');
    await click('Total');
    await waitText('PJ');
  });

  await step('S11 profile', async () => {
    await click('Perfil');
    await waitText('Estadísticas');
    await shot('S11');
  });

  await step('S14 switch to English, then sign out', async () => {
    await click('Ajustes');
    await waitText('Idioma');
    await click('English');
    await waitText('Language');
    await shot('S14');
    await click('Sign out');
    await waitText('Sign out?');
    await click('Sign out', 'last');
    await waitText('Create account');
    await shot('S01');
  });

  await step('S02 and S03 sign up validation, then sign in', async () => {
    await click('Create account');
    await waitText('At least 8 characters.');
    await typeInto('Name', 'Nueva Residente');
    await typeInto('Email', 'no-es-un-correo');
    await typeInto('Password', 'corta');
    await click('Create account', 'last');
    await waitText('Enter a valid email.');
    await waitText('The password needs at least 8 characters.');
    await shot('S02-errors');
    await evaluate('history.back()');
    await click('I already have an account');
    await typeInto('Email', 'ana@padelpiwo.test');
    await typeInto('Password', 'wrong-password');
    await click('Sign in', 'last');
    await waitText('The email or password is not right.');
    await shot('S03-error');
    // select the wrong password and type the right one over it
    await evaluate(`(() => { const el = [...document.querySelectorAll('input')].find((e) => e.getAttribute('aria-label') === 'Password'); el.select(); })()`);
    await send('Input.insertText', { text: 'padel1234' });
    await click('Sign in', 'last');
    // Ana switched her language to English in S14, so the app comes back in English
    await waitText('Open matches');
  });
} catch (e) {
  // the failing step is already recorded
} finally {
  console.log(steps.join('\n'));
  console.log(`\nconsole errors: ${consoleErrors.length}`);
  consoleErrors.slice(0, 10).forEach((e) => console.log('  ' + e));
  try { ws?.close(); } catch {}
  browser.kill();
}
