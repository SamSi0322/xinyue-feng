/** Test helpers: a fake OpenAI client (no network, no key) and a server on a random port. */
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

export const sampleRecipe = {
  title: 'Tomato Egg Toast',
  summary: 'Soft scrambled eggs with jammy tomatoes on crisp toast.',
  timeMinutes: 15,
  servings: 2,
  difficulty: 'easy',
  ingredients: [
    { item: 'eggs', amount: '4 large', optional: false },
    { item: 'tomatoes', amount: '2, chopped', optional: false },
    { item: 'bread', amount: '2 thick slices', optional: false },
    { item: 'chives', amount: '1 tbsp, snipped', optional: true },
  ],
  steps: ['Toast the bread.', 'Cook the tomatoes until jammy.', 'Scramble the eggs and spoon over the toast.'],
  substitutions: ['Use sourdough or any sturdy bread.'],
  allergens: ['eggs', 'wheat (gluten)'],
  tips: ['Take the eggs off the heat while they still look a little wet.'],
};

export function fakeOpenAI({
  content = JSON.stringify({ recipes: [sampleRecipe, sampleRecipe, sampleRecipe] }),
  refusal = null,
  finishReason = 'stop',
  chatError,
  imageB64 = 'aGVsbG8=',
  imageError,
} = {}) {
  const calls = { chat: [], images: [] };
  return {
    calls,
    chat: {
      completions: {
        async create(params, options) {
          calls.chat.push({ params, options });
          if (chatError) throw chatError;
          return {
            choices: [{ index: 0, finish_reason: finishReason, message: { role: 'assistant', content, refusal } }],
          };
        },
      },
    },
    images: {
      async generate(params, options) {
        calls.images.push({ params, options });
        if (imageError) throw imageError;
        return { created: 0, output_format: params.output_format, data: [{ b64_json: imageB64 }] };
      },
    },
  };
}

export function silentLogger() {
  const lines = [];
  const record = (...args) => lines.push(args.map(String).join(' '));
  return { lines, error: record, warn: record, info: record, log: record };
}

/** Start the app on 127.0.0.1:<random port>, run `fn(baseUrl)`, then shut it down. */
export async function withServer({ env = {}, openai, logger = silentLogger() } = {}, fn) {
  const app = createApp({ config: loadConfig(env), openai, logger });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address();
  try {
    return await fn(`http://127.0.0.1:${port}`, { logger });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

export function postJson(url, body, headers = {}) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}
