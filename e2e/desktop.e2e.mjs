// Checks of the desktop-only features, against the real packaged app (a short companion to app.e2e.mjs):
// reopening a recent export from its path, remembered settings, the network block, the update bridge.
//
//   npm run test:e2e:desktop            builds an unpacked app first
//   npm run test:e2e:desktop -- --no-build
import { _electron as electron } from 'playwright-core';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const buildsDir = path.join(root, 'release-e2e');
const artifacts = path.join(root, 'e2e-output');
mkdirSync(artifacts, { recursive: true });

const builds = () => (existsSync(buildsDir) ? readdirSync(buildsDir).filter(n => n.startsWith('run-')).sort() : []);
const exeOf = (run) => path.join(buildsDir, run, 'win-unpacked', 'Exportium.exe');
let run = builds().reverse().find(name => existsSync(exeOf(name)));
if (!process.argv.includes('--no-build') || !run) {
    run = `run-${Date.now()}`;
    console.log(`Building unpacked app into release-e2e/${run} ...`);
    execSync('npx tsc -p tsconfig.electron.json && npx vite build', { cwd: root, stdio: 'inherit' });
    execSync(`npx electron-builder --dir --publish never -c.directories.output=release-e2e/${run}`, {
        cwd: root, stdio: 'inherit', env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' },
    });
    for (const old of builds().filter(name => name !== run)) {
        try { rmSync(path.join(buildsDir, old), { recursive: true, force: true }); } catch { /* still locked: removed next time */ }
    }
}

// A WhatsApp export whose dates are US-style (one day above 12 proves it), with a photo-less document line.
const chatFile = path.join(artifacts, 'WhatsApp Chat with Pat.txt');
writeFileSync(chatFile, [
    '3/4/23, 9:00 AM - Pat: morning',
    '3/14/23, 9:05 AM - Sam: Notes.pdf (file attached) read this',
    '3/14/23, 9:06 AM - Pat: see https://example.com/page',
].join('\n'));

const failures = [];
const check = async (name, fn) => {
    try { await fn(); console.log(`  ok   ${name}`); }
    catch (error) { failures.push(name); console.log(`  FAIL ${name}\n       ${error.message.split('\n').filter(Boolean).slice(0, 6).join('\n       ')}`); }
};

const launch = () => electron.launch({ executablePath: exeOf(run) });
let app = await launch();
const userData = await app.evaluate(({ app: a }) => a.getPath('userData'));
let page = await app.firstWindow();
await page.waitForLoadState('domcontentloaded');
await page.evaluate(() => localStorage.clear());

const openWhatsApp = async () => {
    await page.evaluate(() => { window.location.hash = '#/app/whatsapp'; });
    await page.waitForFunction(() => document.body.innerText.includes('WhatsApp'));
};
const isLoaded = () => page.locator('[data-index]').first().waitFor({ timeout: 15000 });

await check('the desktop bridge is there and the version matches', async () => {
    const version = await page.evaluate(() => window.electronAPI.getVersion());
    assert.equal(version, JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).version);
    assert.equal(await page.evaluate(() => typeof window.electronAPI.pathForFile), 'function');
});

await check('a US-format chat is read month-first, shown with its document and link', async () => {
    await openWhatsApp();
    await page.locator('input[type=file]').setInputFiles(chatFile);
    await page.getByRole('button', { name: 'Pat', exact: true }).click();
    await isLoaded();
    const body = await page.evaluate(() => document.body.innerText);
    assert.match(body, /Notes\.pdf/);
    assert.match(body, /Tuesday, March 14, 2023|Friday, March 14, 2023|March 14, 2023/);
    assert.match(body, /Tuesday, March 14, 2023/, '3/14/23 is a Tuesday: dates must be read month-first');
});

await check('the export is remembered with its path, and its owner and stars survive a restart', async () => {
    await page.evaluate(() => window.location.hash = '#/app/whatsapp');
    // star the first message, then close the app
    await page.locator('button[aria-label="Star this message"]').first().click({ force: true });
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('exportium:recents') ?? '[]'));
    assert.equal(stored.length, 1);
    assert.match(stored[0].path, /WhatsApp Chat with Pat\.txt$/);
    const stars = await page.evaluate(() => Object.entries(localStorage).filter(([k]) => k.includes('prefs:')).map(([, v]) => JSON.parse(v).stars));
    assert.equal(stars.length, 1);
    await page.evaluate(() => { window.__keep = JSON.stringify(Object.entries(localStorage)); });
    const snapshot = await page.evaluate(() => window.__keep);
    await app.close();

    app = await launch();
    page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate((entries) => { for (const [k, v] of JSON.parse(entries)) localStorage.setItem(k, v); }, snapshot);
    await openWhatsApp();
});

await check('a recent export reopens with one click: no file picker, owner remembered, star still there', async () => {
    await page.reload();
    await page.waitForFunction(() => /recent/i.test(document.body.innerText));
    await page.getByRole('button', { name: /^WhatsApp Chat with Pat\.txt/ }).click();
    await isLoaded();
    assert.ok(!(await page.evaluate(() => document.body.innerText.includes('Who are you in this chat?'))), 'the owner should have been remembered');
    assert.equal(await page.locator('button[aria-label="Remove star"][aria-pressed="true"]').count() >= 1, true, 'the star should still be there');
});

await check('the packaged app refuses to talk to the internet', async () => {
    const outcome = await page.evaluate(async () => {
        try { await fetch('https://example.com/', { mode: 'no-cors' }); return 'reached'; } catch { return 'blocked'; }
    });
    assert.equal(outcome, 'blocked');
    const log = readFileSync(path.join(userData, 'logs', 'main.log'), 'utf8');
    assert.match(log, /Blocked network request to https:\/\/example\.com/);
});

await check('Home shows the version, update check and log folder buttons', async () => {
    await page.evaluate(() => { window.location.hash = '#/'; });
    await page.getByRole('button', { name: 'Check for updates' }).waitFor();
    await page.getByRole('button', { name: 'Open log folder' }).waitFor();
    assert.match(await page.evaluate(() => document.body.innerText), /Version \d+\.\d+\.\d+/);
    await page.getByRole('button', { name: 'Check for updates' }).click();
    await page.getByRole('status').filter({ hasText: /./ }).first().waitFor({ timeout: 15000 });
});

await app.close();
if (failures.length) { console.error(`\n${failures.length} check(s) failed: ${failures.join('; ')}`); process.exit(1); }
console.log('\nAll desktop checks passed.');
