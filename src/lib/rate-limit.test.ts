import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit, RATE_LIMITS } from './rate-limit.ts';

// Regression: buckets used to share one store key per IP, so ordinary API
// traffic exhausted the much smaller login budget for everyone on that IP.
test('api traffic does not consume the auth budget', () => {
  const ip = '203.0.113.7';

  for (let i = 0; i < RATE_LIMITS.api.maxRequests; i++) {
    assert.equal(checkRateLimit(`api:${ip}`, RATE_LIMITS.api).success, true);
  }
  assert.equal(checkRateLimit(`api:${ip}`, RATE_LIMITS.api).success, false);

  // Login from that same IP must still be allowed.
  assert.equal(checkRateLimit(`auth:${ip}`, RATE_LIMITS.auth).success, true);
});

test('auth budget still cuts off after its own limit', () => {
  const key = `auth:198.51.100.4`;

  for (let i = 0; i < RATE_LIMITS.auth.maxRequests; i++) {
    assert.equal(checkRateLimit(key, RATE_LIMITS.auth).success, true);
  }
  assert.equal(checkRateLimit(key, RATE_LIMITS.auth).success, false);
});
