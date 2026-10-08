import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  DEFAULT_ALLOWED_ORIGINS,
  loadConfig,
  parseAllowedOrigins,
  parseTemperature,
  parseTrustProxy,
} from '../src/config.js';

describe('loadConfig', () => {
  test('uses the documented defaults', () => {
    const config = loadConfig({});
    assert.equal(config.port, 8080);
    assert.equal(config.openaiApiKey, '');
    assert.equal(config.textModel, 'gpt-4.1-mini');
    assert.equal(config.imageModel, 'gpt-image-1-mini');
    assert.equal(config.imageQuality, 'low');
    assert.equal(config.imageFormat, 'webp');
    assert.equal(config.imageSize, '1024x1024');
    assert.equal(config.temperature, 0.7);
    assert.deepEqual(config.allowedOrigins, [...DEFAULT_ALLOWED_ORIGINS]);
    assert.equal(config.trustProxy, false);
    assert.deepEqual(config.rateLimit, { windowMs: 15 * 60 * 1000, recipes: 20, images: 30 });
  });

  test('reads overrides from the environment', () => {
    const config = loadConfig({
      PORT: '3000',
      OPENAI_API_KEY: ' sk-test-123 ',
      OPENAI_TEXT_MODEL: 'gpt-4.1',
      OPENAI_IMAGE_MODEL: 'gpt-image-1',
      OPENAI_IMAGE_QUALITY: 'MEDIUM',
      OPENAI_IMAGE_FORMAT: 'png',
      RATE_LIMIT_RECIPES: '5',
      RATE_LIMIT_IMAGES: '9',
    });
    assert.equal(config.port, 3000);
    assert.equal(config.openaiApiKey, 'sk-test-123');
    assert.equal(config.textModel, 'gpt-4.1');
    assert.equal(config.imageModel, 'gpt-image-1');
    assert.equal(config.imageQuality, 'medium');
    assert.equal(config.imageFormat, 'png');
    assert.equal(config.rateLimit.recipes, 5);
    assert.equal(config.rateLimit.images, 9);
  });

  test('falls back on invalid values', () => {
    const config = loadConfig({ PORT: 'abc', OPENAI_IMAGE_QUALITY: 'ultra', OPENAI_IMAGE_FORMAT: 'gif', RATE_LIMIT_RECIPES: '0' });
    assert.equal(config.port, 8080);
    assert.equal(config.imageQuality, 'low');
    assert.equal(config.imageFormat, 'webp');
    assert.equal(config.rateLimit.recipes, 20);
  });

  test('treats the .env.example placeholder as "no key"', () => {
    assert.equal(loadConfig({ OPENAI_API_KEY: 'sk-your-key-here' }).openaiApiKey, '');
    assert.equal(loadConfig({ OPENAI_API_KEY: 'your_openai_api_key' }).openaiApiKey, '');
  });
});

describe('parseAllowedOrigins', () => {
  test('splits, trims and drops trailing slashes and duplicates', () => {
    assert.deepEqual(parseAllowedOrigins(' https://a.example/, https://b.example ,https://a.example'), [
      'https://a.example',
      'https://b.example',
    ]);
  });

  test('defaults to local dev origins only', () => {
    for (const value of [undefined, '', '  ', ',']) {
      const origins = parseAllowedOrigins(value);
      assert.deepEqual(origins, [...DEFAULT_ALLOWED_ORIGINS]);
      assert.ok(origins.every((origin) => /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)));
    }
  });
});

describe('parseTrustProxy', () => {
  test('maps common values', () => {
    assert.equal(parseTrustProxy(undefined), false);
    assert.equal(parseTrustProxy('false'), false);
    assert.equal(parseTrustProxy('0'), false);
    assert.equal(parseTrustProxy('1'), 1);
    assert.equal(parseTrustProxy('true'), true);
    assert.equal(parseTrustProxy('loopback'), 'loopback');
  });
});

describe('parseTemperature', () => {
  test('defaults to 0.7, accepts 0-2, and "default" omits it', () => {
    assert.equal(parseTemperature(undefined), 0.7);
    assert.equal(parseTemperature('0.2'), 0.2);
    assert.equal(parseTemperature('default'), undefined);
    assert.equal(parseTemperature('7'), 0.7);
  });
});
