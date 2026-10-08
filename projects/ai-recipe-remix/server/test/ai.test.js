import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { APIConnectionTimeoutError, APIError } from 'openai';
import {
  UpstreamError,
  buildRecipeMessages,
  describeFailure,
  generateImage,
  generateRecipes,
  parseRecipeJson,
  sanitizeRecipes,
} from '../src/ai.js';
import { loadConfig } from '../src/config.js';
import { RECIPES_RESPONSE_FORMAT, RECIPES_SCHEMA } from '../src/recipe-schema.js';
import { fakeOpenAI, sampleRecipe } from './helpers.js';

const config = loadConfig({});
const input = { ingredients: ['eggs', 'tomato', 'bread'], diet: 'vegetarian', time: 20 };

/** Walk every object schema and check the rules OpenAI strict mode enforces. */
function assertStrict(schema, path = 'schema') {
  if (schema.type === 'object') {
    assert.equal(schema.additionalProperties, false, `${path} must set additionalProperties: false`);
    assert.deepEqual([...schema.required].sort(), Object.keys(schema.properties).sort(), `${path} must require every property`);
    for (const [key, value] of Object.entries(schema.properties)) assertStrict(value, `${path}.${key}`);
  }
  if (schema.type === 'array') assertStrict(schema.items, `${path}[]`);
}

describe('recipe schema', () => {
  test('is valid for Structured Outputs strict mode', () => {
    assertStrict(RECIPES_SCHEMA);
    assert.equal(RECIPES_RESPONSE_FORMAT.type, 'json_schema');
    assert.equal(RECIPES_RESPONSE_FORMAT.json_schema.strict, true);
    assert.match(RECIPES_RESPONSE_FORMAT.json_schema.name, /^[a-zA-Z0-9_-]{1,64}$/);
  });

  test('describes exactly the documented recipe fields', () => {
    assert.deepEqual(Object.keys(RECIPES_SCHEMA.properties.recipes.items.properties), Object.keys(sampleRecipe));
  });
});

describe('buildRecipeMessages', () => {
  test('sends the ingredients, diet and time limit as JSON data', () => {
    const [system, user] = buildRecipeMessages(input);
    assert.equal(system.role, 'system');
    assert.match(system.content, /not instructions/);
    const payload = JSON.parse(user.content);
    assert.deepEqual(payload.availableIngredients, input.ingredients);
    assert.deepEqual(payload.constraints, { diet: 'vegetarian', maxTimeMinutes: 20 });
  });
});

describe('parseRecipeJson', () => {
  test('parses plain JSON', () => {
    assert.deepEqual(parseRecipeJson('{"recipes":[]}'), { recipes: [] });
  });

  test('falls back to the outer {...} block when the JSON is wrapped in text', () => {
    assert.deepEqual(parseRecipeJson('Here you go:\n```json\n{"recipes":[{"title":"Soup"}]}\n```'), {
      recipes: [{ title: 'Soup' }],
    });
  });

  test('throws an UpstreamError for empty or broken output', () => {
    for (const text of ['', '   ', 'no json here', '{"recipes": [', undefined]) {
      assert.throws(() => parseRecipeJson(text), UpstreamError);
    }
  });
});

describe('sanitizeRecipes', () => {
  test('keeps at most 3 recipes in the exact schema shape and drops junk', () => {
    const messy = {
      recipes: [
        { ...sampleRecipe, extra: 'field', timeMinutes: 14.6, difficulty: 'EXTREME' },
        null,
        { title: '   ' },
        { title: 'Plain', ingredients: [{ item: 'rice' }, { amount: '1 cup' }, 'salt'] },
        sampleRecipe,
        sampleRecipe,
      ],
    };
    const recipes = sanitizeRecipes(messy);
    assert.equal(recipes.length, 3);
    assert.deepEqual(Object.keys(recipes[0]), Object.keys(sampleRecipe));
    assert.equal(recipes[0].timeMinutes, 15);
    assert.equal(recipes[0].difficulty, 'medium');
    assert.deepEqual(recipes[1].ingredients, [{ item: 'rice', amount: '', optional: false }]);
    assert.deepEqual(recipes[1].steps, []);
    assert.deepEqual(sanitizeRecipes({ nope: true }), []);
  });
});

describe('generateRecipes', () => {
  test('uses Structured Outputs with the configured model', async () => {
    const client = fakeOpenAI();
    const recipes = await generateRecipes(client, config, input);
    assert.equal(recipes.length, 3);
    const { params, options } = client.calls.chat[0];
    assert.equal(params.model, 'gpt-4.1-mini');
    assert.equal(params.temperature, 0.7);
    assert.deepEqual(params.response_format, RECIPES_RESPONSE_FORMAT);
    assert.equal(options.timeout, 60_000);
  });

  test('omits temperature when configured as "default"', async () => {
    const client = fakeOpenAI();
    await generateRecipes(client, loadConfig({ OPENAI_TEMPERATURE: 'default' }), input);
    assert.equal('temperature' in client.calls.chat[0].params, false);
  });

  test('turns refusals, truncation and empty answers into UpstreamErrors', async () => {
    await assert.rejects(generateRecipes(fakeOpenAI({ refusal: 'I cannot help' }), config, input), { kind: 'refusal' });
    await assert.rejects(generateRecipes(fakeOpenAI({ finishReason: 'length' }), config, input), { kind: 'bad_response' });
    await assert.rejects(generateRecipes(fakeOpenAI({ content: '{"recipes": []}' }), config, input), { kind: 'bad_response' });
  });
});

describe('generateImage', () => {
  test('requests a 1024x1024 low-quality webp and returns a data URL', async () => {
    const client = fakeOpenAI();
    const url = await generateImage(client, config, 'A bowl of soup');
    assert.equal(url, 'data:image/webp;base64,aGVsbG8=');
    const { params } = client.calls.images[0];
    assert.deepEqual(params, {
      model: 'gpt-image-1-mini',
      prompt: 'A bowl of soup',
      n: 1,
      size: '1024x1024',
      quality: 'low',
      output_format: 'webp',
      output_compression: 80,
    });
  });

  test('png output has no compression setting and a png data URL', async () => {
    const client = fakeOpenAI();
    const url = await generateImage(client, loadConfig({ OPENAI_IMAGE_FORMAT: 'png' }), 'Soup');
    assert.match(url, /^data:image\/png;base64,/);
    assert.equal('output_compression' in client.calls.images[0].params, false);
  });

  test('throws when no image comes back', async () => {
    await assert.rejects(generateImage(fakeOpenAI({ imageB64: '' }), config, 'Soup'), UpstreamError);
  });
});

describe('describeFailure', () => {
  const secret = 'Incorrect API key provided: sk-proj-abc***xyz. Stack: at OpenAI.makeRequest (core.js:1:1)';

  test('never puts upstream error text in the client message', () => {
    const errors = [
      APIError.generate(401, { error: { message: secret, code: 'invalid_api_key' } }, secret, new Headers()),
      APIError.generate(500, { error: { message: secret } }, secret, new Headers()),
      new Error(secret),
      new UpstreamError('bad_response', secret),
    ];
    for (const error of errors) {
      const failure = describeFailure(error);
      assert.doesNotMatch(failure.message, /sk-|Stack|core\.js|Incorrect/);
      assert.match(failure.log, /Incorrect API key/); // ...but the server log keeps the detail
    }
  });

  test('maps errors to sensible status codes', () => {
    assert.equal(describeFailure(new UpstreamError('refusal', 'x')).status, 422);
    assert.equal(describeFailure(new UpstreamError('bad_response', 'x')).status, 502);
    assert.equal(describeFailure(new APIConnectionTimeoutError()).status, 504);
    assert.equal(describeFailure(APIError.generate(429, {}, 'Rate limit', new Headers())).status, 503);
    assert.equal(describeFailure(APIError.generate(400, { error: { message: 'Your request was rejected by the safety system.', code: 'moderation_blocked' } }, undefined, new Headers()), { action: 'image' }).status, 422);
    assert.equal(describeFailure(APIError.generate(401, {}, 'bad key', new Headers())).status, 502);
    assert.equal(describeFailure(new TypeError('boom')).status, 502);
  });
});
