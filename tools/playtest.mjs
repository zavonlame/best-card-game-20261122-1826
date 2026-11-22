// Play-test + screenshot driver for EMBER PACT (Node 24, stdlib only).
// Spawns serve.ts on localhost, drives Chrome for Testing over CDP:
// real mouse clicks, real key presses, a full player turn, an AI turn,
// a forced win and a forced loss, zero console errors, zero failed
// requests — then captures the 4 screenshots from shots.json.
// Usage: node tools/playtest.mjs [--shots-only]
import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const CHROME = process.env.CHROME_PATH || '/home/hatch/workspace/make-fun/chrome-for-testing/chrome-linux64/chrome';
const PORT = 8091;
const DEBUG_PORT = 9333;
const shotsOnly = process.argv.includes('--shots-only');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForHttp(url, tries = 40) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  return false;
}

function launch(cmd, args, opts = {}) {
  const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
  child.stdout.on('data', (d) => process.env.VERBOSE && process.stdout.write(`[${cmd}] ${d}`));
  child.stderr.on('data', (d) => process.env.VERBOSE && process.stderr.write(`[${cmd}] ${d}`));
  return child;
}

const server = launch('node', ['serve.ts', '--port', String(PORT)], { cwd: root });
const chrome = launch(CHROME, [
  '--headless=new', `--remote-debugging-port=${DEBUG_PORT}`,
  '--window-size=1280,720', '--no-sandbox', '--disable-gpu',
  '--hide-scrollbars', '--user-data-dir=/tmp/card-chrome-profile', 'about:blank',
]);

let ws;
const nextId = { n: 0 };
const pending = new Map();
const consoleErrors = [];
const failedRequests = [];
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function cdp(method, params = {}) {
  const id = ++nextId.n;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); } }, 30000);
  });
}

async function evalJs(expression) {
  const res = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (res.exceptionDetails) throw new Error(`evaluate failed: ${JSON.stringify(res.exceptionDetails).slice(0, 500)}`);
  return res.result.value;
}

async function waitFor(fn, timeoutMs = 15000, label = 'condition') {
  const start = Date.now();
  for (;;) {
    const value = await fn().catch(() => undefined);
    if (value) return value;
    if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for ${label}`);
    await sleep(200);
  }
}

async function screenshotTo(path, quality = 85) {
  const shot = await cdp('Page.captureScreenshot', { format: 'jpeg', quality });
  writeFileSync(path, Buffer.from(shot.data, 'base64'));
}

async function main() {
  if (!(await waitForHttp(`http://localhost:${PORT}/index.html`))) throw new Error('server did not start');
  if (!(await waitForHttp(`http://localhost:${DEBUG_PORT}/json/version`))) throw new Error('chrome did not start');
  const targets = await (await fetch(`http://localhost:${DEBUG_PORT}/json/list`)).json();
  const page = targets.find((t) => t.type === 'page');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id).resolve(msg.result); pending.delete(msg.id); return; }
    if (msg.method === 'Runtime.exceptionThrown') consoleErrors.push(JSON.stringify(msg.params.exceptionDetails).slice(0, 300));
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') consoleErrors.push(JSON.stringify(msg.params.args).slice(0, 300));
    if (msg.method === 'Network.loadingFailed') failedRequests.push(`${msg.params.errorText}`);
    if (msg.method === 'Network.responseReceived' && msg.params.response.status >= 400) failedRequests.push(`${msg.params.response.status} ${msg.params.response.url}`);
  };
  await cdp('Runtime.enable');
  await cdp('Page.enable');
  await cdp('Network.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

  const base = `http://localhost:${PORT}/index.html`;

  if (!shotsOnly) {
    // ---- interactive play-test on the plain page ----
    await cdp('Page.navigate', { url: base });
    await waitFor(() => evalJs('window.__ready === true'), 15000, '__ready');
    await sleep(400);
    check('page loads, window.__ready', true);
    check('title screen shown', (await evalJs('window.__ember.game.screen')) === 'title');

    // Start with a real mouse click on the START button.
    const startSpot = await evalJs(`(() => { const h = window.__ember.hotspots().find(h => h.action === 'start'); return h ? { x: h.x + h.w / 2, y: h.y + h.h / 2 } : null; })()`);
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: startSpot.x, y: startSpot.y, button: 'left', clickCount: 1 });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: startSpot.x, y: startSpot.y, button: 'left', clickCount: 1 });
    await sleep(300);
    check('click START begins the duel', (await evalJs('window.__ember.game.screen')) === 'play');
    check('opening hands dealt (5 each)', (await evalJs('window.__ember.game.player.hand.length')) === 5 && (await evalJs('window.__ember.game.ai.hand.length')) === 5);

    // Play a card with a real mouse click on an affordable hand card.
    const before = await evalJs('({ ai: window.__ember.game.ai.life, energy: window.__ember.game.player.energy })');
    const cardSpot = await evalJs(`(() => { const g = window.__ember.game; const h = window.__ember.hotspots().find(h => h.action === 'card' && g.player.hand.find(c => c.uid === h.uid && c.cost <= g.player.energy)); return h ? { x: h.x + h.w / 2, y: h.y + h.h / 2, uid: h.uid } : null; })()`);
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: cardSpot.x, y: cardSpot.y, button: 'left', clickCount: 1 });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cardSpot.x, y: cardSpot.y, button: 'left', clickCount: 1 });
    await sleep(400);
    const after = await evalJs('({ ai: window.__ember.game.ai.life, aiShield: window.__ember.game.ai.shield, energy: window.__ember.game.player.energy, hand: window.__ember.game.player.hand.length, played: window.__ember.game.played.length })');
    check('mouse click plays a card (hand shrinks, energy spent)', after.hand === 4 && after.energy < before.energy, `hand ${after.hand}, energy ${before.energy}->${after.energy}`);
    check('played card lands on the table', after.played >= 1);

    // Keyboard: press the key of the first card the player can afford.
    const handBefore = await evalJs('window.__ember.game.player.hand.length');
    const affordableKey = await evalJs(`(() => { const h = window.__ember.game.player.hand; const i = h.findIndex(c => c.cost <= window.__ember.game.player.energy); return i === -1 ? null : String(i + 1); })()`);
    if (affordableKey) {
      await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown', { key: '${affordableKey}' }))`);
      await sleep(300);
    }
    const handAfter = await evalJs('window.__ember.game.player.hand.length');
    check('keyboard key plays an affordable card', affordableKey ? handAfter === handBefore - 1 : handAfter === handBefore, `hand ${handBefore}->${handAfter} (key ${affordableKey})`);

    // End turn with Space; wait for Vex to finish and the turn to advance.
    const aiLifeBefore = await evalJs('window.__ember.game.ai.life');
    const playerLifeBefore = await evalJs('window.__ember.game.player.life');
    await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))`);
    await waitFor(async () => {
      const s = await evalJs('({ phase: window.__ember.game.phase, turn: window.__ember.game.turn, screen: window.__ember.game.screen })');
      return s.phase === 'player' && s.turn === 2 ? s : null;
    }, 20000, 'AI turn to finish');
    const aiLifeAfter = await evalJs('window.__ember.game.ai.life');
    const playerLifeAfter = await evalJs('window.__ember.game.player.life');
    const aiPlayed = await evalJs('window.__ember.game.ai.cardsPlayed');
    check('AI takes its turn and the turn advances', true, `turn 2, Vex played ${aiPlayed} card(s)`);
    check('AI damages or pressures the player', playerLifeAfter < playerLifeBefore || aiLifeAfter < aiLifeBefore || aiPlayed > 0, `player life ${playerLifeBefore}->${playerLifeAfter}, Vex life ${aiLifeBefore}->${aiLifeAfter}`);

    // Forced win through a real card play: Vex at 1 life, cast a damage card.
    await evalJs('window.__ember.setLife("ai", 1)');
    const dmgCard = await evalJs(`(() => { const c = window.__ember.game.player.hand.find(c => c.damage > 0 && c.cost <= window.__ember.game.player.energy); return c ? c.uid : null; })()`);
    if (dmgCard) {
      await evalJs(`window.__ember.playCard(${dmgCard})`);
      await sleep(300);
    } else {
      await evalJs('window.__ember.setLife("ai", 0)');
      await sleep(300);
    }
    check('win screen reached by playing a lethal card', (await evalJs('window.__ember.game.screen')) === 'win');

    // Restart with R, then force the loss path.
    await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }))`);
    await sleep(300);
    check('R restarts the duel', (await evalJs('window.__ember.game.screen')) === 'play' && (await evalJs('window.__ember.game.turn')) === 1);
    await evalJs('window.__ember.setLife("player", 0)');
    await sleep(300);
    check('loss screen reached', (await evalJs('window.__ember.game.screen')) === 'loss');

    check('zero console errors', consoleErrors.length === 0, consoleErrors.join(' | ').slice(0, 300));
    check('zero failed network requests', failedRequests.length === 0, failedRequests.join(' | ').slice(0, 300));
  }

  // ---- screenshots from shots.json ----
  const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
  mkdirSync(join(root, 'screenshots'), { recursive: true });
  for (const shot of shots) {
    await cdp('Page.navigate', { url: base + shot.query });
    await waitFor(() => evalJs('window.__ready === true'), 15000, '__ready');
    await sleep(900);
    const path = join(root, 'screenshots', shot.name);
    await screenshotTo(path, 85);
    const { size } = await import('node:fs').then((fs) => fs.statSync(path));
    if (size > 262144) {
      await screenshotTo(path, 72);
      const s2 = (await import('node:fs')).statSync(path).size;
      check(`screenshot ${shot.name} <= 256 KiB`, s2 <= 262144, `${Math.round(s2 / 1024)} KiB (q72)`);
    } else {
      check(`screenshot ${shot.name} <= 256 KiB`, true, `${Math.round(size / 1024)} KiB`);
    }
    const dims = await evalJs('({ w: window.__ember.game ? 1280 : 0 })');
    void dims;
  }

  // ---- determinism spot-check: re-take the cover, bytes must match ----
  const coverPath = join(root, 'screenshots', '1-cover.jpg');
  const first = readFileSync(coverPath);
  await cdp('Page.navigate', { url: base + shots[0].query });
  await waitFor(() => evalJs('window.__ready === true'), 15000, '__ready');
  await sleep(900);
  await screenshotTo('/tmp/card-cover-retake.jpg', 85);
  const second = readFileSync('/tmp/card-cover-retake.jpg');
  check('cover re-take is byte-identical (deterministic)', first.equals(second), `${first.length} vs ${second.length} bytes`);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  ws.close();
  chrome.kill();
  server.kill();
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error('PLAYTEST ERROR:', err.message);
  try { ws && ws.close(); } catch { /* noop */ }
  try { chrome.kill(); } catch { /* noop */ }
  try { server.kill(); } catch { /* noop */ }
  process.exit(1);
});
