// Layout checks for site/: every page at phone, tablet and desktop sizes, in both themes.
//
//   cd scripts && npm install          (Playwright; its browsers: npx playwright install chromium webkit firefox)
//   node check-site.mjs                (Chromium; ENGINE=webkit or ENGINE=firefox for the others)
//   node check-site.mjs --shots <dir>  (also saves the first screen of every page, and full pages at 390×664)
//   node check-site.mjs --self-test    (plants an overlapping link on the home page and expects it to be found)
//
// For each page it reports a page that scrolls sideways, pictures that don't load, links to missing files or
// anchors, and overlaps: any two lines of text, controls or pictures whose boxes cross. Phone heights matter as
// much as widths: in a real phone browser (toolbars showing) the first screen is only 550–670 px tall, which is
// where positioned elements run into the text around them.
import { chromium, webkit, firefox } from 'playwright';
import { fileURLToPath } from 'node:url';
import { existsSync, statSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(here, '..', 'site');
const args = process.argv.slice(2);
const SHOTS = args.includes('--shots') ? path.resolve(args[args.indexOf('--shots') + 1]) : null;
const SELF_TEST = args.includes('--self-test');
const ENGINE = process.env.ENGINE || 'chromium';

const PAGES = ['', 'about/', 'work/yuzu-onsen-capybaras/', 'work/otherworlds/', 'work/wizarding-world/', 'work/edgeworth/',
  'work/recipe-remix/', 'work/tic-tac-toe/', '404.html'];
const SIZES = SELF_TEST ? [[390, 664]]
  : [[320, 568], [375, 553], [390, 600], [390, 664], [393, 659], [844, 390], [768, 1024], [1366, 657], [1440, 900]];
const THEMES = SELF_TEST ? ['dark'] : ['dark', 'light'];

// The site as GitHub Pages serves it, under /xinyue-feng/, without a server.
const ORIGIN = 'http://site.local';
const BASE = `${ORIGIN}/xinyue-feng/`;
const fileFor = (url) => {
  let p = decodeURIComponent(new URL(url).pathname);
  if (!p.startsWith('/xinyue-feng/')) return null;
  p = p.slice('/xinyue-feng/'.length);
  if (p === '' || p.endsWith('/')) p += 'index.html';
  const file = path.join(SITE, p);
  return file.startsWith(SITE + path.sep) && existsSync(file) && !statSync(file).isDirectory() ? file : null;
};

// Runs in the page. Text is measured line by line; its boxes are trimmed top and bottom, because a font's box
// is taller than its letters (a big title's box reaches into the line under it without touching it).
function findOverlaps() {
  const unseen = (el) => el.closest('[aria-hidden="true"], .sr-only') || (el.closest('details:not([open])') && !el.closest('summary'))
    || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  const name = (el) => `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).join('.')}` : ''}`;
  const boxes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!n.textContent.trim() || !el || el.closest('script, style, noscript, template') || unseen(el)) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) {
      const trim = r.height * 0.18;
      if (r.width > 1 && r.height > 1) boxes.push({ el, left: r.left, right: r.right, top: r.top + trim, bottom: r.bottom - trim, what: `"${n.textContent.trim().slice(0, 30)}" in ${name(el)}` });
    }
  }
  for (const el of document.querySelectorAll('img, video, svg, canvas, input, select, textarea, button, iframe')) {
    if (unseen(el) || (el.tagName.toLowerCase() !== 'svg' && el.closest('svg'))) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 1 && r.height > 1) boxes.push({ el, left: r.left, right: r.right, top: r.top, bottom: r.bottom, what: name(el), replaced: true });
  }
  const found = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
      // A label laid over a picture inside one link or button (the "Play here" posters) is meant to overlap it.
      const holder = a.el.closest('a, button');
      if (holder && holder === b.el.closest('a, button') && (a.replaced || b.replaced)) continue;
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w > 1.5 && h > 1.5) found.push(`${a.what} × ${b.what} (${Math.round(w)}×${Math.round(h)} px at ${Math.round(Math.max(a.left, b.left))},${Math.round(Math.max(a.top, b.top) + scrollY)})`);
    }
  }
  return found;
}

const problems = new Set();
const external = new Set();
let loads = 0;
const browser = await { chromium, webkit, firefox }[ENGINE].launch();
try {
  for (const theme of THEMES) {
    for (const [width, height] of SIZES) {
      const phone = width < 768;
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', hasTouch: phone,
        ...(ENGINE === 'firefox' ? {} : { isMobile: phone }) });
      if (theme === 'light') await context.addInitScript(() => { try { localStorage.setItem('theme', 'light'); } catch { /* none */ } });
      await context.route('**/*', (route) => {
        const url = route.request().url();
        if (/^(blob|data):/.test(url)) return route.continue(); // WebKit routes these too
        if (!url.startsWith(ORIGIN)) { external.add(url); return route.abort(); }
        const file = fileFor(url);
        if (!file) { problems.add(`missing file: ${url}`); return route.fulfill({ status: 404, body: 'not found' }); }
        return route.fulfill({ path: file });
      });
      const page = await context.newPage();
      page.on('pageerror', (e) => problems.add(`script error on ${page.url()}: ${e.message}`));
      const linked = new Set();
      for (const p of PAGES) {
        const where = `${theme} ${width}×${height} /${p}`;
        await page.goto(BASE + p, { waitUntil: 'load' });
        await page.evaluate(async () => {
          await document.fonts.ready;
          for (const img of document.images) img.loading = 'eager';
          await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
        });
        if (SELF_TEST && p === '') {
          await page.evaluate(() => {
            const r = document.querySelector('.btn').getBoundingClientRect();
            const a = Object.assign(document.createElement('a'), { href: '#', textContent: 'Planted link' });
            Object.assign(a.style, { position: 'absolute', left: `${r.left + 4}px`, top: `${r.top + scrollY + 4}px` });
            document.body.append(a);
          });
        }
        const seen = await page.evaluate(() => ({
          sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          broken: [...document.images].filter((i) => !i.naturalWidth).map((i) => i.currentSrc || i.getAttribute('src')),
          anchors: [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href'))
            .filter((h) => h.length > 1 && !document.getElementById(h.slice(1))),
          theme: document.documentElement.getAttribute('data-theme') || 'dark',
          links: [
            ...[...document.querySelectorAll('a[href], link[href]')].map((el) => el.href),
            ...[...document.querySelectorAll('img[src], source[src], script[src]')].map((el) => el.src),
            ...[...document.querySelectorAll('video[poster]')].map((el) => el.poster),
            ...[...document.querySelectorAll('[srcset]')].flatMap((el) => el.getAttribute('srcset').split(',')
              .map((part) => new URL(part.trim().split(/\s+/)[0], location.href).href)),
          ],
        }));
        loads++;
        if (seen.theme !== theme) problems.add(`${where}: shows the ${seen.theme} theme`);
        if (seen.sideways > 0) problems.add(`${where}: the page scrolls sideways by ${seen.sideways}px`);
        for (const src of seen.broken) problems.add(`${where}: picture did not load: ${src}`);
        for (const a of seen.anchors) problems.add(`${where}: link to a missing anchor ${a}`);
        for (const o of await page.evaluate(findOverlaps)) problems.add(`${where}: overlap ${o}`);
        for (const l of seen.links) linked.add(l.split('#')[0]);
        if (SHOTS && ['390x664', '375x553', '844x390', '1366x657'].includes(`${width}x${height}`)) {
          mkdirSync(SHOTS, { recursive: true });
          const slug = p.replace(/\/$/, '').replace(/[/.]/g, '-') || 'home';
          await page.screenshot({ path: path.join(SHOTS, `${ENGINE}-${theme}-${width}x${height}-${slug}.png`) });
          if (width === 390 && height === 664) await page.screenshot({ path: path.join(SHOTS, `${ENGINE}-${theme}-full-${slug}.png`), fullPage: true });
        }
      }
      for (const url of linked) {
        if (url.startsWith(ORIGIN)) { if (!fileFor(url)) problems.add(`broken link: ${url}`); }
        else if (/^https?:/.test(url)) external.add(url);
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log(`${ENGINE}: ${loads} page loads checked`);
if (external.size) console.log(`links to other sites (not checked):\n  ${[...external].sort().join('\n  ')}`);
if (SELF_TEST) {
  const caught = [...problems].some((p) => p.includes('Planted link'));
  console.log(caught ? 'self-test: the planted overlap was found' : 'self-test FAILED: the planted overlap was not found');
  process.exit(caught ? 0 : 1);
}
for (const p of problems) console.log(`  ${p}`);
console.log(problems.size ? `${problems.size} problems` : 'no problems');
process.exit(problems.size ? 1 : 0);
