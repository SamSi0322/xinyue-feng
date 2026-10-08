import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { fakeOpenAI, postJson, withServer } from './helpers.js';

const validRecipeBody = { ingredients: ['eggs', 'tomato', 'bread'], diet: 'vegetarian', time: 20 };

describe('importing server.js', () => {
  test('exposes the app factory and validators without listening or needing a key', async () => {
    const server = await import('../server.js');
    assert.equal(typeof server.createApp, 'function');
    assert.equal(typeof server.start, 'function');
    assert.equal(typeof server.validateRecipeRequest, 'function');
    assert.equal(typeof server.validateImageRequest, 'function');
    // If importing had started a server, this test file would never exit.
  });
});

describe('GET /api/health', () => {
  test('answers { ok: true }', async () => {
    await withServer({ openai: null }, async (base) => {
      const res = await fetch(`${base}/api/health`);
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { ok: true });
      assert.equal(res.headers.get('x-powered-by'), null);
    });
  });
});

describe('POST /api/recipes', () => {
  test('returns { recipes } from the model', async () => {
    const openai = fakeOpenAI();
    await withServer({ openai }, async (base) => {
      const res = await postJson(`${base}/api/recipes`, validRecipeBody);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.recipes.length, 3);
      assert.equal(body.recipes[0].title, 'Tomato Egg Toast');
      assert.equal(res.headers.get('cache-control'), 'no-store');

      const { params } = openai.calls.chat[0];
      assert.equal(params.response_format.type, 'json_schema');
      assert.equal(params.response_format.json_schema.strict, true);
      assert.deepEqual(JSON.parse(params.messages[1].content).availableIngredients, ['eggs', 'tomato', 'bread']);
    });
  });

  test('sends cleaned-up input to the model', async () => {
    const openai = fakeOpenAI();
    await withServer({ openai }, async (base) => {
      await postJson(`${base}/api/recipes`, { ingredients: [' Eggs ', 'eggs', 'Rice'], diet: 'Gluten-free', time: '25' });
      const payload = JSON.parse(openai.calls.chat[0].params.messages[1].content);
      assert.deepEqual(payload.availableIngredients, ['Eggs', 'Rice']);
      assert.deepEqual(payload.constraints, { diet: 'gluten_free', maxTimeMinutes: 25 });
    });
  });

  test('rejects invalid input with 400 and a clear message, without calling the model', async () => {
    const openai = fakeOpenAI();
    await withServer({ openai }, async (base) => {
      const cases = [
        [{}, /ingredients must be an array/],
        [{ ingredients: [] }, /at least one ingredient/],
        [{ ingredients: ['x'.repeat(41)] }, /at most 40 characters/],
        [{ ingredients: ['rice'], diet: 'paleo' }, /diet must be one of/],
        [{ ingredients: ['rice'], time: 500 }, /between 5 and 120/],
      ];
      for (const [body, message] of cases) {
        const res = await postJson(`${base}/api/recipes`, body);
        assert.equal(res.status, 400, JSON.stringify(body));
        assert.match((await res.json()).error, message);
      }
      assert.equal(openai.calls.chat.length, 0);
    });
  });

  test('answers 400 for malformed JSON and 413 for oversized bodies', async () => {
    await withServer({ openai: fakeOpenAI() }, async (base) => {
      const broken = await postJson(`${base}/api/recipes`, '{"ingredients": [');
      assert.equal(broken.status, 400);
      assert.deepEqual(await broken.json(), { error: 'Request body must be valid JSON.' });

      const huge = await postJson(`${base}/api/recipes`, { ingredients: ['x'.repeat(20_000)] });
      assert.equal(huge.status, 413);
      assert.deepEqual(await huge.json(), { error: 'Request body is too large.' });
    });
  });

  test('answers 503 with setup instructions when no API key is configured', async () => {
    await withServer({ env: {} }, async (base) => {
      const res = await postJson(`${base}/api/recipes`, validRecipeBody);
      assert.equal(res.status, 503);
      assert.match((await res.json()).error, /OPENAI_API_KEY/);
    });
  });

  test('hides upstream error details from the client but logs them', async () => {
    const leaky = Object.assign(new Error('401 Incorrect API key provided: sk-abc. at makeRequest (core.js:9:9)'), { status: 401 });
    await withServer({ openai: fakeOpenAI({ chatError: leaky }) }, async (base, { logger }) => {
      const res = await postJson(`${base}/api/recipes`, validRecipeBody);
      assert.equal(res.status, 502);
      const text = await res.text();
      assert.doesNotMatch(text, /sk-abc|Incorrect|core\.js|stack/i);
      assert.deepEqual(JSON.parse(text), { error: 'The AI service is unavailable right now. Please try again later.' });
      assert.ok(logger.lines.some((line) => line.includes('Incorrect API key')));
    });
  });

  test('copes with JSON wrapped in prose and rejects unusable output', async () => {
    const wrapped = `Sure! \`\`\`json\n${JSON.stringify({ recipes: [{ title: 'Soup', steps: ['Simmer.'] }] })}\n\`\`\``;
    await withServer({ openai: fakeOpenAI({ content: wrapped }) }, async (base) => {
      const res = await postJson(`${base}/api/recipes`, validRecipeBody);
      assert.equal(res.status, 200);
      assert.equal((await res.json()).recipes[0].title, 'Soup');
    });
    await withServer({ openai: fakeOpenAI({ content: 'not json' }) }, async (base) => {
      const res = await postJson(`${base}/api/recipes`, validRecipeBody);
      assert.equal(res.status, 502);
      assert.match((await res.json()).error, /unexpected/);
    });
  });

  test('rate-limits each IP', async () => {
    await withServer({ env: { RATE_LIMIT_RECIPES: '2' }, openai: fakeOpenAI() }, async (base) => {
      assert.equal((await postJson(`${base}/api/recipes`, validRecipeBody)).status, 200);
      assert.equal((await postJson(`${base}/api/recipes`, validRecipeBody)).status, 200);
      const limited = await postJson(`${base}/api/recipes`, validRecipeBody);
      assert.equal(limited.status, 429);
      assert.match((await limited.json()).error, /Too many recipe requests/);
      assert.ok(limited.headers.get('ratelimit-policy'));
    });
  });
});

describe('POST /api/image', () => {
  test('returns { imageDataUrl }', async () => {
    const openai = fakeOpenAI();
    await withServer({ openai }, async (base) => {
      const res = await postJson(`${base}/api/image`, { prompt: 'High quality food photography of: soup.' });
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { imageDataUrl: 'data:image/webp;base64,aGVsbG8=' });
      assert.equal(openai.calls.images[0].params.size, '1024x1024');
      assert.equal(openai.calls.images[0].params.quality, 'low');
    });
  });

  test('rejects missing or overlong prompts', async () => {
    const openai = fakeOpenAI();
    await withServer({ openai }, async (base) => {
      assert.equal((await postJson(`${base}/api/image`, {})).status, 400);
      const long = await postJson(`${base}/api/image`, { prompt: 'a'.repeat(601) });
      assert.equal(long.status, 400);
      assert.match((await long.json()).error, /at most 600 characters/);
      assert.equal(openai.calls.images.length, 0);
    });
  });

  test('has its own rate limit', async () => {
    await withServer({ env: { RATE_LIMIT_IMAGES: '1' }, openai: fakeOpenAI() }, async (base) => {
      assert.equal((await postJson(`${base}/api/image`, { prompt: 'soup' })).status, 200);
      assert.equal((await postJson(`${base}/api/image`, { prompt: 'soup' })).status, 429);
      assert.equal((await postJson(`${base}/api/recipes`, validRecipeBody)).status, 200);
    });
  });
});

describe('CORS', () => {
  const env = { ALLOWED_ORIGINS: 'https://lily.example' };

  test('allows listed origins', async () => {
    await withServer({ env, openai: fakeOpenAI() }, async (base) => {
      const res = await postJson(`${base}/api/recipes`, validRecipeBody, { Origin: 'https://lily.example' });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('access-control-allow-origin'), 'https://lily.example');

      const preflight = await fetch(`${base}/api/recipes`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://lily.example',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type',
        },
      });
      assert.equal(preflight.status, 204);
      assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://lily.example');
    });
  });

  test('refuses other origins before doing any work', async () => {
    const openai = fakeOpenAI();
    await withServer({ env, openai }, async (base) => {
      const res = await postJson(`${base}/api/recipes`, validRecipeBody, { Origin: 'https://evil.example' });
      assert.equal(res.status, 403);
      assert.equal(res.headers.get('access-control-allow-origin'), null);
      assert.equal(openai.calls.chat.length, 0);
    });
  });

  test('defaults to local dev origins only', async () => {
    await withServer({ openai: fakeOpenAI() }, async (base) => {
      const local = await postJson(`${base}/api/recipes`, validRecipeBody, { Origin: 'http://localhost:5173' });
      assert.equal(local.status, 200);
      const remote = await postJson(`${base}/api/recipes`, validRecipeBody, { Origin: 'https://example.com' });
      assert.equal(remote.status, 403);
    });
  });
});

test('unknown routes answer 404 JSON', async () => {
  await withServer({ openai: null }, async (base) => {
    const res = await fetch(`${base}/api/nope`);
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: 'Not found.' });
  });
});
