import { dietLabel, formatList, formatMinutes } from '../lib/format.js';
import EmptyState from './EmptyState.jsx';
import ErrorBanner from './ErrorBanner.jsx';
import Notice from './Notice.jsx';
import RecipeCard from './RecipeCard.jsx';
import RecipeSkeleton from './RecipeSkeleton.jsx';
import { SpinnerIcon } from './icons.jsx';

function describeRequest({ ingredients, diet, time }) {
  return [
    `For ${formatList(ingredients)}`,
    diet && diet !== 'none' ? dietLabel(diet) : null,
    `up to ${formatMinutes(time)}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

function Status({ status, recipes, images }) {
  if (status === 'loading') {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        <SpinnerIcon className="h-4 w-4 text-tomato" />
        Cooking up ideas…
      </p>
    );
  }
  if (status !== 'success') return null;
  const ready = images.filter((image) => image.status !== 'pending').length;
  return (
    <p className="text-sm text-ink-muted">
      {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
      {ready < images.length && ` · photos ${ready} of ${images.length}`}
    </p>
  );
}

/** Right column: empty state, skeletons, errors or the recipe cards. */
export default function Results({ state, isDemo, canRetryImages, onRetry, onRetryImage, onCopied }) {
  const { status, recipes, images, request, notice, error, runId } = state;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="results-heading" className="font-display text-2xl font-semibold tracking-tight">
          Your recipes
        </h2>
        <Status status={status} recipes={recipes} images={images} />
      </div>
      {request && status !== 'idle' && <p className="mt-1 text-sm text-ink-soft">{describeRequest(request)}</p>}

      <div className="mt-5 space-y-5">
        {notice && status === 'success' && <Notice>{notice}</Notice>}

        {status === 'idle' && <EmptyState isDemo={isDemo} />}

        {status === 'loading' && (
          <div className="space-y-6">
            <RecipeSkeleton />
            <RecipeSkeleton />
            <RecipeSkeleton />
          </div>
        )}

        {status === 'error' && <ErrorBanner message={error.message} onRetry={error.retryable ? onRetry : undefined} />}

        {status === 'success' && (
          <ol role="list" className="space-y-6">
            {recipes.map((recipe, index) => (
              <li key={`${runId}-${index}`}>
                <RecipeCard
                  recipe={recipe}
                  index={index}
                  total={recipes.length}
                  image={images[index]}
                  userIngredients={request.ingredients}
                  canRetryImage={canRetryImages}
                  onRetryImage={() => onRetryImage(index)}
                  onCopied={onCopied}
                />
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
