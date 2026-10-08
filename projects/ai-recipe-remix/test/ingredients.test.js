import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  MAX_INGREDIENTS,
  cleanIngredient,
  hasSeparator,
  ingredientKey,
  mergeIngredients,
  parseIngredientList,
  singularize,
  splitDraft,
} from '../src/lib/ingredients.js';

describe('parseIngredientList', () => {
  test('splits on commas, the Chinese comma "，" and new lines', () => {
    assert.deepEqual(parseIngredientList('eggs, tomato,bread'), ['eggs', 'tomato', 'bread']);
    assert.deepEqual(parseIngredientList('鸡蛋，番茄，面包'), ['鸡蛋', '番茄', '面包']);
    assert.deepEqual(parseIngredientList('eggs\ntomato\r\nbread\n'), ['eggs', 'tomato', 'bread']);
    assert.deepEqual(parseIngredientList('rice、tofu; garlic\tsoy sauce'), ['rice', 'tofu', 'garlic', 'soy sauce']);
  });

  test('drops empty entries and extra whitespace', () => {
    assert.deepEqual(parseIngredientList(' , eggs ,, \n  green   onion , '), ['eggs', 'green onion']);
    assert.deepEqual(parseIngredientList(''), []);
    assert.deepEqual(parseIngredientList(undefined), []);
  });

  test('cleans up pasted bullet and numbered lists', () => {
    assert.deepEqual(parseIngredientList('- eggs\n* tomato\n• bread\n1. rice\n2) tofu'), [
      'eggs',
      'tomato',
      'bread',
      'rice',
      'tofu',
    ]);
  });
});

describe('cleanIngredient', () => {
  test('trims, collapses spaces and removes quotes and a trailing period', () => {
    assert.equal(cleanIngredient('  soy    sauce  '), 'soy sauce');
    assert.equal(cleanIngredient('"eggs"'), 'eggs');
    assert.equal(cleanIngredient('bread.'), 'bread');
  });

  test('keeps quantities and decimals intact', () => {
    assert.equal(cleanIngredient('2 eggs'), '2 eggs');
    assert.equal(cleanIngredient('1.5 cups flour'), '1.5 cups flour');
  });
});

describe('splitDraft', () => {
  test('separates finished entries from the one still being typed', () => {
    assert.deepEqual(splitDraft('eggs, tom'), { complete: ['eggs'], rest: 'tom' });
    assert.deepEqual(splitDraft('eggs，'), { complete: ['eggs'], rest: '' });
    assert.deepEqual(splitDraft('eggs'), { complete: [], rest: 'eggs' });
    assert.deepEqual(splitDraft('a, b, c'), { complete: ['a', 'b'], rest: 'c' });
  });

  test('hasSeparator spots any separator', () => {
    assert.equal(hasSeparator('eggs'), false);
    assert.equal(hasSeparator('eggs,'), true);
    assert.equal(hasSeparator('鸡蛋，'), true);
    assert.equal(hasSeparator('a\nb'), true);
  });
});

describe('singularize and ingredientKey', () => {
  test('handles common English plurals', () => {
    const cases = {
      eggs: 'egg',
      tomatoes: 'tomato',
      potatoes: 'potato',
      berries: 'berry',
      peaches: 'peach',
      radishes: 'radish',
      leaves: 'leaf',
      cloves: 'clove',
      mushrooms: 'mushroom',
      noodles: 'noodle',
      peas: 'pea',
      asparagus: 'asparagus',
      hummus: 'hummus',
      couscous: 'couscous',
      rice: 'rice',
      tofu: 'tofu',
    };
    for (const [plural, singular] of Object.entries(cases)) assert.equal(singularize(plural), singular, plural);
  });

  test('cookie and cookies normalise to the same key', () => {
    assert.equal(ingredientKey('cookie'), ingredientKey('cookies'));
  });

  test('keys ignore case, spacing, punctuation and plurals', () => {
    assert.equal(ingredientKey('Eggs'), 'egg');
    assert.equal(ingredientKey('  EGG '), 'egg');
    assert.equal(ingredientKey('Soy-Sauce'), ingredientKey('soy sauce'));
    assert.equal(ingredientKey('Tomatoes'), ingredientKey('tomato'));
    assert.equal(ingredientKey('鸡蛋'), '鸡蛋');
    assert.equal(ingredientKey('!!!'), '');
  });
});

describe('mergeIngredients', () => {
  test('adds new entries in order', () => {
    const result = mergeIngredients(['eggs'], ['tomato', 'bread']);
    assert.deepEqual(result.list, ['eggs', 'tomato', 'bread']);
    assert.deepEqual(result.added, ['tomato', 'bread']);
  });

  test('de-duplicates case-insensitively (and singular/plural), reporting the existing entry', () => {
    const result = mergeIngredients(['Eggs', 'tomato'], ['eggs', 'EGG', 'Tomatoes', 'rice', 'Rice']);
    assert.deepEqual(result.list, ['Eggs', 'tomato', 'rice']);
    assert.deepEqual(result.added, ['rice']);
    assert.deepEqual(result.duplicates, ['Eggs', 'Eggs', 'tomato', 'rice']);
  });

  test('rejects entries over 40 characters', () => {
    const long = 'x'.repeat(41);
    const result = mergeIngredients([], ['x'.repeat(40), long]);
    assert.equal(result.list.length, 1);
    assert.deepEqual(result.tooLong, [long]);
  });

  test(`stops at ${MAX_INGREDIENTS} ingredients`, () => {
    const many = Array.from({ length: 25 }, (_, i) => `item ${i}`);
    const result = mergeIngredients([], many);
    assert.equal(result.list.length, MAX_INGREDIENTS);
    assert.equal(result.overLimit.length, 5);
  });

  test('ignores blanks and punctuation-only entries and never mutates the input', () => {
    const current = ['eggs'];
    const result = mergeIngredients(current, ['', '  ', '---', '...']);
    assert.deepEqual(result.list, ['eggs']);
    assert.deepEqual(current, ['eggs']);
  });
});
