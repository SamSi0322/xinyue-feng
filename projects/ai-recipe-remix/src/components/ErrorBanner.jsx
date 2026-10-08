import { AlertIcon, RefreshIcon } from './icons.jsx';

/** Friendly error with an optional retry. `message` is always a user-facing string, never a stack trace. */
export default function ErrorBanner({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-tomato-200 bg-tomato-50 p-5">
      <div className="flex gap-3">
        <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-tomato-700" />
        <div className="min-w-0">
          <h3 className="font-semibold text-ink">Couldn’t generate recipes</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">{message}</p>
          {onRetry && (
            <button type="button" onClick={onRetry} className="btn-secondary mt-4">
              <RefreshIcon className="h-4 w-4" />
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
