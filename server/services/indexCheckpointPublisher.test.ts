import { describe, expect, it } from 'vitest';
import type { RagnarokRuntimeConfig } from '../../shared/runtimeConfig';
import {
	buildIndexCheckpointPayload,
	computeProjectionStateHash,
	getIndexCheckpointCustomJsonId,
	isIndexCheckpointDryRun,
	shouldPublishIndexCheckpoint,
} from './indexCheckpointPublisher';

const runtime: RagnarokRuntimeConfig = {
	stage: 'testnet',
	executionMode: 'testnet',
	protocolId: 'rk_game_testnet',
	collectionId: 'ragnarok-testnet',
	adminAccount: 'ragnarok-admin',
	adminOperatorAccount: 'ragnarok-operator',
	genesisAccount: 'ragnarok-genesis',
	treasuryAccount: 'ragnarok-treasury',
	indexAccount: 'ragnarok-index',
	indexerUrl: '',
	artIndexerUrl: '',
	nftLoxProtocolId: 'nftlox_testnet',
	nftArtBaseUrl: 'https://example.com',
	externalUrlBase: 'https://example.com',
	resettable: true,
	economic: false,
	acceptsLegacyProtocolIds: false,
	seasonStart: '2026-05-19T00:00:00Z',
};

const stats = {
	lastIrreversibleBlockProcessed: 106536940,
	irreversibleBlock: 106536960,
	syncTargetBlock: 106536940,
	inSync: true,
	totalPlayers: 2,
	totalCards: 3,
	totalMatches: 1,
	knownAccounts: 2,
};

describe('indexCheckpointPublisher', () => {
	it('builds deterministic projection hashes independent of object key order', () => {
		const leftState = {
			tokenBalances: [
				['bob', { account: 'bob', RUNE: 2 }],
				['alice', { account: 'alice', RUNE: 1 }],
			],
			genesis: { sealed: true, version: '1', sealBlock: 10 },
		};
		const rightState = {
			genesis: { sealBlock: 10, version: '1', sealed: true },
			tokenBalances: [
				['alice', { RUNE: 1, account: 'alice' }],
				['bob', { RUNE: 2, account: 'bob' }],
			],
		};

		expect(computeProjectionStateHash({
			runtime,
			state: leftState,
			block: stats.lastIrreversibleBlockProcessed,
		})).toBe(computeProjectionStateHash({
			runtime,
			state: rightState,
			block: stats.lastIrreversibleBlockProcessed,
		}));
	});

	it('creates a compact checkpoint payload for Hive custom_json', () => {
		const payload = buildIndexCheckpointPayload({
			runtime,
			state: { cards: [['card-1', { owner: 'alice' }]] },
			stats,
			now: 1779250000000,
		});

		expect(payload).toMatchObject({
			action: 'index_checkpoint',
			version: 1,
			stage: 'testnet',
			indexedBlock: 106536940,
			irreversibleBlock: 106536960,
			syncTargetBlock: 106536940,
			hashAlgorithm: 'sha256:canonical-json:v1',
			summary: {
				players: 2,
				cards: 3,
				matches: 1,
				knownAccounts: 2,
			},
			emittedAt: 1779250000000,
		});
		expect('protocolId' in payload).toBe(false);
		expect('indexAccount' in payload).toBe(false);
		expect(payload.stateHash).toMatch(/^[a-f0-9]{64}$/);
		expect(JSON.stringify(payload).length).toBeLessThan(8000);
	});

	it('publishes only once per interval bucket and only after sync', () => {
		expect(shouldPublishIndexCheckpoint({
			stats: { ...stats, inSync: false },
			intervalBlocks: 100,
			lastPublishedBucketValue: 0,
		})).toEqual({ publish: false, reason: 'indexer_not_in_sync' });

		expect(shouldPublishIndexCheckpoint({
			stats,
			intervalBlocks: 100,
			lastPublishedBucketValue: 0,
		})).toEqual({ publish: true, bucket: 106536900 });

		expect(shouldPublishIndexCheckpoint({
			stats,
			intervalBlocks: 100,
			lastPublishedBucketValue: 106536900,
		})).toEqual({ publish: false, reason: 'checkpoint_already_published_for_bucket' });
	});

	it('uses a separate custom_json id so checkpoints are not protocol state ops', () => {
		expect(getIndexCheckpointCustomJsonId(runtime)).toBe('rk_game_testnet_index');
	});

	it('supports dry-run mode for exercising publisher flow without a Hive tx', () => {
		const original = process.env.RAGNAROK_INDEX_CHECKPOINT_DRY_RUN;
		process.env.RAGNAROK_INDEX_CHECKPOINT_DRY_RUN = 'true';
		try {
			expect(isIndexCheckpointDryRun()).toBe(true);
		} finally {
			if (original === undefined) {
				delete process.env.RAGNAROK_INDEX_CHECKPOINT_DRY_RUN;
			} else {
				process.env.RAGNAROK_INDEX_CHECKPOINT_DRY_RUN = original;
			}
		}
	});
});
