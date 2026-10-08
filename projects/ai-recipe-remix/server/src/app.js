import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import OpenAI from 'openai';
import { describeFailure, generateImage, generateRecipes } from './ai.js';
import { loadConfig } from './config.js';
import { validateImageRequest, validateRecipeRequest } from './validation.js';

const NOT_CONFIGURED =
  'Recipe generation is not set up on this server yet: add OPENAI_API_KEY to server/.env and restart it.';

/** Abort the upstream OpenAI call if the browser goes away before we answer. */
function abortWhenClientLeaves(res) {
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableFinished) controller.abort();
  });
  return controller.signal;
}

/**
 * Build the Express app without starting it, so tests can run it on a random
 * port with a fake OpenAI client.
 *
 * @param {object} [options]
 * @param {ReturnType<typeof loadConfig>} [options.config]
 * @param {object|null} [options.openai] OpenAI client (or a fake). Defaults to a real client when a key is configured.
 * @param {Pick<Console, 'error' | 'warn'>} [options.logger]
 */
export function createApp({ config = loadConfig(), openai, logger = console } = {}) {
  const client =
    openai !== undefined ? openai : config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey, maxRetries: 1 }) : null;

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    next();
  });

  app.get('/api/health', (req, res) => {
    res.json({ ok: true });
  });

  // CORS allow-list. Browsers on other origins are refused outright (not just denied
  // CORS headers), so the API can't be used from someone else's page.
  const allowAny = config.allowedOrigins.includes('*');
  const allowed = new Set(config.allowedOrigins);
  app.use('/api', (req, res, next) => {
    const origin = req.get('origin');
    if (origin && !allowAny && !allowed.has(origin)) {
      res.status(403).json({ error: 'This website is not allowed to use the recipe API.' });
      return;
    }
    next();
  });
  app.use(
    '/api',
    cors({
      origin: allowAny ? true : [...allowed],
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type'],
      maxAge: 600,
    }),
  );
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: '16kb' }));

  const limiter = (limit, message) =>
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      limit,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: message },
    });
  const recipeLimiter = limiter(
    config.rateLimit.recipes,
    'Too many recipe requests from your network. Please wait a few minutes and try again.',
  );
  const imageLimiter = limiter(
    config.rateLimit.images,
    'Too many photo requests from your network. Please wait a few minutes and try again.',
  );

  // Generate recipes (text, as structured JSON)
  app.post('/api/recipes', recipeLimiter, async (req, res) => {
    const input = validateRecipeRequest(req.body);
    if (!input.ok) return res.status(400).json({ error: input.error });
    if (!client) return res.status(503).json({ error: NOT_CONFIGURED });

    const signal = abortWhenClientLeaves(res);
    try {
      const recipes = await generateRecipes(client, config, input.value, { signal });
      return res.json({ recipes });
    } catch (error) {
      if (signal.aborted) return undefined; // nobody is listening any more
      const failure = describeFailure(error, { action: 'recipes' });
      logger.error(`[POST /api/recipes] ${failure.log}`);
      return res.status(failure.status).json({ error: failure.message });
    }
  });

  // Generate one photo (returns a data URL: data:image/webp;base64,...)
  app.post('/api/image', imageLimiter, async (req, res) => {
    const input = validateImageRequest(req.body);
    if (!input.ok) return res.status(400).json({ error: input.error });
    if (!client) return res.status(503).json({ error: NOT_CONFIGURED });

    const signal = abortWhenClientLeaves(res);
    try {
      const imageDataUrl = await generateImage(client, config, input.value.prompt, { signal });
      return res.json({ imageDataUrl });
    } catch (error) {
      if (signal.aborted) return undefined;
      const failure = describeFailure(error, { action: 'image' });
      logger.error(`[POST /api/image] ${failure.log}`);
      return res.status(failure.status).json({ error: failure.message });
    }
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });

  // Last-resort error handler: log details, send a generic message (never a stack trace).
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Request body must be valid JSON.' });
    }
    if (error?.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request body is too large.' });
    }
    logger.error('[server] Unhandled error:', error);
    return res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
  });

  return app;
}
