/**
 * JSON Schema for the recipes the model must return, used with OpenAI
 * Structured Outputs (`strict: true`). Strict mode requires every object to list
 * all of its properties in `required` and to set `additionalProperties: false`.
 *
 * Plain data with no imports, so the frontend tests can also check the demo
 * presets in src/demo/*.json against it.
 */

export const DIFFICULTIES = ['easy', 'medium', 'hard'];

const stringList = (description) => ({ type: 'array', description, items: { type: 'string' } });

export const INGREDIENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['item', 'amount', 'optional'],
  properties: {
    item: {
      type: 'string',
      description: 'Ingredient name only, without the quantity, e.g. "large eggs" or "soy sauce".',
    },
    amount: {
      type: 'string',
      description: 'Quantity with units, e.g. "2", "1 tbsp", "200 g" or "to taste".',
    },
    optional: { type: 'boolean', description: 'True for garnishes and nice-to-have extras.' },
  },
};

export const RECIPE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'summary',
    'timeMinutes',
    'servings',
    'difficulty',
    'ingredients',
    'steps',
    'substitutions',
    'allergens',
    'tips',
  ],
  properties: {
    title: { type: 'string', description: 'Short, appetizing recipe name.' },
    summary: { type: 'string', description: 'One or two sentences describing the dish.' },
    timeMinutes: { type: 'integer', description: 'Total time in minutes, including prep.' },
    servings: { type: 'integer', description: 'Number of servings.' },
    difficulty: { type: 'string', enum: DIFFICULTIES },
    ingredients: { type: 'array', items: INGREDIENT_SCHEMA },
    steps: stringList('Instructions in order, one action per step, without step numbers.'),
    substitutions: stringList('Useful swaps, e.g. "Use tamari instead of soy sauce to make it gluten-free".'),
    allergens: stringList('Common allergens present, e.g. "eggs", "milk", "wheat (gluten)", "soy". Empty if none.'),
    tips: stringList('Short practical tips.'),
  },
};

export const RECIPES_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['recipes'],
  properties: {
    recipes: { type: 'array', description: 'Exactly 3 distinct recipes.', items: RECIPE_SCHEMA },
  },
};

/** `response_format` for chat.completions.create */
export const RECIPES_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: { name: 'recipe_remix', strict: true, schema: RECIPES_SCHEMA },
};
