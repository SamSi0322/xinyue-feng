/**
 * Pure helpers for ingredient lists:
 *   - parsing what people type or paste ("eggs, tomato", one per line, Chinese "，"),
 *   - normalising names so "Eggs" and "egg" count as the same thing,
 *   - deciding which recipe ingredients are already "in your kitchen" and which are "to buy".
 *
 * No DOM or React in here, so it is all unit-tested with node:test (see test/).
 */

export const MAX_INGREDIENTS = 20;
export const MAX_INGREDIENT_LENGTH = 40;

/** Separators between ingredients: commas (incl. Chinese "，" and "、"), semicolons, new lines, tabs. */
const SEPARATORS = /[,，、;；\n\r\t]+/;
const HAS_SEPARATOR = /[,，、;；\n\r\t]/;

export function hasSeparator(text) {
  return HAS_SEPARATOR.test(String(text ?? ''));
}

/**
 * Tidy a single ingredient as typed: collapse whitespace, drop list bullets or
 * numbering from pasted lists ("- eggs", "• eggs", "1. eggs"), surrounding quotes
 * and a trailing full stop.
 */
export function cleanIngredient(text) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(?:[-*•·▪◦‣–—]+\s*|\d+[.)]\s+)/u, '')
    .replace(/^["'“”‘’]+|["'“”‘’]+$/gu, '')
    .replace(/[.。]+$/u, '')
    .trim();
}

/** Split a typed or pasted list into clean ingredient names (not de-duplicated). */
export function parseIngredientList(text) {
  return String(text ?? '')
    .split(SEPARATORS)
    .map(cleanIngredient)
    .filter(Boolean);
}

/**
 * Split the text in the ingredient box into finished entries (everything before
 * the last separator) and the unfinished remainder the person is still typing.
 *   "eggs, tom" -> { complete: ["eggs"], rest: "tom" }
 */
export function splitDraft(text) {
  const parts = String(text ?? '').split(SEPARATORS);
  const rest = parts.pop() ?? '';
  return {
    complete: parts.map(cleanIngredient).filter(Boolean),
    rest: rest.replace(/^\s+/, ''),
  };
}

/* ---------------------------------------------------------------------------
 * Normalisation
 * ------------------------------------------------------------------------- */

const IRREGULAR_SINGULARS = new Map([
  ['leaves', 'leaf'],
  ['loaves', 'loaf'],
  ['halves', 'half'],
]);

/** Words ending like this keep their final "s" (glass, asparagus, hummus, couscous). */
const KEEP_FINAL_S = /(?:ss|us)$/;

/**
 * Reduce an English word to a canonical singular form. It only has to be
 * consistent ("cookie" and "cookies" both become "cooky"), not pretty.
 */
export function singularize(word) {
  const w = String(word ?? '').toLowerCase();
  if (w.length <= 2 || !/[a-z]$/.test(w)) return w; // short words and non-Latin scripts stay as-is
  if (IRREGULAR_SINGULARS.has(w)) return IRREGULAR_SINGULARS.get(w);
  if (w.endsWith('ies')) return `${w.slice(0, -3)}y`; // berries -> berry
  if (w.endsWith('ie')) return `${w.slice(0, -2)}y`; // cookie -> cooky (matches "cookies")
  if (w.endsWith('oes')) return w.slice(0, -2); // tomatoes -> tomato
  if (/(?:ch|sh|x|z|ss)es$/.test(w)) return w.slice(0, -2); // peaches -> peach
  if (w.endsWith('s') && !KEEP_FINAL_S.test(w)) return w.slice(0, -1); // eggs -> egg
  return w;
}

/** Lower-cased, singular word tokens. Hyphens and punctuation split words. */
function tokenize(text) {
  return String(text ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map(singularize);
}

/**
 * Comparison key for de-duplication: case-, spacing-, punctuation- and
 * plural-insensitive. "Eggs", " egg " and "EGGS" share the key "egg".
 */
export function ingredientKey(text) {
  return tokenize(text).join(' ');
}

/**
 * Add new entries to the current list without duplicates or overflow.
 * Returns the new list plus what happened to each incoming entry, so the UI can
 * explain it ("Eggs is already on your list").
 */
export function mergeIngredients(
  current,
  incoming,
  { max = MAX_INGREDIENTS, maxLength = MAX_INGREDIENT_LENGTH } = {},
) {
  const list = [...current];
  const byKey = new Map(list.map((value) => [ingredientKey(value), value]));
  const added = [];
  const duplicates = []; // existing entries that were entered again
  const tooLong = [];
  const overLimit = [];

  for (const raw of incoming) {
    const value = cleanIngredient(raw);
    const key = ingredientKey(value);
    if (!key) continue;
    if (byKey.has(key)) {
      duplicates.push(byKey.get(key));
    } else if (value.length > maxLength) {
      tooLong.push(value);
    } else if (list.length >= max) {
      overLimit.push(value);
    } else {
      byKey.set(key, value);
      list.push(value);
      added.push(value);
    }
  }
  return { list, added, duplicates, tooLong, overLimit };
}

/* ---------------------------------------------------------------------------
 * "In your kitchen" vs "to buy"
 * ------------------------------------------------------------------------- */

/**
 * Words that describe a cut, part or form of an ingredient rather than a
 * different ingredient: "garlic cloves" is garlic, "chicken thighs" is chicken,
 * "egg whites" are eggs. Compare with "chicken broth" or "garlic powder", which
 * are different things and must NOT match "chicken" or "garlic".
 */
const FORM_WORDS = new Set([
  'bulb', 'bunch', 'breast', 'chop', 'chunk', 'clove', 'crumb', 'cube', 'cutlet',
  'drumstick', 'filet', 'fillet', 'floret', 'half', 'head', 'juice', 'kernel', 'leaf',
  'leg', 'loin', 'piece', 'rib', 'ring', 'root', 'segment', 'slice', 'spear', 'sprig',
  'stalk', 'steak', 'stem', 'strip', 'tender', 'tenderloin', 'thigh', 'tip', 'wedge',
  'white', 'wing', 'yolk', 'zest',
]);

/**
 * Compound names that are different products from their last word, so a generic
 * "milk" must not claim "coconut milk" (and vice versa).
 */
const DISTINCT_PRODUCTS = new Set([
  'almond butter', 'almond milk', 'apple butter', 'cashew butter', 'cashew milk',
  'cocoa butter', 'coconut cream', 'coconut milk', 'coconut water', 'condensed milk',
  'cream cheese', 'evaporated milk', 'green bean', 'ice cream', 'nut butter', 'oat milk',
  'peanut butter', 'rice milk', 'sour cream', 'soy milk', 'sweet potato',
]);

/** A later comma segment starting with one of these is a preparation note ("garlic, minced"). */
const PREP_STARTERS = new Set([
  'about', 'any', 'as', 'at', 'cut', 'divided', 'for', 'from', 'if', 'ideally', 'into',
  'like', 'more', 'optional', 'plus', 'preferably', 'room', 'such', 'to', 'torn',
]);

/** Everyday basics that nobody needs to buy for one recipe. */
const PANTRY_STAPLES = new Set([
  'water', 'ice', 'ice water', 'salt', 'black pepper', 'salt and pepper',
  'salt and black pepper', 'pepper and salt',
]);
const PANTRY_MODIFIERS = new Set([
  'boiling', 'coarse', 'cold', 'cool', 'cracked', 'dash', 'extra', 'filtered', 'fine',
  'flake', 'flaky', 'fresh', 'freshly', 'ground', 'hot', 'iced', 'kosher', 'lukewarm',
  'more', 'pinch', 'plain', 'sea', 'table', 'tap', 'taste', 'to', 'warm',
]);

const CJK = /[぀-ヿ㐀-鿿豈-﫿가-힯]/u;

function looksLikePrepNote(segment) {
  const first = segment.trim().toLowerCase().split(/[^\p{L}]+/u).find(Boolean) ?? '';
  return PREP_STARTERS.has(first) || /(?:ed|ly)$/.test(first);
}

/**
 * Turn one ingredient name into candidate "core" phrases (arrays of tokens):
 *   "boneless, skinless chicken thighs" -> [["boneless"], ["skinless", "chicken"]]
 *   "soy sauce (or tamari)"             -> [["soy", "sauce"]]
 *   "juice of 1 lemon"                  -> [["lemon"]]
 *   "spinach or kale"                   -> [["spinach"], ["kale"]]
 */
function corePhrases(text) {
  const withoutNotes = String(text ?? '').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ');
  const segments = withoutNotes.split(/[,，]/);
  const kept = segments.filter((segment, i) => i === 0 || !looksLikePrepNote(segment));
  const phrases = [];

  for (const segment of kept) {
    for (const alternative of segment.split(/\s+or\s+|\//i)) {
      let tokens = tokenize(alternative).filter((t) => !/^\d+$/.test(t));
      const lastOf = tokens.lastIndexOf('of');
      if (lastOf !== -1 && lastOf < tokens.length - 1) tokens = tokens.slice(lastOf + 1);
      while (tokens.length > 1 && FORM_WORDS.has(tokens[tokens.length - 1])) tokens = tokens.slice(0, -1);
      if (tokens.length) phrases.push(tokens);
    }
  }
  return phrases;
}

function isSuffix(short, long) {
  if (!short.length || short.length > long.length) return false;
  const offset = long.length - short.length;
  return short.every((token, i) => token === long[offset + i]);
}

/**
 * Two core phrases match when one ends with the other (English names put the
 * main noun last): "egg" ~ "large egg", "chicken" ~ "boneless chicken",
 * "noodle" ~ "rice noodle", but "rice" !~ "rice vinegar".
 */
function phrasesMatch(a, b) {
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (isSuffix(short, long)) {
    for (let n = short.length + 1; n <= long.length; n += 1) {
      if (DISTINCT_PRODUCTS.has(long.slice(long.length - n).join(' '))) return false;
    }
    return true;
  }
  // Names written without spaces (e.g. Chinese): fall back to containment.
  const joinedA = a.join('');
  const joinedB = b.join('');
  return CJK.test(joinedA) && CJK.test(joinedB) && (joinedA.includes(joinedB) || joinedB.includes(joinedA));
}

/** Does the ingredient the user has ("tomato") cover the recipe ingredient ("Roma tomatoes, diced")? */
export function ingredientMatches(userIngredient, recipeIngredient) {
  const mine = corePhrases(userIngredient);
  const theirs = corePhrases(recipeIngredient);
  return mine.some((a) => theirs.some((b) => phrasesMatch(a, b)));
}

/** Water, ice, salt and black pepper are assumed to be in every kitchen. */
export function isPantryStaple(recipeIngredient) {
  return corePhrases(recipeIngredient).some((tokens) => {
    const core = tokens.filter((t) => !PANTRY_MODIFIERS.has(t)).join(' ');
    return PANTRY_STAPLES.has(core);
  });
}

/**
 * Sort a recipe's ingredients into what the user already has, what they need to
 * buy, and pantry staples, plus the counts used in the card summary.
 *
 * @param {{item: string, amount: string, optional: boolean}[]} recipeIngredients
 * @param {string[]} userIngredients
 */
export function analyzeIngredients(recipeIngredients, userIngredients) {
  const mine = (userIngredients ?? []).map((value) => ({ value, phrases: corePhrases(value) }));
  const used = new Set();

  const items = (recipeIngredients ?? []).map((ingredient) => {
    const theirs = corePhrases(ingredient.item);
    const matches = mine.filter((m) => m.phrases.some((a) => theirs.some((b) => phrasesMatch(a, b))));
    matches.forEach((m) => used.add(m.value));
    let status = 'buy';
    if (matches.length) status = 'have';
    else if (isPantryStaple(ingredient.item)) status = 'pantry';
    return { ...ingredient, status };
  });

  const have = items.filter((i) => i.status === 'have');
  const buy = items.filter((i) => i.status === 'buy');
  const pantry = items.filter((i) => i.status === 'pantry');
  return {
    items,
    have,
    buy,
    pantry,
    usedCount: used.size,
    userCount: mine.length,
    toBuyCount: buy.filter((i) => !i.optional).length,
    optionalToBuyCount: buy.filter((i) => i.optional).length,
  };
}

/** "Uses 3 of your 3 ingredients · 2 to buy" */
export function describeUsage({ usedCount, userCount, toBuyCount, optionalToBuyCount = 0 }) {
  const uses = `Uses ${usedCount} of your ${userCount} ${userCount === 1 ? 'ingredient' : 'ingredients'}`;
  const buy = toBuyCount === 0 ? 'nothing to buy' : `${toBuyCount} to buy`;
  const optional = optionalToBuyCount ? ` (+${optionalToBuyCount} optional)` : '';
  return `${uses} · ${buy}${optional}`;
}
