/**
 * AI Recipe Remix API.
 *
 *   npm run dev    (restarts on file changes)
 *   npm start
 *
 * Importing this file (e.g. from tests) does not start a server or need an API
 * key: it only listens when run directly with `node server.js`.
 */
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createApp } from './src/app.js';
import { loadConfig } from './src/config.js';

export { createApp } from './src/app.js';
export { loadConfig } from './src/config.js';
export { DIETS, LIMITS, validateImageRequest, validateRecipeRequest } from './src/validation.js';

export function start(env = process.env) {
  const config = loadConfig(env);
  const app = createApp({ config });
  const server = app.listen(config.port);

  server.on('listening', () => {
    console.log(`AI Recipe Remix API listening on http://localhost:${config.port}`);
    console.log(`  text model: ${config.textModel}`);
    console.log(`  image model: ${config.imageModel} (${config.imageSize}, quality ${config.imageQuality}, ${config.imageFormat})`);
    console.log(`  allowed origins: ${config.allowedOrigins.join(', ')}`);
    if (!config.openaiApiKey) {
      console.warn(
        '  Warning: OPENAI_API_KEY is not set. Copy server/.env.example to server/.env and add your key;\n' +
          '  until then /api/recipes and /api/image answer 503.',
      );
    }
  });
  server.on('error', (error) => {
    console.error(
      error.code === 'EADDRINUSE'
        ? `Port ${config.port} is already in use. Stop the other process or set PORT in server/.env.`
        : `Could not start the server: ${error.message}`,
    );
    process.exitCode = 1;
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  return server;
}

function isRunDirectly() {
  if (typeof import.meta.main === 'boolean') return import.meta.main;
  try {
    return realpathSync(process.argv[1] ?? '') === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isRunDirectly()) {
  // Always read server/.env, no matter which folder the command was started from.
  dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)), quiet: true });
  start();
}
