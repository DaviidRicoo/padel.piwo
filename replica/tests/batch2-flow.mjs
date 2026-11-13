// Batch 2 click-through: S12, S13, S16 and the tournament screens S17-S21.
// Same setup as core-loop.mjs; run it on a fresh server (the fake data resets on reload).
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

  await step('S16 search a player and open S13', async () => {
    await waitText('Partidos abiertos', 90000);
    await click('Buscar jugadores');
    await waitText('Buscar por nombre');
    await typeInto('Buscar por nombre', 'eva');
    await waitText('Eva Nowak');
    await shot('S16');
    await click('Eva Nowak');
    await waitText('Partidos recientes');
    await waitText('Estadísticas');
    await shot('S13');
  });

  await step('S12 edit name, hand and side; S11 shows them', async () => {
    await evaluate('history.back()'); await evaluate('history.back()');
    await click('Perfil');
    await click('Editar perfil');
    await waitText('Mano con la que juegas');
    await evaluate(`(() => { const el = [...document.querySelectorAll('input')].find((e) => e.getAttribute('aria-label') === 'Nombre'); el.focus(); el.select(); })()`);
    await send('Input.insertText', { text: 'Ana G. Ruiz' });
    await click('Izquierda');
    await click('Revés');
    await shot('S12');
    await click('Guardar cambios');
    await waitText('Perfil guardado');
    await waitText('Mano: izquierda');
    await waitText('Ana G. Ruiz');
    await shot('S11-after-edit');
  });

  await step('S17 accepting the last invitation fills the cap and draws the bracket', async () => {
    await click('Torneos');
    await waitText('Inscripción abierta');
    await waitText('te ha invitado a jugar en pareja');
    await shot('S17');
    await click('Aceptar');
    await waitText('Invitación aceptada');
    await waitText('En curso');
    await click('^Copa de otoño');
    await waitText('Tu próximo partido');
    await waitText('Ver cuadro');
    await shot('S19-drawn');
    await click('Ver cuadro');
    await waitText('Semifinal');
    await evaluate(`document.querySelectorAll('*').forEach((e) => { if (e.scrollWidth > e.clientWidth + 4) e.scrollLeft = 0; })`); await sleep(300);
    await shot('S21-copa-drawn');
  });

  await step('S15 shows the draw and the new tournament match', async () => {
    await evaluate('history.back()'); await evaluate('history.back()');
    await click('Partidos');
    await click('^Avisos');
    await waitText('Ya hay sorteo en un torneo en el que juegas');
    await waitText('Tienes partido de torneo');
    await shot('S15-tournaments');
  });

  await step('S18 create a tournament, S20 invite a partner, S19 waits for them', async () => {
    await evaluate('history.back()');
    await click('Torneos');
    await click('Crear torneo');
    await waitText('Días por ronda');
    await typeInto('Nombre del torneo', 'Copa de prueba');
    await shot('S18');
    await click('Crear torneo', 'last');
    await waitText('Inscribirme con pareja');
    await waitText('Organiza Ana G. Ruiz');
    await click('Inscribirme con pareja');
    await waitText('Enviar invitación');
    await typeInto('Buscar compañero', 'mar');
    await click('Marc Ruiz');
    await shot('S20');
    await click('Enviar invitación');
    await waitText('Esperando a que Marc Ruiz acepte la invitación.');
    await shot('S19-waiting');
  });

  await step('organizer settles both rounds of the Liga and the champions are named', async () => {
    await evaluate('history.back()');
    await waitText('En curso');
    await click('^Liga relámpago');
    await click('Ver cuadro');
    await waitText('Semifinal');
    await evaluate(`document.querySelectorAll('*').forEach((e) => { if (e.scrollWidth > e.clientWidth + 4) e.scrollLeft = 0; })`); await sleep(300);
    await shot('S21');
    await click('^Semifinal 2');
    await waitText('Fijar resultado como organizador');
    await shot('S07-tournament');
    await click('Fijar resultado como organizador', 'last');
    await waitText('cuenta directamente');
    await bump('Set 1, Equipo A', 6);
    await bump('Set 1, Equipo B', 3);
    await bump('Set 2, Equipo A', 6);
    await bump('Set 2, Equipo B', 4);
    await click('Enviar resultado');
    await waitText('Resultado fijado');
    await evaluate('history.back()');
    await waitText('Sara / Piotr');
    await evaluate(`document.querySelectorAll('*').forEach((e) => { if (e.scrollWidth > e.clientWidth + 4) e.scrollLeft = 0; })`); await sleep(300);
    await shot('S21-final-ready');
    await click('^Final 1');
    await waitText('Fijar resultado como organizador');
    await click('Fijar resultado como organizador', 'last');
    await waitText('cuenta directamente');
    await bump('Set 1, Equipo A', 6);
    await bump('Set 1, Equipo B', 2);
    await bump('Set 2, Equipo A', 7);
    await bump('Set 2, Equipo B', 5);
    await click('Enviar resultado');
    await waitText('Resultado fijado');
    await evaluate('history.back()');
    await waitText('Campeones');
    await waitText('Ana G. Ruiz / Kasia Wójcik');
    await evaluate(`document.querySelectorAll('*').forEach((e) => { if (e.scrollWidth > e.clientWidth + 4) e.scrollLeft = e.scrollWidth; })`); await sleep(300);
    await shot('S21-champions');
    await evaluate('history.back()');
    await waitText('Campeones: Ana G. Ruiz / Kasia Wójcik');
    await shot('S19-finished');
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
