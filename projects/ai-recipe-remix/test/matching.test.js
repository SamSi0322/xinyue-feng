import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { analyzeIngredients, describeUsage, ingredientMatches, isPantryStaple } from '../src/lib/ingredients.js';

describe('ingredientMatches (have vs. to buy)', () => {
  test('matches regardless of case, plurals, sizes and prep notes', () => {
    const yes = [
      ['egg', 'large eggs'],
      ['eggs', 'Egg'],
      ['tomato', 'tomatoes'],
      ['tomato', 'Roma tomatoes, diced'],
      ['tomato', 'cherry tomatoes'],
      ['bread', 'day-old bread slices'],
      ['bread', 'rustic bread'],
      ['chicken thigh', 'boneless, skinless chicken thighs'],
      ['chicken', 'chicken thighs'],
      ['chicken thigh', 'skin-on, boneless chicken thighs'],
      ['rice', 'cooked jasmine rice'],
      ['broccoli', 'broccoli florets'],
      ['garlic', 'garlic cloves, minced'],
      ['garlic', '2 cloves of garlic'],
      ['soy sauce', 'low-sodium soy sauce'],
      ['soy sauce', 'soy sauce or tamari'],
      ['tamari', 'soy sauce or tamari'],
      ['kale', 'spinach/kale'],
      ['tofu', 'extra-firm tofu, pressed and cubed'],
      ['spinach', 'baby spinach leaves'],
      ['mushrooms', 'shiitake mushrooms, sliced'],
      ['noodles', 'rice noodles'],
      ['lemon', 'juice of 1 lemon'],
      ['lemon', 'lemon zest'],
      ['cherry tomatoes', 'tomatoes'],
      ['Eggs', 'egg yolks'],
      ['鸡蛋', '鸡蛋'],
    ];
    for (const [mine, recipe] of yes) assert.equal(ingredientMatches(mine, recipe), true, `${mine} ~ ${recipe}`);
  });

  test('does not confuse different products that share a word', () => {
    const no = [
      ['rice', 'rice vinegar'],
      ['rice', 'rice noodles'],
      ['egg', 'egg noodles'],
      ['egg', 'eggplant'],
      ['chicken', 'chicken broth'],
      ['garlic', 'garlic powder'],
      ['tomato', 'tomato paste'],
      ['milk', 'coconut milk'],
      ['butter', 'peanut butter'],
      ['potato', 'sweet potatoes'],
      ['bread', 'breadcrumbs'],
      ['bread', 'bread flour'],
      ['garlic', 'cloves'],
      ['pepper', 'red pepper flakes'],
    ];
    for (const [mine, recipe] of no) assert.equal(ingredientMatches(mine, recipe), false, `${mine} !~ ${recipe}`);
  });
});

describe('isPantryStaple', () => {
  test('treats water, ice, salt and black pepper as basics', () => {
    for (const item of ['water', 'Warm water', 'ice cubes', 'salt', 'Kosher salt, to taste', 'flaky salt', 'black pepper', 'freshly ground black pepper', 'Salt & pepper']) {
      assert.equal(isPantryStaple(item), true, item);
    }
  });

  test('does not treat real ingredients as basics', () => {
    for (const item of ['pepper', 'bell pepper', 'ice cream', 'coconut water', 'garlic salt', 'soy sauce']) {
      assert.equal(isPantryStaple(item), false, item);
    }
  });
});

describe('analyzeIngredients', () => {
  const recipe = [
    { item: 'large eggs', amount: '4', optional: false },
    { item: 'Roma tomatoes, diced', amount: '2', optional: false },
    { item: 'sourdough bread', amount: '2 slices', optional: false },
    { item: 'feta', amount: '50 g', optional: false },
    { item: 'olive oil', amount: '1 tbsp', optional: false },
    { item: 'salt', amount: 'to taste', optional: false },
    { item: 'fresh basil', amount: 'a few leaves', optional: true },
  ];

  test('splits ingredients into in-your-kitchen, to-buy and pantry staples', () => {
    const result = analyzeIngredients(recipe, ['egg', 'tomato', 'bread']);
    assert.deepEqual(result.have.map((i) => i.item), ['large eggs', 'Roma tomatoes, diced', 'sourdough bread']);
    assert.deepEqual(result.buy.map((i) => i.item), ['feta', 'olive oil', 'fresh basil']);
    assert.deepEqual(result.pantry.map((i) => i.item), ['salt']);
    assert.equal(result.usedCount, 3);
    assert.equal(result.userCount, 3);
    assert.equal(result.toBuyCount, 2);
    assert.equal(result.optionalToBuyCount, 1);
    assert.equal(result.items.length, recipe.length);
  });

  test('summary reads like "Uses 3 of your 3 ingredients · 2 to buy"', () => {
    const result = analyzeIngredients(recipe, ['egg', 'tomato', 'bread']);
    assert.equal(describeUsage(result), 'Uses 3 of your 3 ingredients · 2 to buy (+1 optional)');
    assert.equal(
      describeUsage({ usedCount: 3, userCount: 3, toBuyCount: 2, optionalToBuyCount: 0 }),
      'Uses 3 of your 3 ingredients · 2 to buy',
    );
    assert.equal(
      describeUsage({ usedCount: 1, userCount: 1, toBuyCount: 0, optionalToBuyCount: 0 }),
      'Uses 1 of your 1 ingredient · nothing to buy',
    );
  });

  test('counts each of the user ingredients once, even when it covers several items', () => {
    const result = analyzeIngredients(
      [
        { item: 'eggs', amount: '2', optional: false },
        { item: 'egg yolk', amount: '1', optional: false },
      ],
      ['eggs', 'cheese'],
    );
    assert.equal(result.have.length, 2);
    assert.equal(result.usedCount, 1);
    assert.equal(result.userCount, 2);
  });

  test('something the user listed is "in your kitchen" even if it is a pantry staple', () => {
    const result = analyzeIngredients([{ item: 'salt', amount: 'to taste', optional: false }], ['salt']);
    assert.equal(result.items[0].status, 'have');
  });

  test('handles empty input', () => {
    const result = analyzeIngredients([], []);
    assert.equal(result.items.length, 0);
    assert.equal(describeUsage(result), 'Uses 0 of your 0 ingredients · nothing to buy');
  });
});
