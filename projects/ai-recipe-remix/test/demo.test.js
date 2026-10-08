import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { RECIPES_SCHEMA } from '../server/src/recipe-schema.js';
import { DEMO_TIMING, createDemoSource, demoNotice, findClosestPreset, wait } from '../src/lib/demo.js';
import { defaultPreset, presets } from '../src/demo/presets.js';

/** Minimal JSON Schema check for the keywords the server schema uses. */
function schemaErrors(schema, value, path = '$') {
  const errors = [];
  switch (schema.type) {
    case 'object':
      if (!value || typeof value !== 'object' || Array.isArray(value)) return [`${path} should be an object`];
      for (const key of schema.required ?? []) if (!(key in value)) errors.push(`${path}.${key} is missing`);
      if (schema.additionalProperties === false) {
        for (const key of Object.keys(value)) if (!(key in schema.properties)) errors.push(`${path}.${key} is not in the schema`);
      }
      for (const [key, sub] of Object.entries(schema.properties)) {
        if (key in value) errors.push(...schemaErrors(sub, value[key], `${path}.${key}`));
      }
      break;
    case 'array':
      if (!Array.isArray(value)) return [`${path} should be an array`];
      value.forEach((item, i) => errors.push(...schemaErrors(schema.items, item, `${path}[${i}]`)));
      break;
    case 'string':
      if (typeof value !== 'string') errors.push(`${path} should be a string`);
      break;
    case 'integer':
      if (!Number.isInteger(value)) errors.push(`${path} should be an integer`);
      break;
    case 'boolean':
      if (typeof value !== 'boolean') errors.push(`${path} should be a boolean`);
      break;
    default:
      errors.push(`${path}: unsupported schema type ${schema.type}`);
  }
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path} should be one of ${schema.enum.join(', ')}`);
  return errors;
}

describe('demo presets', () => {
  test('are the three documented samples with their inputs', () => {
    const summary = presets.map(({ id, ingredients, diet, time }) => ({ id, ingredients, diet, time }));
    assert.deepEqual(summary, [
      { id: 'breakfast', ingredients: ['eggs', 'tomato', 'bread'], diet: 'vegetarian', time: 20 },
      { id: 'chicken', ingredients: ['chicken thigh', 'rice', 'broccoli', 'garlic', 'soy sauce'], diet: 'none', time: 30 },
      { id: 'tofu', ingredients: ['tofu', 'spinach', 'mushrooms', 'garlic', 'noodles'], diet: 'vegan', time: 25 },
    ]);
    assert.equal(defaultPreset.id, 'breakfast');
    for (const preset of presets) {
      assert.ok(preset.label && preset.emoji, `${preset.id} needs a label and an emoji`);
    }
  });

  test('match the exact /api/recipes response schema', () => {
    for (const preset of presets) {
      assert.ok(preset.recipes.length > 0, `${preset.id} has recipes`);
      assert.deepEqual(schemaErrors(RECIPES_SCHEMA, { recipes: preset.recipes }), [], preset.id);
    }
  });

  test('point at one image per recipe under BASE_URL/demo/<id>-<n>.webp', () => {
    for (const preset of presets) {
      assert.deepEqual(
        preset.images,
        preset.recipes.map((_, i) => `/demo/${preset.id}-${i + 1}.webp`),
      );
    }
  });
});

describe('findClosestPreset', () => {
  test('recognizes a preset regardless of case, plurals and order', () => {
    const match = findClosestPreset({ ingredients: ['BREAD', 'Eggs', 'tomatoes'], diet: 'vegetarian', time: 20 }, presets);
    assert.equal(match.preset.id, 'breakfast');
    assert.equal(match.exact, true);
    assert.equal(match.sameSettings, true);
    assert.equal(demoNotice(match), null);
  });

  test('notes when the diet or time differs from the sample', () => {
    const match = findClosestPreset({ ingredients: ['eggs', 'tomato', 'bread'], diet: 'vegan', time: 60 }, presets);
    assert.equal(match.preset.id, 'breakfast');
    assert.equal(match.sameSettings, false);
    assert.match(demoNotice(match), /made for Vegetarian · up to 20 min/);
  });

  test('otherwise picks the greatest ingredient overlap', () => {
    const match = findClosestPreset({ ingredients: ['chicken', 'potato', 'soy sauce'], diet: 'none', time: 30 }, presets);
    assert.equal(match.preset.id, 'chicken');
    assert.equal(match.exact, false);
    assert.equal(
      demoNotice(match),
      'Live generation is off in this demo — showing the closest sample: Chicken · Rice · Broccoli.',
    );
    assert.equal(findClosestPreset({ ingredients: ['tofu', 'kale'], diet: 'none', time: 30 }, presets).preset.id, 'tofu');
  });

  test('breaks ties by diet, then by the closest time limit', () => {
    const pick = (request) => findClosestPreset(request, presets).preset.id;
    assert.equal(pick({ ingredients: ['garlic'], diet: 'vegan', time: 30 }), 'tofu');
    assert.equal(pick({ ingredients: ['garlic'], diet: 'none', time: 25 }), 'chicken');
    assert.equal(pick({ ingredients: ['quinoa'], diet: 'vegetarian', time: 60 }), 'breakfast');
    assert.equal(pick({ ingredients: ['quinoa'], diet: 'gluten_free', time: 25 }), 'tofu');
  });
});

describe('createDemoSource', () => {
  test('simulates timing: recipes after a pause, then photos one by one', async () => {
    const delays = [];
    const source = createDemoSource({
      presets,
      delay: async (ms) => {
        delays.push(ms);
      },
      preload: async (src) => src,
    });
    const result = await source.generate({ ingredients: ['eggs', 'tomato', 'bread'], diet: 'vegetarian', time: 20 });
    assert.equal(delays[0], DEMO_TIMING.recipes);
    assert.equal(result.recipes.length, 3);
    assert.equal(result.notice, null);

    const sources = await Promise.all(result.recipes.map((_, i) => result.loadImage(i)));
    assert.deepEqual(sources, ['/demo/breakfast-1.webp', '/demo/breakfast-2.webp', '/demo/breakfast-3.webp']);
    const imageDelays = delays.slice(1);
    assert.ok(imageDelays.every((ms, i) => i === 0 || ms > imageDelays[i - 1]), 'photos are staggered');
    assert.ok(imageDelays.at(-1) <= 2000, 'all photos arrive within about 2 s');
    assert.equal(source.canRetryImages, false);
  });

  test('a missing photo rejects so the card can show its fallback', async () => {
    const source = createDemoSource({
      presets,
      delay: async () => {},
      preload: async (src) => {
        throw new Error(`404 ${src}`);
      },
    });
    const result = await source.generate({ ingredients: ['tofu'], diet: 'vegan', time: 25 });
    await assert.rejects(result.loadImage(0), /404/);
    await assert.rejects(result.loadImage(99), /no photo/);
  });
});

describe('wait', () => {
  test('resolves after the delay and rejects with AbortError when cancelled', async () => {
    await wait(1);
    const controller = new AbortController();
    const pending = wait(10_000, controller.signal);
    controller.abort();
    await assert.rejects(pending, { name: 'AbortError' });
    await assert.rejects(wait(5, controller.signal), { name: 'AbortError' });
  });
});
