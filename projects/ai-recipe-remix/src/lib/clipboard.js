/**
 * Copy text to the clipboard. Uses the async Clipboard API when available and
 * falls back to a hidden textarea (e.g. when the dev server is opened over
 * plain http on a phone, where navigator.clipboard is unavailable).
 */
export async function copyText(text) {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const previousFocus = document.activeElement;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (previousFocus instanceof HTMLElement) previousFocus.focus();
  if (!copied) throw new Error('Copy command was rejected');
}
