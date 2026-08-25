import { chromium } from 'playwright';
const BASE = 'http://localhost:3100';
const problems = [];
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
page.on('pageerror', (e) => problems.push('PAGEERROR: ' + e.message.split('\n')[0]));
page.on('console', (m) => { if (m.type() === 'error') problems.push('CONSOLE: ' + m.text().slice(0, 160)); });

// --- 1. Register a brand new user and walk the onboarding wizard -----------
const email = `test${Date.now()}@ironpath.de`;
await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' });
await page.fill('input[autocomplete=name]', 'Testnutzer');
await page.fill('input[type=email]', email);
await page.fill('input[type=password]', 'sicher12345');
await page.click('button[type=submit]');
await page.waitForURL('**/onboarding', { timeout: 20000 });
log('✓ Registrierung → Onboarding');

// Step 1: name prefilled
await page.click('button:has-text("Weiter")');
// Step 2: body data — validation should block empty input
await page.click('button:has-text("Weiter")');
const blocked = await page.locator('text=Bitte gib eine gültige Größe ein.').count();
if (blocked === 0) problems.push('Onboarding: leere Körperdaten wurden nicht abgefangen');
else log('✓ Onboarding-Validierung greift');

await page.fill('input[placeholder="180"]', '182');
await page.fill('input[placeholder="80"]', '78');
await page.click('button:has-text("Weiter")');
await page.click('button:has-text("Muskelaufbau")');
await page.click('button:has-text("Weiter")');
await page.click('button:has-text("Weiter")');   // training step, defaults ok
const suggested = await page.locator('text=Grundumsatz').count();
if (suggested === 0) problems.push('Onboarding: kein Makro-Vorschlag berechnet');
else log('✓ Makro-Vorschlag aus Körperdaten berechnet');
await page.click('button:has-text("Einrichtung abschließen")');
await page.waitForURL('**/dashboard', { timeout: 20000 });
log('✓ Onboarding abgeschlossen → Dashboard');

// --- 2. Dashboard shows the generated starter plan -------------------------
await page.waitForTimeout(1500);
const dash = await page.textContent('body');
if (!/Upper|Push|Ganzkörper/.test(dash)) problems.push('Dashboard: kein Startplan sichtbar');
else log('✓ Startplan automatisch erzeugt und auf dem Dashboard sichtbar');

// --- 3. Start a workout and log a set --------------------------------------
await page.goto(`${BASE}/workout`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.locator('button:has-text("Starten")').first().click();
await page.waitForURL('**/workout/active', { timeout: 20000 });
await page.waitForTimeout(1500);
log('✓ Workout gestartet');

await page.locator('button:has-text("Satz hinzufügen")').first().click();
await page.waitForTimeout(1200);

const weightInput = page.locator('input[aria-label*="Gewicht Satz 1"]').first();
const repsInput = page.locator('input[aria-label*="Wiederholungen Satz 1"]').first();
await weightInput.fill('60');
await repsInput.fill('10');
await page.locator('button[aria-label="Satz abschließen"]').first().click();
await page.waitForTimeout(1800);

// The rest timer must appear after completing a set
const timerVisible = await page.locator('text=Pause').first().isVisible().catch(() => false);
if (!timerVisible) problems.push('Pausentimer startet nicht nach abgeschlossenem Satz');
else log('✓ Satz gespeichert, Pausentimer gestartet');

// Volume in the header must reflect the logged set (60 × 10 = 600 kg)
const header = await page.textContent('header');
if (!header.includes('600')) problems.push(`Header zeigt kein Volumen: ${header}`);
else log('✓ Live-Volumen im Header korrekt (600 kg)');

// --- 4. Reload mid-workout: the set must survive ---------------------------
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
const afterReload = await page.locator('input[aria-label*="Gewicht Satz 1"]').first().inputValue();
if (afterReload !== '60') problems.push(`Satz nach Reload verloren (Wert: "${afterReload}")`);
else log('✓ Satz überlebt Reload (Persistenz bestätigt)');

// --- 5. Finish the workout and read the summary ----------------------------
await page.click('button:has-text("Beenden")');
await page.waitForTimeout(600);
await page.locator('button:has-text("Abschließen")').last().click();
await page.waitForURL('**/summary', { timeout: 20000 });
await page.waitForTimeout(1200);
const summary = await page.textContent('body');
if (!summary.includes('Workout abgeschlossen')) problems.push('Zusammenfassung fehlt');
else log('✓ Workout abgeschlossen, Zusammenfassung angezeigt');
if (!/Rekord/.test(summary)) problems.push('Keine PR-Erkennung in der Zusammenfassung');
else log('✓ Persönliche Rekorde erkannt');

// --- 6. Nutrition: add a food and verify the totals -------------------------
await page.goto(`${BASE}/nutrition`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.locator('button:has-text("Lebensmittel hinzufügen")').first().click();
await page.waitForTimeout(1200);
await page.fill('input[type=search]', 'Banane');
await page.waitForTimeout(800);
await page.locator('button:has-text("Banane")').first().click();
await page.waitForTimeout(800);
await page.locator('button:has-text("Hinzufügen")').last().click();
await page.waitForTimeout(1800);
const nutri = await page.textContent('body');
if (!nutri.includes('Banane')) problems.push('Lebensmittel wurde nicht zur Mahlzeit hinzugefügt');
else log('✓ Lebensmittel geloggt, Tagesübersicht aktualisiert');

// --- 7. Bottom navigation works on mobile ----------------------------------
for (const [label, expect] of [['Fortschritt', '/progress'], ['Home', '/dashboard']]) {
  await page.locator(`nav a:has-text("${label}")`).filter({ visible: true }).first().click();
  await page.waitForTimeout(1200);
  if (!page.url().includes(expect)) problems.push(`Mobile Navigation "${label}" führt nicht zu ${expect}`);
}
log('✓ Mobile Navigation funktioniert');

await browser.close();
console.log('\n' + (problems.length ? 'PROBLEME:\n' + [...new Set(problems)].join('\n') : '=== ALLE UI-TESTS BESTANDEN ==='));
