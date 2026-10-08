import { useRef, useState } from 'react';
import { mergeIngredients, parseIngredientList } from '../lib/ingredients.js';
import IngredientInput from './IngredientInput.jsx';
import PreferencesPanel from './PreferencesPanel.jsx';
import PresetChips from './PresetChips.jsx';
import { SparklesIcon, SpinnerIcon } from './icons.jsx';

/** Left column: ingredients, (demo) sample chips, diet + time, and the Generate button. */
export default function RecipeForm({ initial, busy, isDemo, presets, onGenerate, onPresetApplied }) {
  const [ingredients, setIngredients] = useState(initial.ingredients);
  const [draft, setDraft] = useState('');
  const [diet, setDiet] = useState(initial.diet);
  const [time, setTime] = useState(initial.time);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;

    // Include anything still typed in the box that wasn't turned into a chip yet.
    const merged = mergeIngredients(ingredients, parseIngredientList(draft));
    if (merged.added.length) {
      setIngredients(merged.list);
      setDraft('');
    }
    if (!merged.list.length) {
      setError('Add at least one ingredient to get started.');
      inputRef.current?.focus();
      return;
    }
    setError('');
    onGenerate({ ingredients: merged.list, diet, time });
  }

  function applyPreset(preset) {
    setIngredients(preset.ingredients);
    setDraft('');
    setDiet(preset.diet);
    setTime(preset.time);
    setError('');
    onPresetApplied?.(preset);
  }

  function handleIngredientsChange(list) {
    setIngredients(list);
    if (list.length) setError('');
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby="form-heading" className="card p-5 sm:p-7">
      <h2 id="form-heading" className="font-display text-2xl font-semibold tracking-tight">
        What’s in your kitchen?
      </h2>
      <p className="mt-1.5 text-ink-muted">
        Add a few ingredients, pick a diet and a time limit. You’ll get three recipes and a photo of each.
      </p>

      <div className="mt-6">
        <IngredientInput
          value={ingredients}
          onChange={handleIngredientsChange}
          draft={draft}
          onDraftChange={setDraft}
          inputRef={inputRef}
          error={error}
        />
        {isDemo && presets?.length > 0 && <PresetChips presets={presets} onSelect={applyPreset} />}
      </div>

      <div className="mt-6 border-t border-line pt-6">
        <PreferencesPanel diet={diet} onDietChange={setDiet} time={time} onTimeChange={setTime} />
      </div>

      <button
        type="submit"
        aria-disabled={busy || undefined}
        className="btn-primary mt-7 w-full text-base aria-disabled:cursor-progress aria-disabled:hover:bg-tomato-600"
      >
        {busy ? <SpinnerIcon className="h-5 w-5" /> : <SparklesIcon className="h-5 w-5" />}
        {busy ? 'Generating…' : 'Generate recipes'}
      </button>
      <p className="mt-3 text-center text-xs text-ink-soft">
        {isDemo
          ? 'This demo replays pre-generated results instead of calling the AI.'
          : 'Recipes take a few seconds; the photos follow one by one.'}
      </p>
    </form>
  );
}
