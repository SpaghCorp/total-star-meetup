/*
 * Smoke test for Total Star Meetup.
 *
 * Serves ./site over http, then drives the real UI in Chromium while intercepting
 * the GDBrowser API with fixtures — so it never touches the live service. Verifies:
 *   1. adding players fills the combined scoreboard (sum is correct),
 *   2. an unknown username shows a not-found card and does NOT change totals,
 *   3. removing a player recomputes the totals,
 *   4. the roster persists across a reload and is served from cache (no network).
 *
 * Run:  npm install && npm test      (or: node tests/smoke.mjs)
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const SITE_DIR = fileURLToPath(new URL('../site/', import.meta.url));

// NB: GDBrowser returns colours as {r,g,b} objects — fixtures mirror that real shape.
const FIXTURES = {
  robtop: { username: 'RobTop', playerID: 16, accountID: 71, rank: 0,
    stars: 100, moons: 5, diamonds: 20, coins: 0, userCoins: 10, demons: 2, cp: 14,
    col1RGB: { r: 125, g: 255, b: 0 }, col2RGB: { r: 0, g: 255, b: 255 }, glow: false },
  viprin: { username: 'Viprin', playerID: 1030, accountID: 1030, rank: 0,
    stars: 200, moons: 3, diamonds: 30, coins: 4, userCoins: 20, demons: 8, cp: 200,
    col1RGB: { r: 255, g: 0, b: 128 }, col2RGB: { r: 255, g: 255, b: 0 }, glow: true },
};

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.json': 'application/json' };

let passed = 0;
function ok(msg) { passed++; console.log('  ✓ ' + msg); }
function fail(msg) { console.error('  ✗ ' + msg); throw new Error(msg); }
function assert(cond, msg) { cond ? ok(msg) : fail(msg); }

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      let path = decodeURIComponent(req.url.split('?')[0]);
      if (path === '/' || path.endsWith('/')) path += 'index.html';
      const file = SITE_DIR + path.replace(/^\/+/, '');
      const ext = file.slice(file.lastIndexOf('.'));
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404); res.end('not found');
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
    resolve({ server, port: server.address().port });
  }));
}

async function textOf(page, selector) {
  return (await page.textContent(selector))?.trim();
}
async function total(page, key) {
  return textOf(page, `#totals [data-key="${key}"]`);
}

async function main() {
  const { server, port } = await startServer();
  const base = `http://127.0.0.1:${port}/`;

  const execPath = ['/opt/pw-browsers/chromium', process.env.PW_CHROMIUM_PATH]
    .find((p) => p && existsSync(p));
  const browser = await chromium.launch({
    headless: true,
    executablePath: execPath || undefined,
    args: ['--no-sandbox'],
  });

  let apiCalls = 0;
  try {
    const page = await browser.newPage();

    // Fail loudly on any uncaught page error (this would have caught the col1RGB .join crash).
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message || String(e)));

    // Keep the test hermetic: no real fonts, no real API.
    await page.route('**/fonts.g*/**', (r) => r.abort());
    await page.route('**/api/profile/**', (route) => {
      apiCalls++;
      const m = route.request().url().match(/\/api\/profile\/([^/?]+)/);
      const name = m ? decodeURIComponent(m[1]).toLowerCase() : '';
      const fx = FIXTURES[name];
      if (fx) route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fx) });
      else route.fulfill({ status: 500, contentType: 'text/plain', body: '-1' }); // unknown player
    });

    // --- 1. add two players, expect summed totals ---
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.fill('#username', 'robtop, viprin');
    await page.press('#username', 'Enter');

    await page.waitForFunction(() =>
      document.querySelector('#totals [data-key="stars"]')?.textContent === '300', null, { timeout: 15000 });

    assert((await total(page, 'stars')) === '300', 'Stars total = 100 + 200 = 300');
    assert((await total(page, 'diamonds')) === '50', 'Diamonds total = 20 + 30 = 50');
    assert((await total(page, 'demons')) === '10', 'Demons total = 2 + 8 = 10');
    assert((await total(page, 'cp')) === '214', 'Creator Points total = 14 + 200 = 214');
    assert((await textOf(page, '#player-count')) === '2 players', 'Player count shows "2 players"');
    assert((await page.locator('.card--ok').count()) === 2, 'Two player cards rendered');
    assert((await page.locator('.card[data-key="viprin"] .cube.is-glow').count()) === 1, "Viprin's cube shows glow");

    // sorting: both are unranked, so the tie-breaks by stars desc → Viprin (200) above RobTop (100)
    assert(((await page.locator('.card--ok .card__name').first().textContent()) || '').trim() === 'Viprin',
      'Squad sorted by ranking (Viprin above RobTop on stars)');
    // username links to the player's GDBrowser profile
    const vHref = await page.getAttribute('.card[data-key="viprin"] a.card__name', 'href');
    assert(!!vHref && vHref.indexOf('gdbrowser.com/u/Viprin') !== -1, 'Username links to the GDBrowser profile');
    // roster is encoded into the shareable URL
    const shared = decodeURIComponent(page.url());
    assert(shared.indexOf('players=') !== -1 && shared.indexOf('robtop') !== -1 && shared.indexOf('viprin') !== -1,
      'Roster is encoded in the URL for sharing (?players=…)');

    // --- 2. unknown username: not-found card, totals unchanged ---
    await page.fill('#username', 'definitelynotarealplayer_zzz');
    await page.press('#username', 'Enter');
    await page.waitForSelector('.card--notfound', { timeout: 15000 });
    assert((await total(page, 'stars')) === '300', 'Unknown player does not change the totals');
    assert((await page.locator('.card--notfound').count()) === 1, 'A not-found card is shown');

    // --- 3. remove a player, totals recompute ---
    await page.click('.card[data-key="viprin"] .card__remove');
    await page.waitForFunction(() =>
      document.querySelector('#totals [data-key="stars"]')?.textContent === '100', null, { timeout: 15000 });
    assert((await total(page, 'stars')) === '100', 'Removing Viprin drops Stars total to 100');

    // --- 4. reload: roster persists AND is served from cache (block the network) ---
    const callsBefore = apiCalls;
    await page.unroute('**/api/profile/**');
    await page.route('**/api/profile/**', (r) => r.abort()); // force cache-only
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
      document.querySelector('#totals [data-key="stars"]')?.textContent === '100', null, { timeout: 15000 });
    assert((await total(page, 'stars')) === '100', 'Roster + totals restored after reload');
    assert(apiCalls === callsBefore, 'Reload made ZERO new API calls (served from cache)');

    assert(pageErrors.length === 0, 'No uncaught page errors (got: ' + pageErrors.join(' | ') + ')');

    console.log(`\nAll ${passed} assertions passed ⭐`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error('\nSMOKE TEST FAILED:', err.message);
  process.exit(1);
});
