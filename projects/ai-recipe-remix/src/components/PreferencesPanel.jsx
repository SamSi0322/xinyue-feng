import { useId } from 'react';
import { DIET_OPTIONS, TIME_LIMIT, formatMinutes, formatMinutesLong } from '../lib/format.js';
import { ChevronDownIcon } from './icons.jsx';

export default function PreferencesPanel({ diet, onDietChange, time, onTimeChange }) {
  const id = useId();
  const dietId = `${id}-diet`;
  const timeId = `${id}-time`;

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <label htmlFor={dietId} className="text-sm font-semibold text-ink">
          Diet
        </label>
        <div className="relative mt-2">
          <select
            id={dietId}
            value={diet}
            onChange={(event) => onDietChange(event.target.value)}
            className="w-full cursor-pointer appearance-none rounded-xl border border-line-strong bg-white py-2.5 pl-3.5 pr-10 text-base text-ink sm:text-[0.95rem]"
          >
            {DIET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={timeId} className="text-sm font-semibold text-ink">
            Time limit
          </label>
          {/* Visual echo of the slider value; screen readers get it from aria-valuetext. */}
          <span aria-hidden="true" className="font-display text-lg font-semibold tabular-nums text-ink">
            {formatMinutes(time)}
          </span>
        </div>
        <input
          id={timeId}
          type="range"
          min={TIME_LIMIT.min}
          max={TIME_LIMIT.max}
          step={TIME_LIMIT.step}
          value={time}
          onChange={(event) => onTimeChange(Number(event.target.value))}
          aria-valuetext={formatMinutesLong(time)}
          className="mt-3 h-2 w-full cursor-pointer accent-tomato-600"
        />
        <div aria-hidden="true" className="mt-1.5 flex justify-between text-xs text-ink-soft">
          <span>{formatMinutes(TIME_LIMIT.min)}</span>
          <span>{formatMinutes(TIME_LIMIT.max)}</span>
        </div>
      </div>
    </div>
  );
}
