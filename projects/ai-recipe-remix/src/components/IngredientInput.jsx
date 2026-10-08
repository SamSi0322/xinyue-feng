import { useEffect, useId, useRef, useState } from 'react';
import { formatList } from '../lib/format.js';
import {
  MAX_INGREDIENTS,
  MAX_INGREDIENT_LENGTH,
  hasSeparator,
  ingredientKey,
  mergeIngredients,
  parseIngredientList,
  splitDraft,
} from '../lib/ingredients.js';
import { CloseIcon } from './icons.jsx';

/**
 * Ingredient "chips" input.
 *   Enter or comma (incl. "，") adds what you typed; pasting a list adds every item;
 *   Backspace in an empty box removes the last chip; × removes one chip.
 * Duplicates are ignored case-insensitively (the existing chip flashes instead).
 */
export default function IngredientInput({ value, onChange, draft, onDraftChange, inputRef, error }) {
  const id = useId();
  const ids = { input: `${id}-input`, help: `${id}-help`, error: `${id}-error`, label: `${id}-label` };
  const [feedback, setFeedback] = useState(null); // { id, spoken, visible, tone }
  const [flashKey, setFlashKey] = useState(null);
  const feedbackId = useRef(0);

  useEffect(() => {
    if (!flashKey) return undefined;
    const timer = setTimeout(() => setFlashKey(null), 900);
    return () => clearTimeout(timer);
  }, [flashKey]);

  useEffect(() => {
    if (!feedback?.visible) return undefined;
    const timer = setTimeout(() => setFeedback((current) => (current === feedback ? null : current)), 5000);
    return () => clearTimeout(timer);
  }, [feedback]);

  function say(spoken, visible = null, tone = 'info') {
    feedbackId.current += 1;
    setFeedback({ id: feedbackId.current, spoken, visible, tone });
  }

  /** Add entries; when a single typed entry is rejected, keep it in the box so nothing is lost. */
  function add(entries, { nextDraft = '', fromDraft = false } = {}) {
    const result = mergeIngredients(value, entries);
    if (result.added.length) onChange(result.list);

    const rejected = [...result.tooLong, ...result.overLimit];
    onDraftChange(fromDraft && rejected.length === 1 && entries.length === 1 ? rejected[0] : nextDraft);

    const added = result.added.length ? `Added ${formatList(result.added)}.` : '';
    if (result.tooLong.length) {
      say(added, `Keep each ingredient under ${MAX_INGREDIENT_LENGTH} characters.`, 'warn');
    } else if (result.overLimit.length) {
      say(added, `That’s the limit: up to ${MAX_INGREDIENTS} ingredients.`, 'warn');
    } else if (result.duplicates.length && !result.added.length) {
      setFlashKey(ingredientKey(result.duplicates[0]));
      say('', `“${result.duplicates[0]}” is already on your list.`);
    } else if (added) {
      say(added);
    }
  }

  function removeAt(index) {
    const removed = value[index];
    onChange(value.filter((_, i) => i !== index));
    say(`Removed ${removed}.`);
  }

  function handleChange(event) {
    const text = event.target.value;
    if (hasSeparator(text)) {
      // Typed a comma (also catches mobile keyboards, where key events are unreliable).
      const { complete, rest } = splitDraft(text);
      add(complete, { nextDraft: rest, fromDraft: complete.length === 1 && !rest });
    } else {
      onDraftChange(text);
    }
  }

  function handleKeyDown(event) {
    // Let input methods (e.g. Chinese pinyin) use Enter to confirm a candidate.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;

    if (event.key === 'Enter' || event.key === ',') {
      if (draft.trim()) {
        event.preventDefault();
        add([draft], { fromDraft: true });
      } else if (event.key === ',') {
        event.preventDefault(); // no stray commas
      }
      // Enter in an empty box submits the form as usual.
      return;
    }
    if (event.key === 'Backspace' && draft === '' && value.length) {
      event.preventDefault();
      removeAt(value.length - 1);
    }
  }

  function handlePaste(event) {
    const text = event.clipboardData.getData('text');
    if (!hasSeparator(text)) return; // a single item pastes normally
    event.preventDefault();
    const input = event.currentTarget;
    const start = input.selectionStart ?? draft.length;
    const end = input.selectionEnd ?? draft.length;
    add(parseIngredientList(draft.slice(0, start) + text + draft.slice(end)));
  }

  function handleBlur() {
    if (draft.trim()) add([draft], { fromDraft: true });
  }

  function clearAll() {
    onChange([]);
    onDraftChange('');
    say('Cleared all ingredients.');
    inputRef.current?.focus();
  }

  function focusInput(event) {
    if (event.target === event.currentTarget) {
      event.preventDefault();
      inputRef.current?.focus();
    }
  }

  const describedBy = [ids.help, error ? ids.error : null].filter(Boolean).join(' ');

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label id={ids.label} htmlFor={ids.input} className="text-sm font-semibold text-ink">
          Ingredients
        </label>
        <div className="flex items-baseline gap-3 text-xs text-ink-soft">
          <span>
            {value.length} of {MAX_INGREDIENTS}
          </span>
          {value.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="rounded font-medium text-tomato-700 underline-offset-2 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Clicking empty space in the box focuses the text field. */}
      <div
        onMouseDown={focusInput}
        className={`mt-2 flex min-h-[3.25rem] cursor-text flex-wrap items-center gap-1.5 rounded-xl border bg-white p-2 transition-shadow focus-within:border-tomato-600 focus-within:ring-[3px] focus-within:ring-tomato-600/25 ${
          error ? 'border-tomato-600' : 'border-line-strong'
        }`}
      >
        {value.length > 0 && (
          <ul role="list" aria-labelledby={ids.label} className="contents">
            {value.map((item, index) => {
              const key = ingredientKey(item);
              return (
                <li
                  key={key}
                  className={`inline-flex max-w-full items-center gap-0.5 rounded-full border bg-cream-100 py-0.5 pl-3 pr-0.5 text-sm text-ink ${
                    flashKey === key ? 'animate-flash border-tomato-600' : 'border-line'
                  }`}
                >
                  <span className="truncate">{item}</span>
                  <button
                    type="button"
                    onClick={() => {
                      removeAt(index);
                      inputRef.current?.focus();
                    }}
                    aria-label={`Remove ${item}`}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-tomato-100 hover:text-tomato-700"
                  >
                    <CloseIcon className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <input
          ref={inputRef}
          id={ids.input}
          type="text"
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={handleBlur}
          placeholder={value.length ? 'Add another…' : 'e.g. eggs, tomato, rice'}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          autoCapitalize="none"
          enterKeyHint="enter"
          className="min-w-[9rem] flex-1 bg-transparent px-1.5 py-1.5 text-base text-ink placeholder:text-ink-soft focus:outline-none sm:text-[0.95rem]"
        />
      </div>

      <p id={ids.help} className="mt-2 text-xs leading-relaxed text-ink-soft">
        Press Enter or comma to add. Paste a list to add several at once. Backspace removes the last one.
      </p>
      {error && (
        <p id={ids.error} className="mt-1.5 text-sm font-medium text-tomato-700">
          {error}
        </p>
      )}
      <div aria-live="polite" className="text-sm">
        {feedback && (
          <p key={feedback.id} className={feedback.visible ? 'mt-1.5' : 'sr-only'}>
            {feedback.spoken && <span className={feedback.visible ? 'sr-only' : undefined}>{feedback.spoken} </span>}
            {feedback.visible && (
              <span className={feedback.tone === 'warn' ? 'font-medium text-tomato-700' : 'text-ink-muted'}>
                {feedback.visible}
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
