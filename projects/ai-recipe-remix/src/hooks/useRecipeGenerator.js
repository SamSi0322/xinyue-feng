import { useCallback, useEffect, useReducer, useRef } from 'react';
import { isAbortError, toUserError } from '../lib/errors.js';
import { pluralize } from '../lib/format.js';

const initialState = {
  status: 'idle', // idle | loading | success | error
  runId: 0,
  request: null, // { ingredients, diet, time } used for the current results
  recipes: [],
  images: [], // one { status: 'pending' | 'ready' | 'error', src } per recipe
  notice: null,
  error: null, // { message, retryable }
};

function reducer(state, action) {
  switch (action.type) {
    case 'start':
      return { ...initialState, status: 'loading', runId: action.runId, request: action.request };
    case 'recipes':
      if (action.runId !== state.runId) return state;
      return {
        ...state,
        status: 'success',
        recipes: action.recipes,
        notice: action.notice,
        images: action.recipes.map(() => ({ status: 'pending', src: null })),
      };
    case 'failed':
      if (action.runId !== state.runId) return state;
      return { ...state, status: 'error', error: action.error };
    case 'image': {
      if (action.runId !== state.runId || !state.images[action.index]) return state;
      const images = state.images.slice();
      images[action.index] = { status: action.status, src: action.src ?? null };
      return { ...state, images };
    }
    default:
      return state;
  }
}

/**
 * Runs one generation at a time: recipes first, then every photo independently
 * (a slow or failed photo never holds up the others). Starting a new run cancels
 * the previous one.
 */
export function useRecipeGenerator(source, announce) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const runRef = useRef(null);

  useEffect(() => () => runRef.current?.controller.abort(), []);

  const loadImage = useCallback(
    (run, index) => {
      dispatch({ type: 'image', runId: run.id, index, status: 'pending' });
      run.result.loadImage(index, { signal: run.controller.signal }).then(
        (src) => {
          if (run.controller.signal.aborted) return;
          dispatch({ type: 'image', runId: run.id, index, status: 'ready', src });
          announce(`Image ready: ${run.result.recipes[index].title}`);
        },
        (error) => {
          if (run.controller.signal.aborted) return;
          if (import.meta.env.DEV && !isAbortError(error)) console.warn('[photo]', error);
          dispatch({ type: 'image', runId: run.id, index, status: 'error' });
        },
      );
    },
    [announce],
  );

  const generate = useCallback(
    async (request) => {
      runRef.current?.controller.abort();
      const run = { id: (runRef.current?.id ?? 0) + 1, controller: new AbortController(), request, result: null };
      runRef.current = run;

      dispatch({ type: 'start', runId: run.id, request });
      announce('Generating recipes…');
      try {
        const result = await source.generate(request, { signal: run.controller.signal });
        if (runRef.current !== run) return;
        run.result = result;
        dispatch({ type: 'recipes', runId: run.id, recipes: result.recipes, notice: result.notice ?? null });
        const ready = `${pluralize(result.recipes.length, 'recipe')} ready`;
        announce(result.notice ? `${ready}. ${result.notice.replaceAll(' · ', ', ')}` : ready);
        result.recipes.forEach((_, index) => loadImage(run, index));
      } catch (error) {
        if (runRef.current !== run || run.controller.signal.aborted) return;
        if (import.meta.env.DEV) console.warn('[recipes]', error);
        const userError = toUserError(error);
        dispatch({ type: 'failed', runId: run.id, error: userError });
        announce(`Couldn't generate recipes. ${userError.message}`);
      }
    },
    [source, announce, loadImage],
  );

  const retry = useCallback(() => {
    const last = runRef.current?.request;
    if (last) generate(last);
  }, [generate]);

  const retryImage = useCallback(
    (index) => {
      const run = runRef.current;
      if (run?.result) loadImage(run, index);
    },
    [loadImage],
  );

  return { state, generate, retry, retryImage };
}
