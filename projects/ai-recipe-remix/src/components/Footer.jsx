import { SOURCE_URL } from '../config.js';
import { ArrowUpRightIcon } from './icons.jsx';

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-7 text-sm text-ink-soft sm:flex-row sm:items-start sm:justify-between sm:px-6 lg:px-8">
        <div className="space-y-1">
          <p>Original by Xinyue (Lily) Feng for CPS 3500 Project 1 · 2026 edition built with AI coding tools · React + Express + OpenAI</p>
          <p className="text-xs">Recipes and photos are AI-generated. Double-check allergens and cooking times.</p>
        </div>
        <a
          href={SOURCE_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 self-start font-medium text-tomato-700 underline-offset-2 hover:underline"
        >
          Source
          <ArrowUpRightIcon className="h-3.5 w-3.5" />
          <span className="sr-only">(GitHub, opens in a new tab)</span>
        </a>
      </div>
    </footer>
  );
}
