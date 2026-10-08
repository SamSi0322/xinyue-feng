import { BowlMark } from './icons.jsx';

export default function Header() {
  return (
    <header className="mx-auto w-full max-w-6xl px-4 pb-6 pt-8 sm:px-6 sm:pb-8 sm:pt-10 lg:px-8">
      <div className="flex items-center gap-3.5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-tomato-50 text-tomato ring-1 ring-tomato-100">
          <BowlMark className="h-8 w-8" />
        </span>
        <div>
          <h1 className="font-display text-[1.7rem] font-semibold leading-tight tracking-tight sm:text-3xl">
            AI Recipe Remix
          </h1>
          <p className="mt-0.5 text-[0.95rem] text-ink-muted sm:text-base">
            Turn what’s in your kitchen into three recipes, each with its own AI-generated photo.
          </p>
        </div>
      </div>
    </header>
  );
}
