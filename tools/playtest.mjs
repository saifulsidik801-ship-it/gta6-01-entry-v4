// MARISOL BAY v4 — playtest.mjs: exactly 23 checks against the live game.
// Usage: node tools/playtest.mjs [port]  (server must already run;
// screenshot byte sizes are enforced separately by tools/shoot.mjs)
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire('/home/hatch/workspace/makefun/gta6-01/node_modules/playwright-core/package.json');
const { chromium } = require('playwright-core');
const port = Number(process.argv[2] || 8901);
const base = `http://127.0.0.1:${port}/`;

const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail: detail || '' }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); }

const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome',
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
});
async function newPage(query) {
  const page = await browser.newPage({ viewport: { width: 1024, height: 576 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(base + query, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__gameReady === true, null, { timeout: 20000 });
  await page.waitForTimeout(1200);
  return { page, errors };
}
const vis = async (page, sel) => page.evaluate(s => { const el = document.querySelector(s); return !!el && !el.classList.contains('hidden') && el.getBoundingClientRect().width > 0; }, sel);
const txt = async (page, sel) => page.evaluate(s => (document.querySelector(s) || {}).textContent || '', sel);

// --- title (3) ---
let p = await newPage('');
check('01 game boots and signals ready', await p.page.evaluate(() => window.__gameReady === true));
check('02 no console/page errors on title', p.errors.length === 0, p.errors.join(' | ').slice(0, 200));
check('03 title visible: MARISOL BAY logo + 4 menu buttons', await vis(p.page, '#title')
  && (await txt(p.page, '.t-logo')).includes('MARISOL')
  && (await p.page.evaluate(() => document.querySelectorAll('#title .t-btn').length)) === 4);
await p.page.close();

// --- cover chase (8) ---
p = await newPage('?shot=cover&seed=1');
check('04 cover state is drive, HUD visible', (await p.page.evaluate(() => window.__state())) === 'drive' && await vis(p.page, '#hud'));
check('05 cover shows $18,450 and 5 dispatch rows', (await txt(p.page, '#money')).includes('18,450')
  && (await p.page.evaluate(() => document.querySelectorAll('#dispatchRows .dr').length)) === 5);
check('06 cover IN SIGHT banner visible', await vis(p.page, '#banner') && (await txt(p.page, '#banner')).includes('IN SIGHT'));
check('07 cover speed reads 123 km/h', (await txt(p.page, '#speedNum')) === '123');
const lum = await p.page.evaluate(() => window.__luminance());
check('08 cover luminance Rec709 >= 0.47', lum && lum.rec709 >= 0.47, lum ? lum.rec709.toFixed(3) : 'no probe');
check('09 cover luminance Rec601 >= 0.47', lum && lum.rec601 >= 0.47, lum ? lum.rec601.toFixed(3) : 'no probe');
check('10 no console/page errors on cover', p.errors.length === 0, p.errors.join(' | ').slice(0, 200));
await p.page.close();

// live (unfrozen) drive: enter from the title, hold W, hero must move forward
p = await newPage('');
await p.page.keyboard.press('Enter'); await p.page.waitForTimeout(500);
const z0 = await p.page.evaluate(() => W.hero.z);
await p.page.keyboard.down('KeyW'); await p.page.waitForTimeout(2500); await p.page.keyboard.up('KeyW');
const z1 = await p.page.evaluate(() => W.hero.z);
const sp = await p.page.evaluate(() => W.hero.speed);
check('11 driving with W accelerates the hero forward', (z1 < z0 - 0.3 && sp > 10) || sp > 25, `z ${z0.toFixed(1)} -> ${z1.toFixed(1)}, speed ${sp.toFixed(0)} km/h`);
await p.page.close();

// --- on foot (5) ---
p = await newPage('?shot=foot&seed=1');
check('12 foot state is foot, crosshair visible', (await p.page.evaluate(() => window.__state())) === 'foot' && await vis(p.page, '#crosshair'));
check('13 foot STEAL prompt visible', await vis(p.page, '#prompt') && (await txt(p.page, '#promptText')).includes('STEAL'));
check('14 foot tracer line + target ring exist in scene', await p.page.evaluate(() => !!W.tracer && !!W.targetRing));
check('15 no console/page errors on foot', p.errors.length === 0, p.errors.join(' | ').slice(0, 200));
const m0 = await p.page.evaluate(() => H.money);
await p.page.mouse.click(512, 250); await p.page.waitForTimeout(400);
const m1 = await p.page.evaluate(() => H.money);
check('16 clicking shoots: a target falls and money rises', m1 > m0, `$${m0} -> $${m1}`);
await p.page.close();

// --- map (4) ---
p = await newPage('?shot=map&seed=1');
check('17 map state is map, canvas drawn (non-blank)', (await p.page.evaluate(() => window.__state())) === 'map' && await p.page.evaluate(() => {
  const c = document.getElementById('mapcanvas'); const g = c.getContext('2d');
  const d = g.getImageData(0, 0, c.width, c.height).data; let sum = 0; for (let i = 0; i < d.length; i += 401) sum += d[i] + d[i + 1] + d[i + 2];
  return sum > 100000;
}));
check('18 map shows 66.1% completion ring', (await txt(p.page, '.ring-num')).includes('66.1'));
check('19 map key legend (8+) + crew list (3) present', (await p.page.evaluate(() => document.querySelectorAll('#mapKey > div').length)) >= 8
  && (await p.page.evaluate(() => document.querySelectorAll('#crewList .crew2').length)) === 3);
await p.page.keyboard.press('Escape'); await p.page.waitForTimeout(300);
check('20 ESC from map returns to drive', (await p.page.evaluate(() => window.__state())) === 'drive');
await p.page.close();

// --- garage (3) ---
p = await newPage('?shot=garage&seed=1');
check('21 garage state is garage, BACK TO THE STREET present', (await p.page.evaluate(() => window.__state())) === 'garage' && await vis(p.page, '#gBack'));
const rows = await p.page.evaluate(() => document.querySelectorAll('#upgrades .urow').length);
check('22 garage lists 6 upgrades with prices/OWNED/LOCKED', rows === 6, rows + ' rows');
await p.page.evaluate(() => { document.querySelector('#upgrades .urow[data-name="FULL REPAIR"]').click(); });
await p.page.waitForTimeout(200);
check('23 garage upgrade row selects (BUY path wired)', await p.page.evaluate(() => H.selectedUpgrade === 'FULL REPAIR'));
await p.page.close();
await browser.close();

const fails = results.filter(r => !r.ok);
console.log(`\nPLAYTEST: ${results.length - fails.length}/${results.length} passed${fails.length ? ' — FAILURES: ' + fails.map(f => f.name).join('; ') : ''}`);
process.exit(fails.length ? 1 : 0);
