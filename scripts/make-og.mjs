// The social cards (og:image, 1200×630): one for the home and About pages and one for each case study.
// Each card is scripts/og/card.html filled in with the words below (and the case study's picture, scripts/og/<slug>.webp,
// 520×420) and photographed by headless Chromium.
//
//   cd scripts && npm install          (Playwright; its Chromium: npx playwright install chromium)
//   node make-og.mjs                   (every card)
//   node make-og.mjs otherworlds       (one card)
//
// Writes site/assets/img/og/<slug>.jpg, and site/assets/img/og.jpg for the home page.
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '..', 'site', 'assets', 'img', 'og');

const CARDS = {
  home: {
    home: true,
    title: ['Xinyue Feng'],
    sub: 'Computer Science student at Kean University, class of 2027 · HCI and user-centered design',
  },
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
  'wizarding-world': {
    title: ['Wizarding', 'World'],
    sub: 'A Harry Potter mod for Terraria',
    tag: 'C# · tModLoader · 12 boss fights',
  },
  edgeworth: {
    title: ['The Adventures', 'of Edgeworth'],
    sub: 'An Ace Attorney platformer you can play in the browser',
    tag: 'Java · Swing · HTML canvas',
  },
  'recipe-remix': {
    title: ['AI Recipe', 'Remix'],
    sub: 'From leftovers to plated recipes',
    tag: 'React · Express · OpenAI API',
  },
  'tic-tac-toe': {
    title: ['Tic-Tac-Toe', 'vs. AI'],
    sub: 'Three opponents, one unbeatable',
    tag: 'JavaScript · minimax · explainable AI',
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
    const file = card.home ? path.join(out, '..', 'og.jpg') : path.join(out, `${slug}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 90 });
    console.log('wrote', path.relative(path.join(here, '..'), file));
  }
} finally {
  await browser.close();
}
