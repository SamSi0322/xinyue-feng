// The PDF portfolio: pdf/portfolio.html printed by headless Chromium to site/assets/xinyue-feng-portfolio.pdf
// (A4 landscape, the page size the stylesheet sets). The site links to it for download.
//
//   cd scripts && npm install          (Playwright; its Chromium: npx playwright install chromium)
//   node build-pdf.mjs
//
// Look at every page before committing a new PDF, for example:
//   pdftoppm -r 60 -png ../site/assets/xinyue-feng-portfolio.pdf <somewhere>/page
//
// Chromium keeps a JPEG as it is in a PDF but stores any other picture uncompressed-then-zipped, which made the
// first build 34 MB. So before printing, each large picture is redrawn as a JPEG no bigger than its place on the
// page needs (DPI below): small sprites, pixel-scaled pictures and the SVG seal are left alone.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

const DPI = 200;
const QUALITY = 0.86;

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const out = path.join(root, 'site', 'assets', 'xinyue-feng-portfolio.pdf');

// The repository served at a made-up origin, so the page may read its own pictures back (a canvas drawn from
// file:// pictures is "tainted" and can't be exported).
const ORIGIN = 'http://portfolio.local';

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const problems = [];
  await page.route(`${ORIGIN}/**`, (route) => {
    const file = path.join(root, decodeURIComponent(new URL(route.request().url()).pathname));
    if (!file.startsWith(root + path.sep) || !existsSync(file)) return route.fulfill({ status: 404, body: 'not found' });
    return route.fulfill({ path: file });
  });
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`); });
  page.on('pageerror', (e) => problems.push(`script error: ${e.message}`));
  await page.goto(`${ORIGIN}/pdf/portfolio.html`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const broken = await page.evaluate(() => [...document.images].filter((i) => !i.complete || !i.naturalWidth).map((i) => i.getAttribute('src')));
  for (const src of broken) problems.push(`picture did not load: ${src}`);

  // Anything that runs into the page's footer, or off its edge, would be cut off or overlap.
  const spills = await page.evaluate(() => [...document.querySelectorAll('.page')].flatMap((p, i) => {
    const box = p.getBoundingClientRect();
    const floor = box.bottom - parseFloat(getComputedStyle(p).paddingBottom);
    return [...p.querySelectorAll('*')]
      .filter((el) => !el.classList.contains('bleed') && !el.closest('.foot'))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width && r.height && (r.bottom > floor + 0.5 || r.right > box.right + 0.5);
      })
      .map((el) => `page ${i + 1}: <${el.tagName.toLowerCase()} class="${el.className}"> runs ${Math.round(el.getBoundingClientRect().bottom - floor)}px into the footer or off the page`);
  }));
  problems.push(...spills);
  // Code too wide for its box is cut off at the edge.
  const clipped = await page.evaluate(() => [...document.querySelectorAll('pre')]
    .filter((el) => el.scrollWidth > el.clientWidth + 1)
    .map((el) => `code block cut off: ${el.textContent.split('\n').sort((a, b) => b.length - a.length)[0]}`));
  problems.push(...clipped);
  if (problems.length) throw new Error(problems.join('\n'));

  const saved = await page.evaluate(async ({ dpi, quality }) => {
    const uses = new Map();
    for (const img of document.images) {
      const r = img.getBoundingClientRect();
      // The scale the picture is drawn at (object-fit: cover crops, so the larger of the two).
      const scale = Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight);
      const u = uses.get(img.currentSrc) || { scale: 0, imgs: [] };
      u.scale = Math.max(u.scale, scale);
      u.imgs.push(img);
      uses.set(img.currentSrc, u);
    }
    const report = [];
    for (const [src, { scale, imgs }] of uses) {
      const img = imgs[0];
      if (/\.svg$/i.test(src) || img.naturalWidth < 600 || imgs.some((i) => getComputedStyle(i).imageRendering === 'pixelated')) continue;
      const w = Math.min(img.naturalWidth, Math.ceil(img.naturalWidth * scale * dpi / 96));
      const h = Math.round(img.naturalHeight * w / img.naturalWidth);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      const jpeg = canvas.toDataURL('image/jpeg', quality);
      for (const i of imgs) {
        i.removeAttribute('srcset');
        i.src = jpeg;
      }
      await Promise.all(imgs.map((i) => i.decode()));
      report.push(`${src.split('/').slice(-2).join('/')} ${img.naturalWidth}px -> ${w}px`);
    }
    return report;
  }, { dpi: DPI, quality: QUALITY });
  console.log(`${saved.length} pictures redrawn as JPEG for print`);

  await page.pdf({ path: out, preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
  const pages = await page.evaluate(() => document.querySelectorAll('.page').length);
  console.log(`wrote ${path.relative(root, out)}: ${pages} pages, ${(statSync(out).size / 1e6).toFixed(1)} MB`);
} finally {
  await browser.close();
}
