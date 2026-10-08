import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { DIETS, LIMITS, validateImageRequest, validateRecipeRequest } from '../src/validation.js';

describe('validateRecipeRequest', () => {
  test('accepts a normal request and keeps the values', () => {
    const result = validateRecipeRequest({ ingredients: ['eggs', 'tomato', 'bread'], diet: 'vegetarian', time: 20 });
    assert.deepEqual(result, { ok: true, value: { ingredients: ['eggs', 'tomato', 'bread'], diet: 'vegetarian', time: 20 } });
  });

  test('trims, collapses whitespace and de-duplicates case-insensitively (keeping the first spelling)', () => {
    const result = validateRecipeRequest({ ingredients: ['  Eggs ', 'eggs', 'soy   sauce', 'SOY SAUCE', '\tgarlic\n'] });
    assert.equal(result.ok, true);
    assert.deepEqual(result.value.ingredients, ['Eggs', 'soy sauce', 'garlic']);
  });

  test('defaults diet to "none" and time to 30 minutes', () => {
    const result = validateRecipeRequest({ ingredients: ['rice'] });
    assert.deepEqual(result.value, { ingredients: ['rice'], diet: 'none', time: LIMITS.defaultTime });
    assert.equal(validateRecipeRequest({ ingredients: ['rice'], diet: null, time: null }).value.time, 30);
  });

  test('ignores blank entries but needs at least one real ingredient', () => {
    assert.deepEqual(validateRecipeRequest({ ingredients: ['eggs', '', '   '] }).value.ingredients, ['eggs']);
    assert.match(validateRecipeRequest({ ingredients: [] }).error, /at least one ingredient/);
    assert.match(validateRecipeRequest({ ingredients: ['', '  '] }).error, /at least one ingredient/);
  });

  test('rejects bodies and ingredient lists of the wrong type', () => {
    for (const body of [undefined, null, 'eggs', 42, ['eggs']]) {
      assert.equal(validateRecipeRequest(body).ok, false, `body ${JSON.stringify(body)}`);
    }
    assert.match(validateRecipeRequest({}).error, /ingredients must be an array/);
    assert.match(validateRecipeRequest({ ingredients: 'eggs, tomato' }).error, /ingredients must be an array/);
    assert.match(validateRecipeRequest({ ingredients: ['eggs', 3] }).error, /must be a string/);
    assert.match(validateRecipeRequest({ ingredients: [{ item: 'eggs' }] }).error, /must be a string/);
  });

  test('allows 20 ingredients but not 21 (counted after de-duplication)', () => {
    const twenty = Array.from({ length: 20 }, (_, i) => `ingredient ${i}`);
    assert.equal(validateRecipeRequest({ ingredients: twenty }).ok, true);
    assert.match(validateRecipeRequest({ ingredients: [...twenty, 'one more'] }).error, /at most 20 ingredients/);
    assert.equal(validateRecipeRequest({ ingredients: [...twenty, 'INGREDIENT 0'] }).ok, true);
  });

  test('limits each ingredient to 40 characters', () => {
    assert.equal(validateRecipeRequest({ ingredients: ['x'.repeat(40)] }).ok, true);
    const result = validateRecipeRequest({ ingredients: ['x'.repeat(41)] });
    assert.equal(result.ok, false);
    assert.match(result.error, /at most 40 characters/);
  });

  test('replaces control characters instead of passing them to the prompt', () => {
    const result = validateRecipeRequest({ ingredients: ['egg\u0000s', 'tom\u0007ato'] });
    assert.deepEqual(result.value.ingredients, ['egg s', 'tom ato']);
  });

  test('accepts only the known diets (case and dash insensitive)', () => {
    for (const diet of DIETS) assert.equal(validateRecipeRequest({ ingredients: ['rice'], diet }).value.diet, diet);
    assert.equal(validateRecipeRequest({ ingredients: ['rice'], diet: 'Gluten-free' }).value.diet, 'gluten_free');
    assert.equal(validateRecipeRequest({ ingredients: ['rice'], diet: ' VEGAN ' }).value.diet, 'vegan');
    assert.match(validateRecipeRequest({ ingredients: ['rice'], diet: 'keto' }).error, /diet must be one of/);
    assert.match(validateRecipeRequest({ ingredients: ['rice'], diet: 1 }).error, /diet must be one of/);
  });

  test('time must be a whole number between 5 and 120', () => {
    const time = (value) => validateRecipeRequest({ ingredients: ['rice'], time: value });
    assert.equal(time(5).value.time, 5);
    assert.equal(time(120).value.time, 120);
    assert.equal(time('45').value.time, 45);
    for (const bad of [4, 121, 0, -10, 12.5, '12.5', 'soon', true, [20], Number.NaN]) {
      assert.match(time(bad).error ?? '', /between 5 and 120/, `time ${String(bad)}`);
    }
  });
});

describe('validateImageRequest', () => {
  test('accepts a prompt and trims it, keeping line breaks', () => {
    const result = validateImageRequest({ prompt: '  Food photo of: soup.\nNo text.  ' });
    assert.deepEqual(result, { ok: true, value: { prompt: 'Food photo of: soup.\nNo text.' } });
  });

  test('allows exactly 600 characters but not 601', () => {
    assert.equal(validateImageRequest({ prompt: 'a'.repeat(600) }).ok, true);
    assert.match(validateImageRequest({ prompt: 'a'.repeat(601) }).error, /at most 600 characters/);
  });

  test('rejects missing, empty and non-string prompts', () => {
    assert.match(validateImageRequest({}).error, /prompt must be a string/);
    assert.match(validateImageRequest({ prompt: 42 }).error, /prompt must be a string/);
    assert.match(validateImageRequest({ prompt: '   ' }).error, /must not be empty/);
    assert.equal(validateImageRequest(null).ok, false);
    assert.equal(validateImageRequest([]).ok, false);
  });

  test('strips control characters other than line breaks', () => {
    assert.equal(validateImageRequest({ prompt: 'soup\u0000\r\nbowl' }).value.prompt, 'soup \nbowl');
  });
});
