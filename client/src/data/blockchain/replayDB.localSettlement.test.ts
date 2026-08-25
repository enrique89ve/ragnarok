import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createProtocolRuntimeFingerprint } from '@shared/protocolPhase';
import { createLocalSettlement, applyLocalSettlement, LOCAL_SETTLEMENT_PHASE_ID } from '@shared/protocol-core/localSettlement';
import { commitLocalSettlement, getLatestLocalCardProgressionByOwner } from './replayDB';

describe('IndexedDB local settlement commit', () => {
	it('is atomic/idempotent and rejects same-event conflicts', async () => {
		const fingerprint = createProtocolRuntimeFingerprint({
			stage: 'testnet', phaseId: LOCAL_SETTLEMENT_PHASE_ID, protocolId: 'idb-test',
			resetEpoch: 'idb-settlement-test', seasonStart: '2026-01-01T00:00:00Z', indexStartBlock: 1,
		});
		const envelope = createLocalSettlement({
			runtimeFingerprint: fingerprint, matchId: 'idb-settlement-a', timestamp: 1,
			seed: 'seed', resultHash: 'hash-a', winnerAccount: 'idb-a', loserAccount: 'idb-b',
			winnerEloBefore: 1000, loserEloBefore: 1000, seasonId: 'idb', winnerRuneAmount: 1,
			winnerCards: [{ uid: 'idb-card', ownerAccount: 'idb-a', cardId: 100, rarity: 'common', xpBefore: 0 }],
		});
		expect(await applyLocalSettlement(envelope, { commit: commitLocalSettlement }, fingerprint.representation)).toMatchObject({ status: 'applied' });
		expect(await applyLocalSettlement(envelope, { commit: commitLocalSettlement }, fingerprint.representation)).toMatchObject({ status: 'already_applied' });
		const second = createLocalSettlement({
			runtimeFingerprint: fingerprint, matchId: 'idb-settlement-b', timestamp: 2,
			seed: 'seed', resultHash: 'hash-c', winnerAccount: 'idb-a', loserAccount: 'idb-b',
			winnerEloBefore: 1000, loserEloBefore: 1000, seasonId: 'idb', winnerRuneAmount: 1,
			winnerCards: [{ uid: 'idb-card', ownerAccount: 'idb-a', cardId: 100, rarity: 'common', xpBefore: 10 }],
		});
		expect(await applyLocalSettlement(second, { commit: commitLocalSettlement }, fingerprint.representation)).toMatchObject({ status: 'applied' });
		expect(await getLatestLocalCardProgressionByOwner('idb-a')).toEqual([
			expect.objectContaining({ uid: 'idb-card', xp: 20, timestamp: 2 }),
		]);
		const conflict = { ...envelope, result: { ...envelope.result, resultHash: 'hash-b' } };
		expect(await applyLocalSettlement(conflict, { commit: commitLocalSettlement }, fingerprint.representation)).toMatchObject({ status: 'rejected', code: 'settlement_conflict' });
	});
});
