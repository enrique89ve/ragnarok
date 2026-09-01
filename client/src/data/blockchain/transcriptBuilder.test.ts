import { describe, expect, it, vi } from 'vitest';

import { buildRagnarokRuntimeEvidence, resolveRagnarokRuntimeConfig } from '@shared/runtimeConfig';
import {
	exportSessionLog,
	recordSessionEvent,
	startNewTranscript,
	TranscriptBuilder,
} from './transcriptBuilder';
import { canonicalStringify, sha256Hash } from './hashUtils';

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

	it('derives the same Merkle root from canonical order despite arrival time and append order', async () => {
		const first = new TranscriptBuilder();
		first.addMove({
			moveNumber: 91,
			canonicalOrder: 1,
			action: 'poker_action',
			payload: { action: 'attack', turnId: 'turn-1', decisionId: 'decision-1' },
			playerId: 'peer-a',
			timestamp: 1_000,
		});
		first.addMove({
			moveNumber: 92,
			canonicalOrder: 2,
			action: 'endTurn',
			payload: { type: 'endTurn', commandId: 'command-2', seq: 7 },
			playerId: 'peer-b',
			timestamp: 2_000,
		});

		const second = new TranscriptBuilder();
		// The receiving peer may append the second frame first while its UI clock
		// and socket latency differ; canonicalOrder is the only ordering input.
		second.addMove({
			moveNumber: 4,
			canonicalOrder: 2,
			action: 'endTurn',
			payload: { type: 'endTurn', commandId: 'command-2', seq: 7 },
			playerId: 'peer-b',
			timestamp: 99_000,
		});
		second.addMove({
			moveNumber: 3,
			canonicalOrder: 1,
			action: 'poker_action',
			payload: { action: 'attack', turnId: 'turn-1', decisionId: 'decision-1' },
			playerId: 'peer-a',
			timestamp: 88_000,
		});

		expect(await first.buildMerkleTree()).toBe(await second.buildMerkleTree());
		expect(second.getBuiltRecords()?.map(move => move.canonicalOrder)).toEqual([1, 2]);
	});

	it('fails closed for mixed or non-contiguous canonical ordering', async () => {
		const mixed = new TranscriptBuilder();
		mixed.addMove({
			moveNumber: 0,
			canonicalOrder: 1,
			action: 'attack',
			payload: {},
			playerId: 'peer-a',
			timestamp: 1,
		});
		mixed.addMove({
			moveNumber: 1,
			action: 'endTurn',
			payload: {},
			playerId: 'peer-b',
			timestamp: 2,
		});
		await expect(mixed.buildMerkleTree()).rejects.toThrow('mixed canonical and legacy move ordering');

		const gap = new TranscriptBuilder();
		gap.addMove({
			moveNumber: 0,
			canonicalOrder: 2,
			action: 'attack',
			payload: {},
			playerId: 'peer-a',
			timestamp: 1,
		});
		await expect(gap.buildMerkleTree()).rejects.toThrow('canonical action order is not contiguous');
	});

	it('preserves the insertion-order proof format for non-P2P transcripts', async () => {
		const move = {
			moveNumber: 4,
			action: 'single_player_action',
			payload: { value: 1 },
			playerId: 'local',
			timestamp: 1234,
		};
		const transcript = new TranscriptBuilder();
		transcript.addMove(move);

		expect(await transcript.buildMerkleTree()).toBe(
			await sha256Hash(canonicalStringify({ ...move, previousHash: '' })),
		);
	});
});
