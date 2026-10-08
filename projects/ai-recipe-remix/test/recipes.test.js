import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { dietLabel, formatList, formatMinutes, formatMinutesLong } from '../src/lib/format.js';
import { MAX_IMAGE_PROMPT_LENGTH, buildImagePrompt } from '../src/lib/imagePrompt.js';
import { recipeToText } from '../src/lib/recipeText.js';
import { normalizeRecipes } from '../src/lib/recipes.js';

const recipe = {
  title: 'Tomato Egg Toast',
  summary: 'Soft eggs and jammy tomatoes on toast.',
  timeMinutes: 15,
  servings: 2,
  difficulty: 'easy',
  ingredients: [
    { item: 'eggs', amount: '4 large', optional: false },
    { item: 'chives', amount: '', optional: true },
  ],
  steps: ['Toast the bread.', 'Scramble the eggs.'],
  substitutions: ['Use sourdough.'],
  allergens: ['eggs', 'wheat (gluten)'],
  tips: ['Keep the heat low.'],
};

describe('normalizeRecipes', () => {
  test('keeps well-formed recipes as they are', () => {
    assert.deepEqual(normalizeRecipes([recipe]), [recipe]);
  });

  test('repairs or drops malformed data instead of crashing', () => {
    const [fixed, ...rest] = normalizeRecipes([
      { title: ' Soup ', timeMinutes: '25', servings: -1, difficulty: 'Hard', ingredients: ['salt', null, { item: '' }], steps: 'stir' },
      null,
      { summary: 'no title' },
      'nope',
    ]);
    assert.equal(rest.length, 0);
    assert.equal(fixed.title, 'Soup');
    assert.equal(fixed.timeMinutes, 25);
    assert.equal(fixed.servings, null);
    assert.equal(fixed.difficulty, 'hard');
    assert.deepEqual(fixed.ingredients, [{ item: 'salt', amount: '', optional: false }]);
    assert.deepEqual(fixed.steps, []);
    assert.deepEqual(normalizeRecipes(undefined), []);
  });
});

describe('recipeToText', () => {
  test('produces a readable plain-text recipe', () => {
    const text = recipeToText(recipe);
    assert.match(text, /^Tomato Egg Toast\nSoft eggs and jammy tomatoes on toast\.\n\nTime: 15 min · Serves: 2 · Difficulty: Easy/);
    assert.match(text, /INGREDIENTS\n- eggs — 4 large\n- chives \(optional\)/);
    assert.match(text, /STEPS\n1\. Toast the bread\.\n2\. Scramble the eggs\./);
    assert.match(text, /SUBSTITUTIONS\n- Use sourdough\./);
    assert.match(text, /ALLERGENS\neggs, wheat \(gluten\)/);
    assert.match(text, /TIPS\n- Keep the heat low\./);
  });

  test('skips empty sections', () => {
    const text = recipeToText({ ...recipe, substitutions: [], allergens: [], tips: [] });
    assert.doesNotMatch(text, /SUBSTITUTIONS|ALLERGENS|TIPS/);
  });
});

describe('buildImagePrompt', () => {
  test('keeps the original prompt wording', () => {
    assert.equal(
      buildImagePrompt(recipe),
      'High quality food photography of: Tomato Egg Toast. Soft eggs and jammy tomatoes on toast.\n' +
        'Plated nicely, realistic lighting, no text, no watermark, 1 dish centered.',
    );
  });

  test('always fits the 600-character server limit', () => {
    const long = buildImagePrompt({ title: 'Stew', summary: 'word '.repeat(400) });
    assert.ok(long.length <= MAX_IMAGE_PROMPT_LENGTH);
    assert.match(long, /…\nPlated nicely/);
    const absurd = buildImagePrompt({ title: 'T'.repeat(2000), summary: 'S'.repeat(2000) });
    assert.ok(absurd.length <= MAX_IMAGE_PROMPT_LENGTH);
    assert.equal(buildImagePrompt({}).startsWith('High quality food photography of: a home-cooked dish.'), true);
  });
});

describe('format helpers', () => {
  test('formatMinutes', () => {
    assert.equal(formatMinutes(20), '20 min');
    assert.equal(formatMinutes(60), '1 hr');
    assert.equal(formatMinutes(95), '1 hr 35 min');
    assert.equal(formatMinutes(null), '');
    assert.equal(formatMinutesLong(95), '1 hour 35 minutes');
    assert.equal(formatMinutesLong(120), '2 hours');
    assert.equal(formatMinutesLong(5), '5 minutes');
  });

  test('dietLabel and formatList', () => {
    assert.equal(dietLabel('gluten_free'), 'Gluten-free');
    assert.equal(dietLabel('none'), 'No preference');
    assert.equal(formatList(['eggs', 'tomato', 'bread']), 'eggs, tomato and bread');
    assert.equal(formatList(['eggs']), 'eggs');
  });
});
