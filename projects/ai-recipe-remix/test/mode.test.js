import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveMode } from '../src/lib/mode.js';

test('dev server with no env talks to the backend through the Vite proxy', () => {
  assert.deepEqual(resolveMode({ DEV: true, PROD: false }), { mode: 'live', apiBaseUrl: '' });
});

test('VITE_API_BASE_URL selects live mode (trailing slashes removed)', () => {
  assert.deepEqual(resolveMode({ PROD: true, VITE_API_BASE_URL: 'https://api.example.com/' }), {
    mode: 'live',
    apiBaseUrl: 'https://api.example.com',
  });
  assert.equal(resolveMode({ DEV: true, VITE_API_BASE_URL: 'http://localhost:9000' }).apiBaseUrl, 'http://localhost:9000');
});

test('a production build without an API URL is a demo', () => {
  assert.deepEqual(resolveMode({ PROD: true }), { mode: 'demo', apiBaseUrl: '' });
  assert.deepEqual(resolveMode({ PROD: true, VITE_API_BASE_URL: '   ' }), { mode: 'demo', apiBaseUrl: '' });
});

test('VITE_DEMO=1 always means demo, even with an API URL or in dev', () => {
  for (const flag of ['1', 'true', 'TRUE', 'yes']) {
    assert.equal(resolveMode({ PROD: true, VITE_DEMO: flag, VITE_API_BASE_URL: 'https://api.example.com' }).mode, 'demo');
    assert.equal(resolveMode({ DEV: true, VITE_DEMO: flag }).mode, 'demo');
  }
});

test('VITE_DEMO=0 forces live mode on the same origin in a production build', () => {
  assert.deepEqual(resolveMode({ PROD: true, VITE_DEMO: '0' }), { mode: 'live', apiBaseUrl: '' });
});
