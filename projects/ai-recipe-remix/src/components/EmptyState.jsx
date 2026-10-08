import { BowlMark } from './icons.jsx';

export default function EmptyState({ isDemo }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong/50 bg-paper/70 px-6 py-14 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-tomato-50 text-tomato ring-8 ring-tomato-50/50">
        <BowlMark className="h-9 w-9" />
      </span>
      <h3 className="mt-5 font-display text-xl font-semibold">Nothing on the stove yet</h3>
      <p className="mx-auto mt-2 max-w-sm leading-relaxed text-ink-muted">
        Add what you have, choose a diet and a time limit, then press{' '}
        <span className="font-semibold text-ink">Generate recipes</span>.
      </p>
      {isDemo && (
        <p className="mx-auto mt-3 max-w-sm text-sm text-ink-soft">
          This demo replays pre-generated results. Try one of the samples to see each set.
        </p>
      )}
    </div>
  );
}
