import { describe, expect, it } from 'vitest';
import { createProtocolRuntimeFingerprint } from '../protocolPhase';
import {
	applyLocalSettlement,
	createLocalSettlement,
	createLocalSettlementEventId,
	LOCAL_SETTLEMENT_KIND,
	LOCAL_SETTLEMENT_PHASE_ID,
	LOCAL_SETTLEMENT_SCOPE,
	type LocalSettlementRecord,
	type LocalSettlementStore,
} from './localSettlement';

const fingerprint = createProtocolRuntimeFingerprint({
	stage: 'testnet',
	phaseId: LOCAL_SETTLEMENT_PHASE_ID,
	protocolId: 'rk_game_testnet',
	resetEpoch: 'alfa-testnet-period-2',
	seasonStart: '2026-06-14T23:28:54Z',
	indexStartBlock: 109016418,
});

function createInput() {
	return {
		runtimeFingerprint: fingerprint,
		matchId: 'match-001',
		timestamp: 1_000,
		seed: 'seed-001',
		resultHash: 'result-hash-001',
		winnerAccount: 'alice',
		loserAccount: 'bob',
		winnerEloBefore: 1000,
		loserEloBefore: 1000,
		winnerWinsBefore: 2,
		loserLossesBefore: 1,
		seasonId: 'S01',
		winnerRuneAmount: 2,
		winnerCards: [{ uid: 'card-instance-1', ownerAccount: 'alice', cardId: 7, rarity: 'common', xpBefore: 40 }],
		totalRounds: 12,
	};
}

function createMemoryStore(): LocalSettlementStore & {
	records: Map<string, LocalSettlementRecord>;
	runeEntries: Map<string, unknown>;
	elo: Map<string, unknown>;
	cardXp: Map<string, unknown>;
	levelUps: Map<string, unknown>;
} {
	const records = new Map<string, LocalSettlementRecord>();
	const runeEntries = new Map<string, unknown>();
	const elo = new Map<string, unknown>();
	const cardXp = new Map<string, unknown>();
	const levelUps = new Map<string, unknown>();
	return {
		records,
		runeEntries,
		elo,
		cardXp,
		levelUps,
		commit: async (record) => {
			const existing = records.get(record.eventId);
			if (existing) {
				if (existing.result.resultHash !== record.result.resultHash || existing.runtimeFingerprint !== record.runtimeFingerprint) {
					return {
						status: 'conflict',
						existingResultHash: existing.result.resultHash,
						existingRuntimeFingerprint: existing.runtimeFingerprint,
					};
				}
				return 'already_applied';
			}
			records.set(record.eventId, record);
			for (const entry of record.runeEntries) runeEntries.set(entry.entryId, entry);
			for (const projection of record.elo) elo.set(projection.account, projection);
			for (const projection of record.cardXp) cardXp.set(projection.uid, projection);
			for (const projection of record.levelUps) levelUps.set(projection.levelUpId, projection);
			return 'applied';
		},
	};
}

describe('local settlement protocol', () => {
	it('creates a versioned local envelope with complete absolute projections', () => {
		const envelope = createLocalSettlement(createInput());

		expect(envelope).toMatchObject({
			kind: LOCAL_SETTLEMENT_KIND,
			scope: LOCAL_SETTLEMENT_SCOPE,
			phaseId: LOCAL_SETTLEMENT_PHASE_ID,
			runtimeFingerprint: fingerprint.representation,
			eventId: createLocalSettlementEventId({
				phaseId: LOCAL_SETTLEMENT_PHASE_ID,
				resetEpoch: 'alfa-testnet-period-2',
				matchId: 'match-001',
			}),
		});
		expect(envelope.resetEpoch).toBe(fingerprint.resetEpoch);
		expect(envelope.anchor.anchorId).toContain(':anchor');
		expect(envelope.result.resultId).toContain(':result');
		expect(envelope.runeEntries).toHaveLength(1);
		expect(envelope.runeEntries[0]).toMatchObject({ account: 'alice', amount: 2, trxId: envelope.eventId });
		expect(envelope.elo[0]).toMatchObject({ account: 'alice', winsBefore: 2, winsAfter: 3 });
		expect(envelope.elo[1]).toMatchObject({ account: 'bob', lossesBefore: 1, lossesAfter: 2 });
		expect(envelope.elo[0].seasonScoreAfter).toBeGreaterThan(0);
		expect(envelope.cardXp[0]).toMatchObject({
		uid: 'card-instance-1', ownerAccount: 'alice', xpBefore: 40, xpGained: 10, xpAfter: 50,
		levelBefore: 1, levelAfter: 2, didLevelUp: true,
	});
		expect(envelope.cardXp[0].levelUpId).toContain(':level-up:card-instance-1');
		expect(envelope.levelUps).toEqual([{
			levelUpId: envelope.cardXp[0].levelUpId,
			uid: 'card-instance-1',
			ownerAccount: 'alice',
			cardId: 7,
			newLevel: 2,
		}]);

		const serialized = JSON.stringify(envelope);
		expect(serialized).not.toContain('custom_json');
		expect(serialized).not.toContain('match_result');
		expect(serialized).not.toContain('transactionQueue');
	});

	it('is idempotent and returns applied then already_applied', async () => {
		const store = createMemoryStore();
		const envelope = createLocalSettlement(createInput());

		expect(await applyLocalSettlement(envelope, store, fingerprint.representation)).toEqual({
			status: 'applied', eventId: envelope.eventId,
		});
		expect(await applyLocalSettlement(envelope, store, fingerprint.representation)).toEqual({
			status: 'already_applied', eventId: envelope.eventId,
		});
		expect(store.records.size).toBe(1);
		expect(store.runeEntries.size).toBe(1);
		expect(store.elo.size).toBe(2);
		expect(store.cardXp.size).toBe(1);
		expect(store.levelUps.size).toBe(1);
	});

	it('rejects a runtime fingerprint mismatch before persistence', async () => {
		const store = createMemoryStore();
		const envelope = createLocalSettlement(createInput());
		const result = await applyLocalSettlement(envelope, store, 'different-runtime-fingerprint');

		expect(result).toEqual({ status: 'rejected', eventId: envelope.eventId, code: 'fingerprint_mismatch' });
		expect(store.records.size).toBe(0);
	});

	it('rejects a same-event conflict without changing projections', async () => {
		const store = createMemoryStore();
		const envelope = createLocalSettlement(createInput());
		await applyLocalSettlement(envelope, store, fingerprint.representation);
		const conflicting = {
			...envelope,
			result: { ...envelope.result, resultHash: 'different-result-hash' },
		};

		expect(await applyLocalSettlement(conflicting, store, fingerprint.representation)).toEqual({
			status: 'rejected', eventId: envelope.eventId, code: 'settlement_conflict',
		});
		expect(store.records.size).toBe(1);
		expect(store.runeEntries.size).toBe(1);
	});

	it('refuses to create local settlement from a non-local phase fingerprint', () => {
		const hiveFingerprint = createProtocolRuntimeFingerprint({
			...fingerprint,
			phaseId: 'hive-testnet-v1',
		});
		expect(() => createLocalSettlement({ ...createInput(), runtimeFingerprint: hiveFingerprint })).toThrow(
			/local settlement requires local-gameplay-v1 runtime/,
		);
	});

	it('changes event identity across reset epochs and matches', () => {
		const first = createLocalSettlementEventId({ phaseId: LOCAL_SETTLEMENT_PHASE_ID, resetEpoch: 'epoch-a', matchId: 'match-1' });
		expect(createLocalSettlementEventId({ phaseId: LOCAL_SETTLEMENT_PHASE_ID, resetEpoch: 'epoch-b', matchId: 'match-1' })).not.toBe(first);
		expect(createLocalSettlementEventId({ phaseId: LOCAL_SETTLEMENT_PHASE_ID, resetEpoch: 'epoch-a', matchId: 'match-2' })).not.toBe(first);
	});
});
