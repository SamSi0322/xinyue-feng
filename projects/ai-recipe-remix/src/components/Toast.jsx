import { AlertIcon, CheckIcon } from './icons.jsx';

/** Brief confirmation at the bottom of the screen. The container stays mounted so it is announced reliably. */
export default function Toast({ toast }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex justify-center px-4"
    >
      {toast && (
        <p
          key={toast.id}
          className="flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-cream shadow-lift motion-safe:animate-fade-up"
        >
          {toast.tone === 'error' ? <AlertIcon className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />}
          {toast.message}
        </p>
      )}
    </div>
  );
}
