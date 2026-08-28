import { afterEach, describe, expect, it, vi } from 'vitest';

import { getP2PIceServers } from './featureFlags';

afterEach(() => {
	vi.unstubAllEnvs();
});

describe('P2P transport feature configuration', () => {
	it('builds a public STUN server entry from the configured URL', () => {
		vi.stubEnv('VITE_P2P_STUN_URL', '  stun:testnetdev.ragnaroknft.quest:3478  ');

		expect(getP2PIceServers()).toEqual([{ urls: 'stun:testnetdev.ragnaroknft.quest:3478' }]);
	});

	it('does not invent ICE servers when STUN is not configured', () => {
		vi.stubEnv('VITE_P2P_STUN_URL', '   ');

		expect(getP2PIceServers()).toEqual([]);
	});
});
