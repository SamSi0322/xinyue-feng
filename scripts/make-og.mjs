// The social cards (og:image, 1200×630) for the case-study pages that have their picture in scripts/og/.
// Each card is scripts/og/card.html filled in with the words below and photographed by headless Chromium.
//
//   cd scripts && npm install          (Playwright; its Chromium: npx playwright install chromium)
//   node make-og.mjs                   (every card)
//   node make-og.mjs otherworlds       (one card)
//
// Writes site/assets/img/og/<slug>.jpg. The older cards (Wizarding World, Edgeworth, Recipe Remix,
// Tic-Tac-Toe and the home page's og.jpg) were made before this script and have no entry here.
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '..', 'site', 'assets', 'img', 'og');

const CARDS = {
  'yuzu-onsen-capybaras': {
    title: ['Yuzu Onsen', 'Capybaras'],
    sub: 'A cozy pixel-art life sim',
    tag: 'JavaScript · HTML canvas · free winter demo',
  },
  otherworlds: {
    title: ['Otherworlds'],
    sub: 'A crossover boss mod for Terraria',
    tag: 'C# · tModLoader · 38 boss fights · in development',
  },
};

const wanted = process.argv.slice(2);
for (const slug of wanted) if (!CARDS[slug]) throw new Error(`no card called ${slug}: ${Object.keys(CARDS).join(', ')}`);

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const [slug, card] of Object.entries(CARDS)) {
    if (wanted.length && !wanted.includes(slug)) continue;
    await page.goto(pathToFileURL(path.join(here, 'og', 'card.html')).href);
    await page.evaluate((c) => window.render(c), { ...card, picture: `${slug}.webp` });
    const file = path.join(out, `${slug}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 90 });
    console.log('wrote', path.relative(path.join(here, '..'), file));
  }
} finally {
  await browser.close();
}
