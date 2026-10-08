import { useState } from 'react';
import { BowlMark, RefreshIcon, SpinnerIcon } from './icons.jsx';

const FRAME = 'relative aspect-[4/3] overflow-hidden bg-cream-100 sm:aspect-[16/10]';

/**
 * The photo slot at the top of a recipe card:
 *   pending -> shimmer while the photo is generated,
 *   ready   -> the photo fades in once the browser has decoded it,
 *   error   -> a calm placeholder (with "Try again" in live mode).
 */
export default function RecipeImage({ status = 'pending', src, title, canRetry = false, onRetry }) {
  return (
    <div className={FRAME}>
      {status === 'ready' && src ? (
        <Photo key={src} src={src} title={title} canRetry={canRetry} onRetry={onRetry} />
      ) : status === 'error' ? (
        <Fallback canRetry={canRetry} onRetry={onRetry} />
      ) : (
        <Pending />
      )}
    </div>
  );
}

function Pending() {
  return (
    <div className="shimmer absolute inset-0 grid place-items-center">
      <p className="flex items-center gap-2 rounded-full bg-paper/85 px-3.5 py-1.5 text-sm text-ink-muted shadow-sm">
        <SpinnerIcon className="h-4 w-4 text-tomato" />
        Plating the photo…
      </p>
    </div>
  );
}

function Photo({ src, title, canRetry, onRetry }) {
  const [phase, setPhase] = useState('loading'); // loading | loaded | failed
  if (phase === 'failed') return <Fallback canRetry={canRetry} onRetry={onRetry} />;
  return (
    <>
      {phase === 'loading' && <div aria-hidden="true" className="shimmer absolute inset-0" />}
      <img
        src={src}
        alt={`AI-generated photo of ${title}`}
        decoding="async"
        onLoad={() => setPhase('loaded')}
        onError={() => setPhase('failed')}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out ${
          phase === 'loaded' ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </>
  );
}

function Fallback({ canRetry, onRetry }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-cream-100 via-cream to-tomato-50">
      <div className="flex flex-col items-center gap-2 px-4 text-center">
        <BowlMark className="h-10 w-10 text-tomato-200" />
        <p className="text-sm font-medium text-ink-soft">Photo unavailable</p>
        {canRetry && onRetry && (
          <button type="button" onClick={onRetry} className="btn-secondary mt-1">
            <RefreshIcon className="h-4 w-4" />
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
