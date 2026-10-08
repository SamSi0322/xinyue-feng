import { useEffect, useId, useMemo, useState } from 'react';
import { copyText } from '../lib/clipboard.js';
import { difficultyLabel, formatMinutes } from '../lib/format.js';
import { analyzeIngredients, describeUsage } from '../lib/ingredients.js';
import { recipeToText } from '../lib/recipeText.js';
import RecipeImage from './RecipeImage.jsx';
import {
  AlertIcon,
  BasketIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  DifficultyIcon,
  JarIcon,
  KitchenIcon,
  LightbulbIcon,
  ServingsIcon,
  SwapIcon,
} from './icons.jsx';

const DIFFICULTY_LEVEL = { easy: 1, medium: 2, hard: 3 };

export default function RecipeCard({ recipe, index, total, image, userIngredients, canRetryImage, onRetryImage, onCopied }) {
  const titleId = useId();
  const [copied, setCopied] = useState(false);
  const analysis = useMemo(
    () => analyzeIngredients(recipe.ingredients, userIngredients),
    [recipe.ingredients, userIngredients],
  );

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    try {
      await copyText(recipeToText(recipe));
      setCopied(true);
      onCopied?.(true);
    } catch {
      onCopied?.(false);
    }
  }

  return (
    <article
      aria-labelledby={titleId}
      className="card overflow-hidden motion-safe:animate-fade-up"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <RecipeImage
        status={image?.status}
        src={image?.src}
        title={recipe.title}
        canRetry={canRetryImage}
        onRetry={onRetryImage}
      />

      <div className="p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1 basis-60">
            <p className="section-label text-tomato-700">
              Recipe {index + 1} of {total}
            </p>
            <h3 id={titleId} className="mt-1 font-display text-2xl font-semibold leading-snug tracking-tight">
              {recipe.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            aria-label={`Copy recipe: ${recipe.title}`}
            className="btn-secondary shrink-0"
          >
            {copied ? <CheckIcon className="h-4 w-4 text-herb-700" /> : <CopyIcon className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy recipe'}
          </button>
        </div>

        {recipe.summary && <p className="mt-2.5 leading-relaxed text-ink-muted">{recipe.summary}</p>}

        <ul role="list" className="mt-4 flex flex-wrap gap-2 text-sm text-ink-muted">
          {recipe.timeMinutes ? (
            <Fact icon={<ClockIcon className="h-4 w-4" />} label="Time">
              {formatMinutes(recipe.timeMinutes)}
            </Fact>
          ) : null}
          {recipe.servings ? (
            <Fact icon={<ServingsIcon className="h-4 w-4" />} label="Servings">
              Serves {recipe.servings}
            </Fact>
          ) : null}
          {recipe.difficulty ? (
            <Fact icon={<DifficultyIcon level={DIFFICULTY_LEVEL[recipe.difficulty]} className="h-4 w-4" />} label="Difficulty">
              {difficultyLabel(recipe.difficulty)}
            </Fact>
          ) : null}
        </ul>

        <Ingredients analysis={analysis} />

        {recipe.allergens.length > 0 && (
          <div className="mt-4 flex gap-2.5 rounded-xl border border-honey-200 bg-honey-50 px-4 py-3 text-sm text-honey-800">
            <AlertIcon className="mt-px h-[18px] w-[18px] shrink-0" />
            <p>
              <span className="font-semibold">Allergens:</span> {recipe.allergens.join(', ')}
            </p>
          </div>
        )}

        {recipe.steps.length > 0 && (
          <section className="mt-7">
            <h4 className="font-display text-lg font-semibold">Steps</h4>
            <ol role="list" className="mt-3 space-y-3.5">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-3.5">
                  <span
                    aria-hidden="true"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-tomato-50 font-display text-sm font-semibold text-tomato-700 ring-1 ring-tomato-100"
                  >
                    {i + 1}
                  </span>
                  <p className="pt-0.5 leading-relaxed text-ink">
                    <span className="sr-only">Step {i + 1}: </span>
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {(recipe.substitutions.length > 0 || recipe.tips.length > 0) && (
          <div
            className={`mt-7 grid gap-3 ${recipe.substitutions.length > 0 && recipe.tips.length > 0 ? 'md:grid-cols-2' : ''}`}
          >
            {recipe.substitutions.length > 0 && (
              <NoteList title="Substitutions" icon={<SwapIcon className="h-[18px] w-[18px] text-tomato-700" />} items={recipe.substitutions} />
            )}
            {recipe.tips.length > 0 && (
              <NoteList title="Tips" icon={<LightbulbIcon className="h-[18px] w-[18px] text-tomato-700" />} items={recipe.tips} />
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function Fact({ icon, label, children }) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full bg-cream-100 px-3 py-1">
      {icon}
      <span className="sr-only">{label}: </span>
      {children}
    </li>
  );
}

function Ingredients({ analysis }) {
  return (
    <section className="mt-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="font-display text-lg font-semibold">
          Ingredients
        </h4>
        <p className="text-sm text-ink-muted">{describeUsage(analysis)}</p>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <IngredientGroup
          title="In your kitchen"
          icon={<KitchenIcon className="h-4 w-4" />}
          items={analysis.have}
          empty="None of your ingredients this time."
          className="border-herb-100 bg-herb-50/70"
          titleClassName="text-herb-700"
        />
        <IngredientGroup
          title="To buy"
          icon={<BasketIcon className="h-4 w-4" />}
          items={analysis.buy}
          empty="Nothing to buy. You have it all!"
          className="border-line bg-cream/70"
          titleClassName="text-tomato-700"
        />
      </div>

      {analysis.pantry.length > 0 && (
        <p className="mt-3 flex items-start gap-2 text-sm text-ink-muted">
          <JarIcon className="mt-px h-4 w-4 shrink-0 text-ink-soft" />
          <span>
            <span className="font-medium text-ink">Pantry staples:</span>{' '}
            {analysis.pantry.map((i) => (i.amount ? `${i.item} (${i.amount})` : i.item)).join(', ')}
          </span>
        </p>
      )}
    </section>
  );
}

function IngredientGroup({ title, icon, items, empty, className, titleClassName }) {
  return (
    <div className={`rounded-xl border p-4 ${className}`}>
      <h5 className={`section-label flex items-center gap-1.5 ${titleClassName}`}>
        {icon}
        {title}
        <span className="font-medium normal-case tracking-normal">· {items.length}</span>
      </h5>
      {items.length ? (
        <ul role="list" className="mt-2 divide-y divide-line/80">
          {items.map((ingredient, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <span className="min-w-0 text-ink">
                {ingredient.item}
                {ingredient.optional && (
                  <span className="ml-1.5 whitespace-nowrap rounded-full bg-cream-200 px-1.5 py-px text-[0.7rem] font-medium uppercase tracking-wide text-ink-muted">
                    optional
                  </span>
                )}
              </span>
              {ingredient.amount && <span className="max-w-[50%] text-right text-ink-muted">{ingredient.amount}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">{empty}</p>
      )}
    </div>
  );
}

function NoteList({ title, icon, items }) {
  return (
    <section className="rounded-xl bg-cream-100/80 p-4">
      <h4 className="flex items-center gap-2 font-semibold text-ink">
        {icon}
        {title}
      </h4>
      <ul role="list" className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-muted">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden="true" className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-ink-soft" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
