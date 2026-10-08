import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createLiveSource } from '../src/lib/api.js';
import { FriendlyError, GENERIC_ERROR, toUserError } from '../src/lib/errors.js';

const recipe = {
  title: 'Soup',
  summary: 'Warm.',
  timeMinutes: 20,
  servings: 2,
  difficulty: 'easy',
  ingredients: [],
  steps: ['Simmer.'],
  substitutions: [],
  allergens: [],
  tips: [],
};

/** fetch stand-in: `routes` maps a path to a function returning { status, body } (body: object or raw string). */
function fakeFetch(routes) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    const path = new URL(url, 'http://app.test').pathname;
    const { status = 200, body } = routes[path](JSON.parse(init.body));
    const text = typeof body === 'string' ? body : JSON.stringify(body);
    return new Response(text, { status, headers: { 'Content-Type': typeof body === 'string' ? 'text/html' : 'application/json' } });
  };
  return { fetchImpl, calls };
}

const request = { ingredients: ['eggs'], diet: 'none', time: 30 };

describe('createLiveSource', () => {
  test('posts to /api/recipes, then fetches each image on demand', async () => {
    const { fetchImpl, calls } = fakeFetch({
      '/api/recipes': () => ({ body: { recipes: [recipe] } }),
      '/api/image': () => ({ body: { imageDataUrl: 'data:image/webp;base64,AAAA' } }),
    });
    const source = createLiveSource({ baseUrl: 'https://api.example.com', fetchImpl });
    const result = await source.generate(request);
    assert.equal(calls[0].url, 'https://api.example.com/api/recipes');
    assert.deepEqual(calls[0].body, request);
    assert.equal(result.recipes[0].title, 'Soup');
    assert.equal(await result.loadImage(0), 'data:image/webp;base64,AAAA');
    assert.match(calls[1].body.prompt, /^High quality food photography of: Soup\./);
  });

  test('shows the server message for validation errors, without a retry', async () => {
    const { fetchImpl } = fakeFetch({ '/api/recipes': () => ({ status: 400, body: { error: 'Add at least one ingredient.' } }) });
    await assert.rejects(createLiveSource({ fetchImpl }).generate(request), (error) => {
      assert.ok(error instanceof FriendlyError);
      assert.equal(error.message, 'Add at least one ingredient.');
      assert.equal(error.retryable, false);
      return true;
    });
  });

  test('never surfaces stack traces or raw upstream text', async () => {
    const leaky = 'TypeError: Cannot read properties of undefined\n    at handler (/app/server.js:42:13)';
    const { fetchImpl } = fakeFetch({ '/api/recipes': () => ({ status: 500, body: { error: leaky } }) });
    await assert.rejects(createLiveSource({ fetchImpl }).generate(request), (error) => {
      assert.equal(error.message, GENERIC_ERROR);
      return true;
    });
  });

  test('explains rate limits and unreachable servers in plain words', async () => {
    const limited = fakeFetch({ '/api/recipes': () => ({ status: 429, body: { error: 'Too many recipe requests from your network.' } }) });
    await assert.rejects(createLiveSource({ fetchImpl: limited.fetchImpl }).generate(request), /Too many recipe requests/);

    const html = fakeFetch({ '/api/recipes': () => ({ status: 502, body: '<html>Bad gateway</html>' }) });
    await assert.rejects(createLiveSource({ fetchImpl: html.fetchImpl }).generate(request), /unavailable right now/);
    await assert.rejects(createLiveSource({ fetchImpl: html.fetchImpl, dev: true }).generate(request), /npm run dev/);

    const offline = async () => {
      throw new TypeError('Failed to fetch');
    };
    await assert.rejects(createLiveSource({ fetchImpl: offline }).generate(request), /Couldn't reach the recipe server/);
  });

  test('passes aborts through untouched', async () => {
    const aborted = async () => {
      throw new DOMException('aborted', 'AbortError');
    };
    await assert.rejects(createLiveSource({ fetchImpl: aborted }).generate(request), { name: 'AbortError' });
  });

  test('treats an empty recipe list or a bad image payload as errors', async () => {
    const empty = fakeFetch({ '/api/recipes': () => ({ body: { recipes: [] } }) });
    await assert.rejects(createLiveSource({ fetchImpl: empty.fetchImpl }).generate(request), FriendlyError);

    const badImage = fakeFetch({
      '/api/recipes': () => ({ body: { recipes: [recipe] } }),
      '/api/image': () => ({ body: { imageDataUrl: 'javascript:alert(1)' } }),
    });
    const result = await createLiveSource({ fetchImpl: badImage.fetchImpl }).generate(request);
    await assert.rejects(result.loadImage(0), FriendlyError);
  });
});

test('toUserError hides unexpected exceptions behind a friendly message', () => {
  assert.deepEqual(toUserError(new TypeError('x is undefined')), { message: GENERIC_ERROR, retryable: true });
  assert.deepEqual(toUserError(new FriendlyError('Nope', { retryable: false })), { message: 'Nope', retryable: false });
});
