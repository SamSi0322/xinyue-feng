/**
 * Input validation for the public API. Each validator returns either
 *   { ok: true, value }   with cleaned-up input, or
 *   { ok: false, error }  with a short message that is safe to show to users.
 */

export const DIETS = Object.freeze(['none', 'vegetarian', 'vegan', 'halal', 'gluten_free']);

export const LIMITS = Object.freeze({
  maxIngredients: 20,
  maxIngredientLength: 40,
  minTime: 5,
  maxTime: 120,
  defaultTime: 30,
  maxPromptLength: 600,
});

const fail = (error) => ({ ok: false, error });

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Replace control characters (incl. new lines) with spaces and collapse whitespace. */
const cleanLine = (value) => value.replace(/\p{Cc}/gu, ' ').replace(/\s+/g, ' ').trim();

const preview = (value) => (value.length > 24 ? `${value.slice(0, 24)}…` : value);

function normalizeDiet(diet) {
  if (diet === undefined || diet === null || diet === '') return 'none';
  if (typeof diet !== 'string') return null;
  const value = diet.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return DIETS.includes(value) ? value : null;
}

function normalizeTime(time) {
  if (time === undefined || time === null || time === '') return LIMITS.defaultTime;
  const minutes = typeof time === 'string' && /^\s*\d+\s*$/.test(time) ? Number(time) : time;
  return Number.isInteger(minutes) ? minutes : null;
}

/** POST /api/recipes  { ingredients: string[], diet?: string, time?: number } */
export function validateRecipeRequest(body) {
  if (!isPlainObject(body)) return fail('Request body must be a JSON object.');

  const { ingredients } = body;
  if (!Array.isArray(ingredients)) return fail('ingredients must be an array of strings.');

  const seen = new Set();
  const clean = [];
  for (const raw of ingredients) {
    if (typeof raw !== 'string') return fail('Each ingredient must be a string.');
    const value = cleanLine(raw);
    if (!value) continue; // blank entries are ignored
    if (value.length > LIMITS.maxIngredientLength) {
      return fail(`Each ingredient must be at most ${LIMITS.maxIngredientLength} characters ("${preview(value)}" is too long).`);
    }
    const key = value.toLowerCase();
    if (seen.has(key)) continue; // case-insensitive de-duplication
    seen.add(key);
    clean.push(value);
  }
  if (clean.length === 0) return fail('Add at least one ingredient.');
  if (clean.length > LIMITS.maxIngredients) return fail(`Use at most ${LIMITS.maxIngredients} ingredients.`);

  const diet = normalizeDiet(body.diet);
  if (!diet) return fail(`diet must be one of: ${DIETS.join(', ')}.`);

  const time = normalizeTime(body.time);
  if (time === null || time < LIMITS.minTime || time > LIMITS.maxTime) {
    return fail(`time must be a whole number of minutes between ${LIMITS.minTime} and ${LIMITS.maxTime}.`);
  }

  return { ok: true, value: { ingredients: clean, diet, time } };
}

/** POST /api/image  { prompt: string } */
export function validateImageRequest(body) {
  if (!isPlainObject(body)) return fail('Request body must be a JSON object.');
  const { prompt } = body;
  if (typeof prompt !== 'string') return fail('prompt must be a string.');

  // Keep line breaks (the client puts the style hints on their own line), drop other control characters.
  const clean = prompt.replace(/\r\n?/g, '\n').replace(/[^\P{Cc}\n]/gu, ' ').trim();
  if (!clean) return fail('prompt must not be empty.');
  if (clean.length > LIMITS.maxPromptLength) {
    return fail(`prompt must be at most ${LIMITS.maxPromptLength} characters.`);
  }
  return { ok: true, value: { prompt: clean } };
}
