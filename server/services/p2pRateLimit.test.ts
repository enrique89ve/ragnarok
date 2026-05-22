import { describe, expect, it } from 'vitest';
import { consumeWindowRateLimit, type RateLimitBucket } from './p2pRateLimit';

describe('p2pRateLimit', () => {
	it('allows only the configured count inside the window', () => {
		const bucket: RateLimitBucket = new Map();

		expect(consumeWindowRateLimit({ bucket, key: 'alice:ip', limit: 2, windowMs: 180_000, now: 1_000 })).toEqual({ allowed: true });
		expect(consumeWindowRateLimit({ bucket, key: 'alice:ip', limit: 2, windowMs: 180_000, now: 2_000 })).toEqual({ allowed: true });
		expect(consumeWindowRateLimit({ bucket, key: 'alice:ip', limit: 2, windowMs: 180_000, now: 3_000 })).toEqual({
			allowed: false,
			retryAfterMs: 178_000,
		});
	});

	it('expires old hits and accepts the next request', () => {
		const bucket: RateLimitBucket = new Map();

		expect(consumeWindowRateLimit({ bucket, key: 'alice:ip', limit: 1, windowMs: 180_000, now: 1_000 })).toEqual({ allowed: true });
		expect(consumeWindowRateLimit({ bucket, key: 'alice:ip', limit: 1, windowMs: 180_000, now: 181_001 })).toEqual({ allowed: true });
	});
});
