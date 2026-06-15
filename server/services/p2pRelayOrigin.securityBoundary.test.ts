import { describe, expect, it } from 'vitest';

import { isP2PRelayOriginAllowed } from './p2pRelayOrigin';

describe('p2pRelayOrigin security boundary', () => {
	it('fails closed for browser websocket upgrades without Origin in production', () => {
		expect(isP2PRelayOriginAllowed({
			host: 'game.example',
			production: true,
		})).toBe(false);
	});

	it('allows exact same-host browser origins without a separate allowlist', () => {
		expect(isP2PRelayOriginAllowed({
			origin: 'https://game.example',
			host: 'game.example',
			production: true,
		})).toBe(true);
	});

	it('requires an explicit allowlist for cross-host browser origins', () => {
		expect(isP2PRelayOriginAllowed({
			origin: 'https://app.example',
			host: 'api.example',
			production: true,
		})).toBe(false);

		expect(isP2PRelayOriginAllowed({
			origin: 'https://app.example',
			host: 'api.example',
			allowedOrigins: 'https://app.example',
			production: true,
		})).toBe(true);
	});

	it('does not treat wildcard allowlists as valid browser origins', () => {
		expect(isP2PRelayOriginAllowed({
			origin: 'https://attacker.example',
			host: 'api.example',
			allowedOrigins: '*',
			production: true,
		})).toBe(false);
	});

	it('does not trust X-Forwarded-Host unless explicitly enabled', () => {
		expect(isP2PRelayOriginAllowed({
			origin: 'https://public.example',
			host: 'internal.example',
			forwardedHost: 'public.example',
			production: true,
			trustForwardedHost: false,
		})).toBe(false);

		expect(isP2PRelayOriginAllowed({
			origin: 'https://public.example',
			host: 'internal.example',
			forwardedHost: 'public.example',
			production: true,
			trustForwardedHost: true,
		})).toBe(true);
	});
});
