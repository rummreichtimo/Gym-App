import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage();
p.on('pageerror', e => console.log('ERR:', e.message.split('\n')[0]));
await p.goto('http://localhost:3100/register', { waitUntil: 'networkidle' });
console.log('url:', p.url());
console.log('inputs:', await p.$$eval('input', els => els.map(e => `${e.type}|${e.autocomplete}|${e.placeholder}`)));
console.log('body head:', (await p.textContent('body')).slice(0, 200));
await b.close();
