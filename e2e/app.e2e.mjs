// End-to-end test of the packaged desktop app.
//
//   npm run test:e2e            builds an unpacked app, then runs every check
//   npm run test:e2e -- --no-build   reuse the last build
//   npm run test:e2e -- --big        also import a 2.3 GB ZIP (needs ~2.5 GB of free disk)
//
// It launches the real Electron executable and imports generated exports through the UI,
// checking that big exports stay fast, that memory is handed back while scrolling, and that
// nothing touches the network.
import { _electron as electron } from 'playwright-core';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync, rmSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import assert from 'node:assert/strict';
import { instagramZip, telegramJson, telegramMediaZip, whatsappMediaZip, whatsappText, writeHugeZip } from './fixtures.mjs';

const root = path.resolve(import.meta.dirname, '..');
const buildsDir = path.join(root, 'release-e2e');
const artifacts = path.join(root, 'e2e-output');
mkdirSync(artifacts, { recursive: true });
const withBig = process.argv.includes('--big');

// Every build goes to a fresh folder: Windows (Defender, the search indexer) sometimes keeps a
// finished app.asar locked for a while, which would break rebuilding in place.
const existingBuilds = () => (existsSync(buildsDir) ? readdirSync(buildsDir).filter(n => n.startsWith('run-')).sort() : []);
const exeOf = (run) => path.join(buildsDir, run, 'win-unpacked', 'Exportium.exe');

let run = existingBuilds().reverse().find(name => existsSync(exeOf(name)));
if (!process.argv.includes('--no-build') || !run) {
    run = `run-${Date.now()}`;
    console.log(`Building unpacked app into release-e2e/${run} ...`);
    execSync('npx tsc -p tsconfig.electron.json && npx vite build', { cwd: root, stdio: 'inherit' });
    execSync(`npx electron-builder --dir --publish never -c.directories.output=release-e2e/${run}`, {
        cwd: root,
        stdio: 'inherit',
        env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' },
    });
    for (const old of existingBuilds().filter(name => name !== run)) {
        try { rmSync(path.join(buildsDir, old), { recursive: true, force: true }); } catch { /* still locked: removed next time */ }
    }
}
const exe = exeOf(run);

// ---- fixtures
const WA_MESSAGES = 200_000;
const whatsappFile = path.join(artifacts, 'WhatsApp Chat with Alice.txt');
writeFileSync(whatsappFile, whatsappText(WA_MESSAGES));

const TG_MESSAGES = 100_000;
const telegramFile = path.join(artifacts, 'result.json');
writeFileSync(telegramFile, telegramJson(TG_MESSAGES));

const IG_MESSAGES = 40_000;
const IG_SMALL_PHOTOS = 1500;
const IG_BIG_PHOTOS = 3;
const instagramFile = path.join(artifacts, 'instagram-testuser-2024-01-01-abcd.zip');
const ig = await instagramZip({ messageCount: IG_MESSAGES, smallPhotos: IG_SMALL_PHOTOS, bigPhotos: IG_BIG_PHOTOS });
writeFileSync(instagramFile, ig.data);

const whatsappMediaFile = path.join(artifacts, 'WhatsApp Chat with Photos.zip');
writeFileSync(whatsappMediaFile, await whatsappMediaZip());
const telegramMediaFile = path.join(artifacts, 'telegram-photos.zip');
writeFileSync(telegramMediaFile, await telegramMediaZip());

// ---- harness
const failures = [];
const check = async (name, fn) => {
    const started = Date.now();
    try {
        await fn();
        console.log(`  ok   ${name} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    } catch (error) {
        failures.push(name);
        console.log(`  FAIL ${name}\n       ${error.message.split('\n').filter(Boolean).slice(0, 8).join('\n       ')}`);
    }
};

const app = await electron.launch({ executablePath: exe });
const userData = await app.evaluate(({ app }) => app.getPath('userData'));
const page = await app.firstWindow();
const externalRequests = [];
page.on('request', (req) => { if (/^https?:/.test(req.url())) externalRequests.push(req.url()); });
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
await page.waitForLoadState('domcontentloaded');

/** Tracks blob URLs that are alive, and main-thread stalls, from now on. */
const instrument = () => page.evaluate(() => {
    window.__live = new Set();
    window.__peakLive = 0;
    window.__longTasks = [];
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (blob) => { const url = create(blob); window.__live.add(url); window.__peakLive = Math.max(window.__peakLive, window.__live.size); return url; };
    URL.revokeObjectURL = (url) => { window.__live.delete(url); revoke(url); };
    new PerformanceObserver((list) => list.getEntries().forEach((e) => window.__longTasks.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] });
});

const openRoute = async (hash, marker) => {
    await page.evaluate((h) => { window.location.hash = h; }, hash);
    await page.waitForFunction((m) => document.body.innerText.includes(m), marker);
};

const messageRows = () => page.locator('[data-index]');
const domSize = () => page.evaluate(() => document.querySelectorAll('*').length);

/** The element that scrolls the chat: the nearest scrollable ancestor of the virtual rows. */
const scrollInfo = () => page.evaluate(() => {
    const row = document.querySelector('[data-index]');
    let el = row;
    while (el && !(el.scrollHeight > el.clientHeight + 50 && /(auto|scroll)/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
    return el ? { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, scrollTop: el.scrollTop } : null;
});
const scrollChatTo = (top) => page.evaluate((t) => {
    let el = document.querySelector('[data-index]');
    while (el && !(el.scrollHeight > el.clientHeight + 50 && /(auto|scroll)/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
    if (el) el.scrollTop = t;
}, top);

const waitFrames = (n = 3) => page.evaluate((count) => new Promise((resolve) => {
    let left = count;
    const tick = () => (--left <= 0 ? resolve() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
}), n);

/** Own messages sit on the right edge of the column, others on the left, and short text hugs its content. */
const assertBubbleLayout = async ({ ownText, otherText }) => {
    const geometry = await page.evaluate(([own, other]) => {
        const find = (text) => [...document.querySelectorAll('[id^="message-"]')].find((el) => el.textContent.includes(text));
        const measure = (el) => {
            const row = el.closest('[data-index]').getBoundingClientRect();
            const box = el.getBoundingClientRect();
            return { fromLeft: Math.round(box.left - row.left), fromRight: Math.round(row.right - box.right), width: Math.round(box.width), row: Math.round(row.width) };
        };
        return { own: measure(find(own)), other: measure(find(other)) };
    }, [ownText, otherText]);
    assert.ok(geometry.own.fromRight <= 2, `own bubble should hug the right edge (gap ${geometry.own.fromRight}px)`);
    assert.ok(geometry.own.fromLeft > 100, `own bubble should not span the whole column (left gap ${geometry.own.fromLeft}px)`);
    assert.ok(geometry.other.fromLeft <= 2, `other bubble should hug the left edge (gap ${geometry.other.fromLeft}px)`);
    assert.ok(geometry.other.fromRight > 100, `other bubble should not span the whole column (right gap ${geometry.other.fromRight}px)`);
    assert.ok(geometry.own.width < 300 && geometry.other.width < 300, `short text bubbles should hug their text (${geometry.own.width}px / ${geometry.other.width}px)`);
};

// ---------------------------------------------------------------- checks
await check('home page renders with bundled styles and font', async () => {
    await page.getByRole('heading', { level: 1 }).waitFor();
    assert.match(await page.evaluate(() => getComputedStyle(document.body).fontFamily), /Inter/);
    assert.notEqual(await page.evaluate(() => getComputedStyle(document.querySelector('h1')).color), 'rgb(0, 0, 0)');
});

await check(`WhatsApp: ${WA_MESSAGES.toLocaleString()} messages import without freezing the window`, async () => {
    await openRoute('#/app/whatsapp', 'WhatsApp');
    await instrument();
    await page.locator('input[type=file]').setInputFiles(whatsappFile);
    await page.getByText('Who are you in this chat?').waitFor({ timeout: 120000 });
    const longest = await page.evaluate(() => Math.max(0, ...window.__longTasks));
    assert.ok(longest < 1500, `main thread stalled for ${longest}ms while parsing`);
    await page.getByRole('button', { name: 'Alice' }).click();
    await messageRows().first().waitFor({ timeout: 30000 });
    assert.ok(await messageRows().count() < 80, 'rows should be virtualized');
    assert.ok(await domSize() < 3000, `DOM too large: ${await domSize()} nodes`);
    await page.screenshot({ path: path.join(artifacts, 'whatsapp.png') });
});

await check('WhatsApp: scrolling to the very first message of 200k works and stays light', async () => {
    const info = await scrollInfo();
    assert.ok(info && info.scrollHeight > info.clientHeight * 1000, 'the full history should be scrollable');
    await scrollChatTo(0);
    await page.locator('[id^="message-"][id$="-0"]').waitFor({ timeout: 10000 });
    assert.ok(await messageRows().count() < 80);
    await scrollChatTo(1e9); // clamps to the very bottom
    await page.locator(`[id^="message-"][id$="-${WA_MESSAGES - 1}"]`).waitFor({ timeout: 10000 });
});

await check('WhatsApp: the current date stays pinned at the top while scrolling 200k messages', async () => {
    const info = await scrollInfo();
    // The pill is hidden for the instant a day's own heading is at the very top, so nudge until it shows.
    const pinnedLabelAt = async (fraction) => {
        for (let nudge = 0; nudge < 8; nudge++) {
            await scrollChatTo(Math.floor(info.scrollHeight * fraction) + nudge * 137);
            await waitFrames(4);
            const label = await page.locator('[data-sticky-label]').first().textContent({ timeout: 500 }).catch(() => null);
            if (label) return label;
        }
        return null;
    };
    const first = await pinnedLabelAt(0.4);
    assert.match(first ?? '', /\d{4}/, `expected a date label, got "${first}"`);
    const second = await pinnedLabelAt(0.7);
    assert.notEqual(second, first, 'the pinned date should change as you scroll to a later day');
    const box = await page.locator('[data-sticky-label]').first().boundingBox();
    const listTop = await page.evaluate(() => {
        let node = document.querySelector('[data-index]');
        while (node && !(node.scrollHeight > node.clientHeight + 50)) node = node.parentElement;
        return node.getBoundingClientRect().top;
    });
    assert.ok(box && box.y >= listTop && box.y < listTop + 80, `the pill should sit at the top of the chat (pill ${box?.y}, list ${listTop})`);
});

await check('WhatsApp: search covers all 200k messages and jumping lands on the hit', async () => {
    const search = page.getByPlaceholder(/search/i).last();
    await search.fill('message number 123456');
    await page.getByText('Search Results').waitFor({ timeout: 15000 });
    // Hits are highlighted (split across elements): click the result whose full text matches, outside the chat rows.
    await page.evaluate(() => {
        const hit = [...document.querySelectorAll('*')].find(el => el.textContent === 'message number 123456' && !el.closest('[data-index]'));
        if (!hit) throw new Error('search result for message 123456 not found');
        hit.click();
    });
    await page.locator('[id^="message-"][id$="-123456"]').waitFor({ timeout: 10000 });
    assert.ok(await messageRows().count() < 80);
});

await check(`Telegram: ${TG_MESSAGES.toLocaleString()} messages import and scroll`, async () => {
    await openRoute('#/app/telegram', 'Telegram');
    await page.waitForFunction(() => !document.body.innerText.includes('WhatsApp'));
    await instrument();
    await page.locator('input[type=file]').first().setInputFiles(telegramFile);
    await messageRows().first().waitFor({ timeout: 120000 });
    assert.ok(await messageRows().count() < 80);
    await assertBubbleLayout({ ownText: `telegram message ${TG_MESSAGES - 2}`, otherText: `telegram message ${TG_MESSAGES - 1}` });
    const longest = await page.evaluate(() => Math.max(0, ...window.__longTasks));
    assert.ok(longest < 2500, `main thread stalled for ${longest}ms`);
    await scrollChatTo(0);
    await page.locator('#message-1').waitFor({ timeout: 10000 });
    await page.screenshot({ path: path.join(artifacts, 'telegram.png') });
});

await check(`Instagram: ${IG_MESSAGES.toLocaleString()} messages with ${ig.mediaCount.toLocaleString()} photos: thumbnails, bounded memory`, async () => {
    await openRoute('#/app/instagram', 'Instagram');
    await page.waitForFunction(() => !document.body.innerText.includes('Telegram Archive'));
    await instrument();
    await page.locator('input[type=file][accept=".zip"]').setInputFiles(instagramFile);
    await page.getByText('Friend One').first().waitFor({ timeout: 120000 });
    await messageRows().first().waitFor({ timeout: 60000 });

    // The three 3000x2000 photos are the newest messages: they must be decoded as <= 800px thumbnails.
    await page.waitForFunction(() => [...document.querySelectorAll('img')].some((i) => i.complete && i.naturalWidth > 0), null, { timeout: 30000 });
    const widths = await page.evaluate(() => [...document.querySelectorAll('img')].filter((i) => i.naturalWidth > 0).map((i) => i.naturalWidth));
    assert.ok(widths.length > 0, 'expected loaded photos');
    assert.ok(Math.max(...widths) <= 800, `inline photos should be thumbnails, got ${Math.max(...widths)}px wide`);
    await page.screenshot({ path: path.join(artifacts, 'instagram.png') });

    // Scroll the entire history, top to bottom through every photo, then check what is still alive.
    const info = await scrollInfo();
    assert.ok(info, 'chat should be scrollable');
    const step = Math.floor(info.clientHeight * 0.9);
    let maxRows = 0;
    let maxNodes = 0;
    for (let top = info.scrollHeight; top > 0; top -= step * 12) {
        await scrollChatTo(top);
        await waitFrames(2);
        maxRows = Math.max(maxRows, await messageRows().count());
        maxNodes = Math.max(maxNodes, await domSize());
    }
    await scrollChatTo(0);
    await waitFrames(5);
    const { live, peak } = await page.evaluate(() => ({ live: window.__live.size, peak: window.__peakLive }));
    assert.ok(maxRows < 80, `rendered ${maxRows} rows at once`);
    assert.ok(maxNodes < 4000, `DOM grew to ${maxNodes} nodes`);
    assert.ok(peak < 400, `blob URLs peaked at ${peak} with ${ig.mediaCount} photos in the chat: memory is not being released`);
    assert.ok(live < 400, `${live} blob URLs still alive`);
    // The Media tab lists every photo in the chat; it must be a virtual grid too.
    await page.getByRole('button', { name: 'Media', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('img, [class*="aspect-square"]').length > 0);
    await waitFrames(5);
    const galleryNodes = await domSize();
    assert.ok(galleryNodes < 4000, `Media tab created ${galleryNodes} DOM nodes for ${ig.mediaCount} photos`);
    await page.screenshot({ path: path.join(artifacts, 'instagram-media.png') });
    console.log(`       photos in chat: ${ig.mediaCount}, peak live blob URLs: ${peak}, max rows: ${maxRows}, max DOM nodes: ${maxNodes}`);
});

await check('Instagram: Media tab keeps its filter and position, and photos open full-size', async () => {
    // We are on the Media tab from the previous check. Narrow it to photos and scroll down.
    await page.getByRole('button', { name: 'Photos', exact: true }).click();
    const tile = page.locator('.group.aspect-square');
    await tile.first().waitFor();
    const gallery = () => page.evaluate(() => {
        let el = document.querySelector('.group.aspect-square');
        while (el && !(el.scrollHeight > el.clientHeight + 50 && /(auto|scroll)/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
        return el;
    });
    await page.evaluate(() => {
        let el = document.querySelector('.group.aspect-square');
        while (el && !(el.scrollHeight > el.clientHeight + 50 && /(auto|scroll)/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
        el.scrollTop = 3000;
    });
    await waitFrames(4);
    const before = await page.evaluate(() => {
        let el = document.querySelector('.group.aspect-square');
        while (el && !(el.scrollHeight > el.clientHeight + 50 && /(auto|scroll)/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
        return el.scrollTop;
    });
    assert.ok(before > 2000, 'gallery should have scrolled');

    // Away to the chat and back.
    await page.getByRole('button', { name: 'Messages', exact: true }).click();
    await page.getByRole('button', { name: 'Media', exact: true }).click();
    await tile.first().waitFor();
    await waitFrames(6);
    const classes = await page.getByRole('button', { name: 'Photos', exact: true }).getAttribute('class');
    assert.match(classes, /bg-pink-500/, 'the Photos filter should still be selected');
    const after = await page.evaluate(() => {
        let el = document.querySelector('.group.aspect-square');
        while (el && !(el.scrollHeight > el.clientHeight + 50 && /(auto|scroll)/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
        return el.scrollTop;
    });
    assert.ok(Math.abs(after - before) < 400, `gallery should return to where you were (${before} -> ${after})`);
    void gallery;

    // A gallery photo opens full-size and pages through the filtered photos.
    await page.waitForFunction(() => [...document.querySelectorAll('.group.aspect-square img')].some((i) => i.complete && i.naturalWidth > 0), null, { timeout: 30000 });
    await page.evaluate(() => {
        const scroller = (() => { let el = document.querySelector('.group.aspect-square'); while (el && !(el.scrollHeight > el.clientHeight + 50 && /(auto|scroll)/.test(getComputedStyle(el).overflowY))) el = el.parentElement; return el.getBoundingClientRect(); })();
        const visible = [...document.querySelectorAll('.group.aspect-square img[role="button"]')].find((img) => {
            const r = img.getBoundingClientRect();
            return r.top >= scroller.top && r.bottom <= scroller.bottom;
        });
        visible.click();
    });
    await page.getByRole('dialog').waitFor();
    assert.match(await page.getByRole('dialog').textContent(), new RegExp(`of ${ig.mediaCount.toLocaleString()}`));
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached' });
});

/** Every loaded inline photo must be drawn at its own proportions, not stretched to the bubble. */
const assertPhotosKeepProportions = async (expectedPhotos) => {
    await page.waitForFunction((n) => [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth > 0).length >= n, expectedPhotos, { timeout: 30000 });
    const photos = await page.evaluate(() => [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth > 0).map((i) => {
        const box = i.getBoundingClientRect();
        return { natural: i.naturalWidth / i.naturalHeight, drawn: box.width / box.height, w: Math.round(box.width), h: Math.round(box.height) };
    }));
    assert.ok(photos.length >= expectedPhotos, `expected ${expectedPhotos} photos, found ${photos.length}`);
    for (const p of photos) {
        const error = Math.abs(p.drawn - p.natural) / p.natural;
        assert.ok(error < 0.03, `photo drawn ${p.w}x${p.h} (ratio ${p.drawn.toFixed(2)}) but the picture is ${p.natural.toFixed(2)}: it is stretched`);
    }
    const ratios = photos.map((p) => p.natural.toFixed(1)).sort();
    assert.ok(ratios.some((r) => Number(r) > 2) && ratios.some((r) => Number(r) < 0.5), 'expected both a wide and a tall photo');
};

await check('WhatsApp: wide and tall photos in a ZIP are not stretched', async () => {
    await openRoute('#/app/whatsapp', 'WhatsApp');
    await page.waitForFunction(() => !document.body.innerText.includes('Telegram Archive'));
    await page.locator('input[type=file]').setInputFiles(whatsappMediaFile);
    await page.getByText('Who are you in this chat?').waitFor({ timeout: 30000 });
    await page.getByRole('button', { name: 'Alice' }).click();
    await assertPhotosKeepProportions(2);
    await assertBubbleLayout({ ownText: 'hello', otherText: 'nice' }); // owner is Alice; 'nice' is Bob's

    // Clicking a photo opens it at full resolution; arrows page through; Escape returns to the chat.
    const photos = page.locator('img[role="button"][aria-label="View photo full size"]');
    await photos.first().click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    const fullWidth = () => page.evaluate(() => document.querySelector('[role="dialog"] img[alt="Full-size photo"]')?.naturalWidth ?? 0);
    await page.waitForFunction(() => (document.querySelector('[role="dialog"] img[alt="Full-size photo"]')?.naturalWidth ?? 0) >= 1000, null, { timeout: 15000 });
    assert.equal(await fullWidth(), 3000, 'the wide photo should open at its original 3000px width, not the 800px preview');
    assert.match(await dialog.textContent(), /1 of 2/);
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.textContent.includes('2 of 2'));
    await page.waitForFunction(() => document.querySelector('[role="dialog"] img[alt="Full-size photo"]')?.naturalWidth === 1000, null, { timeout: 15000 });
    await page.screenshot({ path: path.join(artifacts, 'whatsapp-lightbox.png') });
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    await page.screenshot({ path: path.join(artifacts, 'whatsapp-photos.png') });
});

await check('Telegram: wide and tall photos in a ZIP are not stretched', async () => {
    await openRoute('#/app/telegram', 'Telegram');
    await page.waitForFunction(() => !document.body.innerText.includes('WhatsApp'));
    await page.locator('input[type=file]').first().setInputFiles(telegramMediaFile);
    await messageRows().first().waitFor({ timeout: 30000 });
    await assertPhotosKeepProportions(2);
    await page.screenshot({ path: path.join(artifacts, 'telegram-photos.png') });
});

if (withBig) {
    const hugeZip = path.join(artifacts, 'WhatsApp Chat with Big.zip');
    await check('WhatsApp: a 2.3 GB ZIP opens without loading it into memory', async () => {
        await writeHugeZip(hugeZip, {
            chatName: '_chat.txt',
            chatText: whatsappText(2000),
            fillerName: 'media/huge-video.bin',
            fillerBytes: 2_300_000_000,
        });
        assert.ok(statSync(hugeZip).size > 2_300_000_000);
        await openRoute('#/app/whatsapp', 'WhatsApp');
        await page.getByRole('button', { name: /Process Another|Back/ }).first().click().catch(() => {});
        await page.waitForFunction(() => document.body.innerText.includes('Select Chat File'), null, { timeout: 15000 }).catch(() => {});
        const started = Date.now();
        await page.locator('input[type=file]').setInputFiles(hugeZip);
        await page.getByText('Who are you in this chat?').waitFor({ timeout: 120000 });
        const seconds = (Date.now() - started) / 1000;
        const heapMb = await page.evaluate(() => Math.round(performance.memory.usedJSHeapSize / 1048576));
        assert.ok(heapMb < 600, `JS heap is ${heapMb} MB`);
        console.log(`       opened in ${seconds.toFixed(1)}s, JS heap ${heapMb} MB`);
    });
    rmSync(hugeZip, { force: true });
}

await check('no network requests were made (fully offline)', async () => {
    assert.deepEqual(externalRequests, []);
});

await check('no uncaught page errors', async () => {
    assert.deepEqual(pageErrors, []);
});

await check('renderer errors reach the log file', async () => {
    await page.evaluate(() => window.electronAPI.logError('e2e probe', 'stack'));
    await new Promise((r) => setTimeout(r, 500));
    const logPath = path.join(userData, 'logs', 'main.log');
    assert.ok(existsSync(logPath), `missing ${logPath}`);
    assert.match(readFileSync(logPath, 'utf8'), /Renderer: e2e probe/);
});

await app.close();

if (failures.length) {
    console.error(`\n${failures.length} check(s) failed: ${failures.join('; ')}`);
    process.exit(1);
}
console.log('\nAll end-to-end checks passed.');
