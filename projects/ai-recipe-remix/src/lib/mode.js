const YES = new Set(['1', 'true', 'yes', 'on']);
const NO = new Set(['0', 'false', 'no', 'off']);

/**
 * Decide at build time whether the app talks to the real backend ("live") or
 * replays pre-generated samples ("demo"). Pass `import.meta.env`.
 *
 *   VITE_DEMO=1                      -> demo   (always wins, used by build:portfolio)
 *   VITE_API_BASE_URL=https://...    -> live, calling that server
 *   production build, no API URL     -> demo   (static hosting has no backend)
 *   VITE_DEMO=0, no API URL          -> live, same-origin /api (backend behind the same host)
 *   dev server, no env               -> live, /api goes through the Vite proxy to :8080
 */
export function resolveMode(env = {}) {
  const demoFlag = String(env.VITE_DEMO ?? '').trim().toLowerCase();
  const apiBaseUrl = String(env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');

  if (YES.has(demoFlag)) return { mode: 'demo', apiBaseUrl: '' };
  if (apiBaseUrl) return { mode: 'live', apiBaseUrl };
  if (env.PROD && !NO.has(demoFlag)) return { mode: 'demo', apiBaseUrl: '' };
  return { mode: 'live', apiBaseUrl: '' };
}
