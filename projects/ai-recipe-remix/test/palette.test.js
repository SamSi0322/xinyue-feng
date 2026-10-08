import assert from 'node:assert/strict';
import { test } from 'node:test';
import tailwindConfig from '../tailwind.config.js';

const { colors } = tailwindConfig.theme.extend;
const white = '#ffffff';

function luminance(hex) {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

// Every text colour / background pair used in the components.
const textPairs = [
  ['body text on cream', colors.ink.DEFAULT, colors.cream.DEFAULT],
  ['body text on cards', colors.ink.DEFAULT, colors.paper],
  ['secondary text on cream', colors.ink.muted, colors.cream.DEFAULT],
  ['secondary text on cards', colors.ink.muted, colors.paper],
  ['secondary text on tinted panels', colors.ink.muted, colors.cream[100]],
  ['hint text on cards', colors.ink.soft, colors.paper],
  ['hint text on cream', colors.ink.soft, colors.cream.DEFAULT],
  ['hint text on tinted panels', colors.ink.soft, colors.cream[100]],
  ['primary button label', white, colors.tomato[600]],
  ['primary button label (hover)', white, colors.tomato[700]],
  ['tomato links and labels on cards', colors.tomato[700], colors.paper],
  ['tomato labels on tomato tint', colors.tomato[700], colors.tomato[50]],
  ['error text on tomato tint', colors.ink.muted, colors.tomato[50]],
  ['"in your kitchen" on cards', colors.herb[700], colors.paper],
  ['"in your kitchen" on herb tint', colors.herb[700], colors.herb[50]],
  ['allergen warning text', colors.honey[800], colors.honey[50]],
  ['demo banner', colors.cream.DEFAULT, colors.ink.DEFAULT],
];

test('text colours meet WCAG AA (4.5:1)', () => {
  for (const [name, fg, bg] of textPairs) {
    const ratio = contrast(fg, bg);
    assert.ok(ratio >= 4.5, `${name}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
  }
});

test('form control borders and focus rings meet 3:1 against their backgrounds', () => {
  assert.ok(contrast(colors.line.strong, colors.paper) >= 3, 'input borders');
  assert.ok(contrast(colors.line.strong, white) >= 3, 'input borders on white fields');
  assert.ok(contrast(colors.tomato[600], colors.paper) >= 3, 'focus ring on cards');
  assert.ok(contrast(colors.tomato[600], colors.cream.DEFAULT) >= 3, 'focus ring on cream');
});

test('the brand tomato is not used for small white text (only 4.3:1)', () => {
  assert.ok(contrast(white, colors.tomato.DEFAULT) < 4.5);
});
