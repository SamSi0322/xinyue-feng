import { difficultyLabel, formatMinutes } from './format.js';

/** Plain-text version of a recipe for "Copy recipe" (pastes nicely into notes, chats or email). */
export function recipeToText(recipe) {
  const lines = [recipe.title];
  if (recipe.summary) lines.push(recipe.summary);

  const facts = [
    recipe.timeMinutes && `Time: ${formatMinutes(recipe.timeMinutes)}`,
    recipe.servings && `Serves: ${recipe.servings}`,
    recipe.difficulty && `Difficulty: ${difficultyLabel(recipe.difficulty)}`,
  ].filter(Boolean);
  if (facts.length) lines.push('', facts.join(' · '));

  const section = (heading, rows) => {
    if (rows.length) lines.push('', heading.toUpperCase(), ...rows);
  };

  section(
    'Ingredients',
    recipe.ingredients.map(
      (i) => `- ${i.item}${i.amount ? ` — ${i.amount}` : ''}${i.optional ? ' (optional)' : ''}`,
    ),
  );
  section('Steps', recipe.steps.map((step, index) => `${index + 1}. ${step}`));
  section('Substitutions', recipe.substitutions.map((s) => `- ${s}`));
  section('Allergens', recipe.allergens.length ? [recipe.allergens.join(', ')] : []);
  section('Tips', recipe.tips.map((t) => `- ${t}`));

  lines.push('', 'Made with AI Recipe Remix (AI-generated: double-check allergens and cooking times).');
  return lines.join('\n');
}
