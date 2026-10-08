/**
 * Defensive normalisation of recipe objects coming from the API (or demo data),
 * so a slightly odd response never crashes the UI. The shape matches the server
 * schema in server/src/recipe-schema.js:
 *
 * { title, summary, timeMinutes, servings, difficulty: "easy"|"medium"|"hard",
 *   ingredients: [{ item, amount, optional }], steps: [], substitutions: [],
 *   allergens: [], tips: [] }
 */

const DIFFICULTIES = ['easy', 'medium', 'hard'];

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const textList = (value) => (Array.isArray(value) ? value.map(text).filter(Boolean) : []);

function positiveInteger(value) {
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function normalizeIngredient(raw) {
  if (typeof raw === 'string') {
    const item = raw.trim();
    return item ? { item, amount: '', optional: false } : null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const item = text(raw.item);
  return item ? { item, amount: text(raw.amount), optional: raw.optional === true } : null;
}

export function normalizeRecipe(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const title = text(raw.title);
  if (!title) return null;
  const difficulty = text(raw.difficulty).toLowerCase();
  return {
    title,
    summary: text(raw.summary),
    timeMinutes: positiveInteger(raw.timeMinutes),
    servings: positiveInteger(raw.servings),
    difficulty: DIFFICULTIES.includes(difficulty) ? difficulty : null,
    ingredients: Array.isArray(raw.ingredients)
      ? raw.ingredients.map(normalizeIngredient).filter(Boolean)
      : [],
    steps: textList(raw.steps),
    substitutions: textList(raw.substitutions),
    allergens: textList(raw.allergens),
    tips: textList(raw.tips),
  };
}

export function normalizeRecipes(list) {
  return Array.isArray(list) ? list.map(normalizeRecipe).filter(Boolean) : [];
}
