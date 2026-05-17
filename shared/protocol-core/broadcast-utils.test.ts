import { describe, expect, it } from 'vitest';

import { sanitizePayload, sanitizeString } from './broadcast-utils';

describe('broadcast-utils sanitization', () => {
	it('preserves JSON punctuation and HTML-significant characters in wire strings', () => {
		const input = '{"version":3,"name":"A&B <test> \\"quote\\""}';

		expect(sanitizeString(input)).toBe(input);
	});

	it('strips invalid control characters without HTML-encoding the payload', () => {
		const state = '{"starterClaimed":true,"settings":{"sfxVolume":0.7}}\u0000';
		const sanitized = sanitizePayload({ action: 'save_state', state });

		expect(sanitized.state).toBe('{"starterClaimed":true,"settings":{"sfxVolume":0.7}}');
		expect(String(sanitized.state)).not.toContain('&quot;');
	});
});
