import { dietLabel, formatMinutes } from './format.js';
import { ingredientKey, ingredientMatches } from './ingredients.js';
import { normalizeRecipes } from './recipes.js';

/**
 * Demo mode: no backend, no key. Replays pre-generated presets (src/demo/) with
 * realistic timing so visitors still see the real loading experience:
 * skeletons first, then the recipes, then photos arriving one by one.
 */
export const DEMO_TIMING = { recipes: 1200, firstImage: 450, betweenImages: 550 };

function sameIngredients(a, b) {
  const keysA = new Set(a.map(ingredientKey));
  const keysB = new Set(b.map(ingredientKey));
  return keysA.size === keysB.size && [...keysA].every((key) => keysB.has(key));
}

function overlap(userIngredients, presetIngredients) {
  return userIngredients.filter((mine) => presetIngredients.some((theirs) => ingredientMatches(mine, theirs))).length;
}

/** Lexicographic comparison of score tuples: positive when `a` is better. */
function compareScores(a, b) {
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/**
 * Pick the preset that best fits the request: an exact ingredient match if there
 * is one, otherwise the greatest ingredient overlap (ties go to the same diet,
 * then the closest time limit, then list order).
 */
export function findClosestPreset({ ingredients = [], diet, time } = {}, presets) {
  if (!presets?.length) throw new Error('No demo presets available');

  const exact = presets.find((preset) => sameIngredients(ingredients, preset.ingredients));
  if (exact) {
    return { preset: exact, exact: true, sameSettings: exact.diet === diet && exact.time === time };
  }

  let best = null;
  presets.forEach((preset, index) => {
    const score = [
      overlap(ingredients, preset.ingredients),
      preset.diet === diet ? 1 : 0,
      -Math.abs((Number(time) || 0) - preset.time),
      -index,
    ];
    if (!best || compareScores(score, best.score) > 0) best = { preset, score };
  });
  return { preset: best.preset, exact: false, sameSettings: false };
}

export function demoNotice({ preset, exact, sameSettings }) {
  if (exact && sameSettings) return null;
  if (exact) {
    return `Live generation is off in this demo — these pre-generated recipes were made for ${dietLabel(preset.diet)} · up to ${formatMinutes(preset.time)}.`;
  }
  return `Live generation is off in this demo — showing the closest sample: ${preset.label}.`;
}

/** Promise that resolves after `ms`, or rejects with an AbortError when `signal` aborts. */
export function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    const abortError = () => new DOMException('The operation was aborted.', 'AbortError');
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(abortError());
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** Resolve once the browser has the image, reject if the file is missing or broken. */
export function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(src);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}

export function createDemoSource({ presets, timing = DEMO_TIMING, delay = wait, preload = preloadImage }) {
  return {
    canRetryImages: false,

    async generate(request, { signal } = {}) {
      await delay(timing.recipes, signal);
      const match = findClosestPreset(request, presets);
      const { preset } = match;
      const recipes = normalizeRecipes(preset.recipes);
      return {
        recipes,
        notice: demoNotice(match),
        async loadImage(index, { signal: imageSignal } = {}) {
          await delay(timing.firstImage + index * timing.betweenImages, imageSignal);
          const src = preset.images?.[index];
          if (!src) throw new Error('This sample has no photo');
          return preload(src);
        },
      };
    },
  };
}
