import { README_SETUP_URL } from '../config.js';
import { ArrowUpRightIcon } from './icons.jsx';

export default function DemoBanner() {
  return (
    <div className="bg-ink text-cream">
      <p className="mx-auto max-w-6xl px-4 py-2.5 text-center text-sm leading-snug sm:px-6 lg:px-8">
        <strong className="font-semibold">Demo mode</strong> — showing pre-generated results. Run it locally with
        your own OpenAI key for live generation.{' '}
        <a
          href={README_SETUP_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 whitespace-nowrap font-medium underline decoration-cream/50 underline-offset-2 hover:decoration-cream focus-visible:outline-cream"
        >
          How to run it
          <ArrowUpRightIcon className="h-3.5 w-3.5" />
          <span className="sr-only">(README, opens in a new tab)</span>
        </a>
      </p>
    </div>
  );
}
