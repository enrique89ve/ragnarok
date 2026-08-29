import express from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import router from './p2pTransportConfig';

const envKeys = [
	'P2P_WEBRTC_ENABLED',
	'P2P_WS_FALLBACK_ENABLED',
	'P2P_WEBRTC_NORMAL_MS',
	'P2P_WEBRTC_AGGRESSIVE_MS',
	'P2P_RELAY_CONNECT_MS',
	'P2P_ICE_SERVERS',
] as const;
const originalEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));

let server: Server | undefined;

async function listen(app: ReturnType<typeof express>): Promise<string> {
	server = createServer(app);
	await new Promise<void>((resolve, reject) => {
		server?.once('error', reject);
		server?.listen(0, '127.0.0.1', () => resolve());
	});
	const listeningServer = server;
	if (!listeningServer) throw new Error('Server was not created');
	const address = listeningServer.address();
	if (!address || typeof address === 'string') throw new Error('Expected TCP address');
	return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

afterEach(async () => {
	for (const key of envKeys) {
		const value = originalEnv[key];
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
	if (server?.listening) await new Promise<void>(resolve => server?.close(() => resolve()));
	server = undefined;
});

describe('P2P transport config route', () => {
	beforeEach(() => {
		process.env.P2P_WEBRTC_ENABLED = 'true';
		process.env.P2P_WS_FALLBACK_ENABLED = 'true';
		process.env.P2P_WEBRTC_NORMAL_MS = '9000';
		process.env.P2P_WEBRTC_AGGRESSIVE_MS = '5000';
		process.env.P2P_RELAY_CONNECT_MS = '8000';
		process.env.P2P_ICE_SERVERS = 'stun:stun.example.test:3478';
	});

	it('serves validated public config with a short cache policy', async () => {
		const app = express();
		app.use('/api/p2p/transport-config', router);
		const baseUrl = await listen(app);

		const response = await fetch(`${baseUrl}/api/p2p/transport-config`);

		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('public, max-age=30');
		expect(await response.json()).toEqual({
			version: 1,
			webrtcEnabled: true,
			relayEnabled: true,
			timeouts: { webrtcNormalMs: 9_000, webrtcAggressiveMs: 5_000, relayConnectMs: 8_000 },
			iceServers: [{ urls: 'stun:stun.example.test:3478' }],
		});
	});
});
