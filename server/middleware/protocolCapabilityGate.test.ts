import express from 'express';
import { describe, expect, it } from 'vitest';
import { requireProtocolCapability } from './protocolCapabilityGate';

describe('protocol capability middleware', () => {
	it('rejects marketplace before the route can read state in local phase', async () => {
		const app = express();
		app.get('/marketplace/listings', requireProtocolCapability('marketplace'), (_req, res) => {
			res.status(200).json({ shouldNotReadState: true });
		});
		const server = app.listen(0);
		try {
			const address = server.address();
			if (!address || typeof address === 'string') throw new Error('expected TCP address');
			const response = await fetch(`http://127.0.0.1:${address.port}/marketplace/listings`);
			expect(response.status).toBe(409);
			expect(await response.json()).toMatchObject({ code: 'capability_disabled', capability: 'marketplace', phaseId: 'local-gameplay-v1' });
		} finally {
			await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
		}
	});
});
