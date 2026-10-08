/**
 * Server configuration from environment variables (see server/.env.example).
 * `loadConfig` takes the env object as an argument so tests never depend on the
 * real process environment.
 */

/** Vite dev server and `vite preview`, on localhost and 127.0.0.1. */
export const DEFAULT_ALLOWED_ORIGINS = Object.freeze([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]);

export const IMAGE_QUALITIES = Object.freeze(['low', 'medium', 'high', 'auto']);
export const IMAGE_FORMATS = Object.freeze(['webp', 'jpeg', 'png']);

const trimmed = (value) => String(value ?? '').trim();

function integer(value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const n = Number.parseInt(trimmed(value), 10);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

function oneOf(value, allowed, fallback) {
  const v = trimmed(value).toLowerCase();
  return allowed.includes(v) ? v : fallback;
}

/** "https://a.com, https://b.com/" -> ["https://a.com", "https://b.com"]; empty -> localhost defaults. */
export function parseAllowedOrigins(value) {
  const origins = trimmed(value)
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return origins.length ? [...new Set(origins)] : [...DEFAULT_ALLOWED_ORIGINS];
}

/** Express "trust proxy": unset/false -> false, "1" -> 1 hop, "true" -> true, anything else as-is. */
export function parseTrustProxy(value) {
  const v = trimmed(value).toLowerCase();
  if (!v || v === 'false' || v === '0') return false;
  if (v === 'true') return true;
  if (/^\d+$/.test(v)) return Number(v);
  return trimmed(value);
}

/** Default 0.7 like the original app; "default" omits it for models that only accept their own default. */
export function parseTemperature(value) {
  const v = trimmed(value).toLowerCase();
  if (!v) return 0.7;
  if (v === 'default' || v === 'none') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 2 ? n : 0.7;
}

/** The value in .env.example is a placeholder, not a key. */
const isPlaceholderKey = (key) => !key || /your[-_ ]?(openai[-_ ]?)?(api[-_ ]?)?key/i.test(key);

export function loadConfig(env = {}) {
  const apiKey = trimmed(env.OPENAI_API_KEY);
  return {
    port: integer(env.PORT, 8080, { max: 65535 }),
    openaiApiKey: isPlaceholderKey(apiKey) ? '' : apiKey,
    textModel: trimmed(env.OPENAI_TEXT_MODEL) || 'gpt-4.1-mini',
    imageModel: trimmed(env.OPENAI_IMAGE_MODEL) || 'gpt-image-1-mini',
    imageQuality: oneOf(env.OPENAI_IMAGE_QUALITY, IMAGE_QUALITIES, 'low'),
    imageFormat: oneOf(env.OPENAI_IMAGE_FORMAT, IMAGE_FORMATS, 'webp'),
    imageSize: '1024x1024',
    temperature: parseTemperature(env.OPENAI_TEMPERATURE),
    allowedOrigins: parseAllowedOrigins(env.ALLOWED_ORIGINS),
    trustProxy: parseTrustProxy(env.TRUST_PROXY),
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      recipes: integer(env.RATE_LIMIT_RECIPES, 20),
      images: integer(env.RATE_LIMIT_IMAGES, 30),
    },
  };
}
