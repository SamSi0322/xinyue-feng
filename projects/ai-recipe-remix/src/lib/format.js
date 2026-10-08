/** Display helpers shared by the form, the recipe cards and the copy-to-clipboard text. */

/** Same values as the server accepts (server/src/validation.js). */
export const DIET_OPTIONS = [
  { value: 'none', label: 'No preference' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'halal', label: 'Halal' },
  { value: 'gluten_free', label: 'Gluten-free' },
];

export const TIME_LIMIT = { min: 5, max: 120, step: 5 };

export function dietLabel(value) {
  return DIET_OPTIONS.find((option) => option.value === value)?.label ?? 'No preference';
}

/** 20 -> "20 min", 60 -> "1 hr", 95 -> "1 hr 35 min". Empty for missing values. */
export function formatMinutes(total) {
  if (!Number.isFinite(total) || total <= 0) return '';
  const hours = Math.floor(total / 60);
  const minutes = Math.round(total % 60);
  if (!hours) return `${minutes} min`;
  return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
}

/** Spelled-out version for screen readers: 95 -> "1 hour 35 minutes". */
export function formatMinutesLong(total) {
  if (!Number.isFinite(total) || total <= 0) return '';
  const hours = Math.floor(total / 60);
  const minutes = Math.round(total % 60);
  const parts = [];
  if (hours) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (minutes) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  return parts.join(' ');
}

export function difficultyLabel(difficulty) {
  return difficulty ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1) : '';
}

/** ["eggs", "tomato", "bread"] -> "eggs, tomato and bread" */
export function formatList(items) {
  const list = items.filter(Boolean);
  if (list.length <= 1) return list.join('');
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
