// MARISOL BAY v4 — shoot.mjs: renders the 4 staged shots in headless Chrome
// and saves them as JPEGs into screenshots/. Usage:
//   node tools/shoot.mjs [port]   (server must already run: node serve.ts --port <port>)
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire('/home/hatch/workspace/makefun/gta6-01/node_modules/playwright-core/package.json');
const { chromium } = require('playwright-core');

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const port = Number(process.argv[2] || 8901);
const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
mkdirSync(join(root, 'screenshots'), { recursive: true });

const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome',
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
});
const report = [];
for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: 1024, height: 576 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('requestfailed', r => errors.push('REQFAIL ' + r.url()));
  await page.goto(`http://127.0.0.1:${port}/${shot.query}`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__gameReady === true, null, { timeout: 20000 });
  await page.waitForTimeout(1600);
  const lum = await page.evaluate(() => (window.__luminance ? window.__luminance() : null));
  const state = await page.evaluate(() => window.__state());
  const path = join(root, 'screenshots', shot.name);
  await page.screenshot({ path, type: 'jpeg', quality: 82 });
  const { size } = (await import('node:fs')).statSync(path);
  report.push({ shot: shot.name, state, errors, luminance: lum, bytes: size });
  console.log(JSON.stringify(report[report.length - 1]));
  await page.close();
}
await browser.close();
writeFileSync(join(root, 'tools', 'shoot-report.json'), JSON.stringify(report, null, 2));
const bad = report.filter(r => r.errors.length || r.bytes > 262144);
console.log(bad.length ? `SHOOT: ${bad.length} PROBLEM(S)` : 'SHOOT: all 4 shots clean');
