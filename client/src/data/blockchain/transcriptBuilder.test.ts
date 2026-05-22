import { describe, expect, it, vi } from 'vitest';

import { buildRagnarokRuntimeEvidence, resolveRagnarokRuntimeConfig } from '@shared/runtimeConfig';
import {
	exportSessionLog,
	recordSessionEvent,
	startNewTranscript,
} from './transcriptBuilder';

const QA_RUNTIME = buildRagnarokRuntimeEvidence(resolveRagnarokRuntimeConfig({
	VITE_NETWORK_STAGE: 'testnet',
	VITE_RAGNAROK_RESET_EPOCH: 'qa-s0-session-log',
	RAGNAROK_PROTOCOL_ID: 'rk_game_testnet',
}));

describe('transcriptBuilder session log evidence', () => {
	it('exports P2P logs with runtime reset evidence and session events', async () => {
		vi.spyOn(Date, 'now')
			.mockReturnValueOnce(1_765_100_000_000)
			.mockReturnValueOnce(1_765_100_000_100);

		startNewTranscript();
		recordSessionEvent('p2p_reload_guard_prompted', {
			reason: 'active_match_reload',
		});

		const blob = exportSessionLog({
			matchId: 'match-p2p-1',
			buildHash: 'build-1',
			runtime: QA_RUNTIME,
			connectionState: 'connected',
			isHost: true,
		});
		const payload = JSON.parse(await blob.text());

		expect(payload).toMatchObject({
			matchId: 'match-p2p-1',
			buildHash: 'build-1',
			connectionState: 'connected',
			isHost: true,
			exportedAt: 1_765_100_000_100,
			runtime: {
				stage: 'testnet',
				protocolId: 'rk_game_testnet',
				collectionId: 'ragnarok-testnet',
				resetEpoch: 'qa-s0-session-log',
				qaFullCatalogEnabled: true,
			},
			events: [
				{
					timestamp: 1_765_100_000_000,
					kind: 'p2p_reload_guard_prompted',
					payload: {
						reason: 'active_match_reload',
					},
				},
			],
		});

		vi.restoreAllMocks();
	});
});
