import { InfoIcon } from './icons.jsx';

/** Small informational note, e.g. the demo's "showing the closest sample" message. */
export default function Notice({ children }) {
  return (
    <div className="flex gap-2.5 rounded-xl border border-line bg-cream-100 px-4 py-3 text-sm leading-relaxed text-ink-muted">
      <InfoIcon className="mt-px h-[18px] w-[18px] shrink-0 text-tomato-700" />
      <p>{children}</p>
    </div>
  );
}
