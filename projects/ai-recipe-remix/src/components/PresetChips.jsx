import { dietLabel, formatList, formatMinutes } from '../lib/format.js';

/** Demo mode: one-click sample inputs ("Try: 🍳 Eggs · Tomato · Bread"). They only fill the form. */
export default function PresetChips({ presets, onSelect }) {
  return (
    <div role="group" aria-label="Sample ingredient lists" className="mt-4 flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-ink-soft">Try:</span>
      {presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onSelect(preset)}
          title={`${formatList(preset.ingredients)} · ${dietLabel(preset.diet)} · ${formatMinutes(preset.time)}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-line-strong/60 bg-paper px-3 py-1.5 text-sm text-ink transition-colors hover:border-tomato-600 hover:bg-tomato-50"
        >
          <span aria-hidden="true">{preset.emoji}</span>
          {preset.label}
          <span className="sr-only">
            , sample: {dietLabel(preset.diet)}, {formatMinutes(preset.time)}
          </span>
        </button>
      ))}
    </div>
  );
}
