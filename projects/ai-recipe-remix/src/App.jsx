import { useCallback, useRef } from 'react';
import DemoBanner from './components/DemoBanner.jsx';
import Footer from './components/Footer.jsx';
import Header from './components/Header.jsx';
import LiveRegion from './components/LiveRegion.jsx';
import RecipeForm from './components/RecipeForm.jsx';
import Results from './components/Results.jsx';
import Toast from './components/Toast.jsx';
import { IS_DEMO } from './config.js';
import { defaultPreset, presets } from './demo/presets.js';
import { useAnnouncer } from './hooks/useAnnouncer.js';
import { useRecipeGenerator } from './hooks/useRecipeGenerator.js';
import { useToast } from './hooks/useToast.js';
import { dietLabel, formatList, formatMinutesLong } from './lib/format.js';
import { recipeSource } from './source.js';

/** On phones the results sit below the form, so bring them into view when generating. */
function revealResults(element) {
  if (!element || window.matchMedia('(min-width: 1024px)').matches) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}

export default function App() {
  const { messages, announce } = useAnnouncer();
  const { toast, showToast } = useToast();
  const { state, generate, retry, retryImage } = useRecipeGenerator(recipeSource, announce);
  const resultsRef = useRef(null);

  const handleGenerate = useCallback(
    (request) => {
      generate(request);
      revealResults(resultsRef.current);
    },
    [generate],
  );

  const handlePresetApplied = useCallback(
    (preset) => {
      announce(
        `Filled in the sample: ${formatList(preset.ingredients)}; ${dietLabel(preset.diet)}; ${formatMinutesLong(preset.time)}.`,
      );
    },
    [announce],
  );

  const handleCopied = useCallback(
    (ok) => {
      if (ok) showToast('Recipe copied to your clipboard');
      else showToast('Couldn’t copy. Try selecting the text instead.', 'error');
    },
    [showToast],
  );

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-cream"
      >
        Skip to content
      </a>
      {IS_DEMO && <DemoBanner />}
      <Header />

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
          <div className="lg:col-span-5 lg:[@media(min-height:780px)]:sticky lg:[@media(min-height:780px)]:top-6">
            <RecipeForm
              initial={defaultPreset}
              busy={state.status === 'loading'}
              isDemo={IS_DEMO}
              presets={presets}
              onGenerate={handleGenerate}
              onPresetApplied={handlePresetApplied}
            />
          </div>
          <section ref={resultsRef} aria-labelledby="results-heading" className="scroll-mt-4 lg:col-span-7">
            <Results
              state={state}
              isDemo={IS_DEMO}
              canRetryImages={recipeSource.canRetryImages}
              onRetry={retry}
              onRetryImage={retryImage}
              onCopied={handleCopied}
            />
          </section>
        </div>
      </main>

      <Footer />
      <LiveRegion messages={messages} />
      <Toast toast={toast} />
    </div>
  );
}
