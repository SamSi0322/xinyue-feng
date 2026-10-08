/** The server rejects image prompts longer than this (server/src/validation.js). */
export const MAX_IMAGE_PROMPT_LENGTH = 600;

const PREFIX = 'High quality food photography of: ';
const STYLE = 'Plated nicely, realistic lighting, no text, no watermark, 1 dish centered.';

function truncate(value, max) {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/**
 * Same wording as the original app:
 *   "High quality food photography of: <title>. <summary>\n<style>"
 * trimmed so it always fits the server's limit (summary first, then title).
 */
export function buildImagePrompt(recipe, maxLength = MAX_IMAGE_PROMPT_LENGTH) {
  const title = (recipe?.title ?? '').trim() || 'a home-cooked dish';
  const summary = (recipe?.summary ?? '').trim();
  const fixed = PREFIX.length + '.'.length + '\n'.length + STYLE.length;

  const safeTitle = truncate(title, Math.max(10, maxLength - fixed));
  const summaryBudget = maxLength - fixed - safeTitle.length - ' '.length;
  const safeSummary = summaryBudget >= 10 ? truncate(summary, summaryBudget) : '';

  const prompt = `${PREFIX}${safeTitle}.${safeSummary ? ` ${safeSummary}` : ''}\n${STYLE}`;
  return prompt.slice(0, maxLength);
}
