import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRuntimeConfig } from '../src/config/runtime-config.js';

test('parses a bounded API configuration', () => {
  const config = parseRuntimeConfig({
    NODE_ENV: 'production',
    API_PORT: '4100',
    DATABASE_URL: 'postgresql://cloudprint:password@localhost:5432/cloudprint',
    CORS_ORIGINS: 'https://app.cloudprint.cm, https://shop.cloudprint.cm',
  });
  assert.equal(config.port, 4100);
  assert.equal(config.isProduction, true);
  assert.deepEqual(config.corsOrigins, ['https://app.cloudprint.cm', 'https://shop.cloudprint.cm']);
});

test('rejects invalid database protocols and ports', () => {
  assert.throws(() => parseRuntimeConfig({ DATABASE_URL: 'https://example.com', API_PORT: '3000' }));
  assert.throws(() => parseRuntimeConfig({ DATABASE_URL: 'postgresql://localhost/cloudprint', API_PORT: '0' }));
});
