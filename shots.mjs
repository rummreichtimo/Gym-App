import { chromium } from 'playwright';
const BASE = 'http://localhost:3100';
const issues = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await (await browser.newContext()).newPage();
page.on('pageerror', e => issues.push('ERR ' + page.url() + ': ' + e.message.split('\n')[0]));

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await page.fill('input[type=email]', 'alex@test.de');
await page.fill('input[type=password]', 'testpass123');
await page.click('button[type=submit]');
await page.waitForURL('**/dashboard', { timeout: 30000 });

const routes = ['/dashboard','/workout','/plans','/exercises','/history','/nutrition','/progress','/goals','/records','/stats','/profile','/settings'];
// Every width from the spec, checked for horizontal overflow.
const widths = [320, 375, 390, 430, 768, 1024, 1440, 1920];

for (const width of widths) {
  await page.setViewportSize({ width, height: 900 });
  for (const route of routes) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const o = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
    if (o.s > o.c + 1) issues.push(`OVERFLOW ${width}px ${route}: ${o.s} > ${o.c}`);
    if ([390, 768, 1440].includes(width)) {
      await page.screenshot({ path: `/tmp/shots/${width}${route.replace(/\//g,'_')}.png` });
    }
  }
}
await browser.close();
console.log(issues.length ? [...new Set(issues)].join('\n') : `Keine Overflows, keine Fehler (${widths.length} Breiten × ${routes.length} Seiten)`);
