import { FriendlyError, GENERIC_ERROR, isAbortError } from './errors.js';
import { buildImagePrompt } from './imagePrompt.js';
import { normalizeRecipes } from './recipes.js';

const UNREACHABLE = "Couldn't reach the recipe server. Please check your connection and try again.";
const UNREACHABLE_DEV =
  "Couldn't reach the recipe server. Is it running? Start it with “cd server && npm run dev”, " +
  'and make sure ALLOWED_ORIGINS in server/.env includes this address.';

/** Only pass through short, single-line messages written by our own server. */
function safeServerMessage(data) {
  const message = typeof data?.error === 'string' ? data.error.trim() : '';
  if (!message || message.length > 240 || /[\r\n]/.test(message)) return null;
  if (/^\w*Error\b|\bat \S+ \(|:\d+:\d+/.test(message)) return null; // looks like a stack trace
  return message;
}

function errorForResponse(status, data, dev) {
  const fromServer = safeServerMessage(data);
  if (status === 400) {
    return new FriendlyError(fromServer ?? 'Please check your ingredients and try again.', { status, retryable: false });
  }
  if (status === 403) {
    const message = dev
      ? 'The recipe server rejected this address. Add it to ALLOWED_ORIGINS in server/.env and restart the server.'
      : (fromServer ?? 'This site is not allowed to use the recipe server.');
    return new FriendlyError(message, { status, retryable: false });
  }
  if (status === 429) {
    return new FriendlyError(fromServer ?? 'Too many requests. Please wait a few minutes and try again.', { status });
  }
  if (!data) {
    // Not JSON at all: a proxy or hosting error page, e.g. the dev proxy when the server is not running.
    return new FriendlyError(dev ? UNREACHABLE_DEV : 'The recipe server is unavailable right now. Please try again in a moment.', { status });
  }
  return new FriendlyError(fromServer ?? GENERIC_ERROR, { status });
}

/**
 * Live mode: the Express backend in server/ (POST /api/recipes, POST /api/image).
 * `baseUrl` is VITE_API_BASE_URL, or "" to use same-origin /api (the Vite proxy in dev).
 */
export function createLiveSource({ baseUrl = '', fetchImpl = (...args) => globalThis.fetch(...args), dev = false } = {}) {
  async function postJson(path, body, signal) {
    let response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        signal,
      });
    } catch (error) {
      if (isAbortError(error)) throw error;
      throw new FriendlyError(dev ? UNREACHABLE_DEV : UNREACHABLE);
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) throw errorForResponse(response.status, data, dev);
    if (!data || typeof data !== 'object') throw new FriendlyError(GENERIC_ERROR, { status: response.status });
    return data;
  }

  return {
    canRetryImages: true,

    async generate({ ingredients, diet, time }, { signal } = {}) {
      const data = await postJson('/api/recipes', { ingredients, diet, time }, signal);
      const recipes = normalizeRecipes(data.recipes);
      if (!recipes.length) {
        throw new FriendlyError('The AI came back without any recipes. Please try again.');
      }
      return {
        recipes,
        notice: null,
        async loadImage(index, { signal: imageSignal } = {}) {
          const image = await postJson('/api/image', { prompt: buildImagePrompt(recipes[index]) }, imageSignal);
          if (typeof image.imageDataUrl !== 'string' || !image.imageDataUrl.startsWith('data:image/')) {
            throw new FriendlyError('No photo came back for this recipe.');
          }
          return image.imageDataUrl;
        },
      };
    },
  };
}
