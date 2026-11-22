import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import type { CardAsset, ForgeCommitRecord } from '@shared/protocol-core/types';
import {
	commitForgeMutation,
	getCard,
	getEitrLedgerTotal,
	getForgeCommit,
	getSupplyCounter,
	putEitrLedgerEntry,
	putSupplyCounter,
	resetReplayDatabaseForTests,
} from './replayDB';
import { clientStateAdapter } from './clientStateAdapter';

const account = 'alice';
const seasonId = 'forge-test';
const balanceFilter = { account, seasonId };

function open(trxId: string) {
	const commit: ForgeCommitRecord = {
		trxId, account, rarity: 'common', saltCommit: 'salt', commitBlock: 10,
		revealed: false, debitAmount: 40, seasonId,
	};
	return {
		kind: 'open' as const,
		commit,
		movement: {
			...balanceFilter, entryId: trxId, direction: 'debit' as const, sourceType: 'forge_commit' as const,
			amount: 40, sourceKey: trxId, trxId, blockNum: 10, timestamp: 100,
		},
	};
}

async function fund() {
	await putEitrLedgerEntry({
		...balanceFilter, entryId: 'credit', direction: 'credit', sourceType: 'burn', amount: 40,
		sourceKey: 'credit', balanceBefore: 0, balanceAfter: 40, trxId: 'burn', blockNum: 9, timestamp: 90,
	});
}

const card: CardAsset = {
	uid: 'forge:first', owner: account, rarity: 'common', cardId: 20001, level: 1, xp: 0,
	mintTrxId: 'first', edition: 'alpha', mintSource: 'forge', mintBlockNum: 11, lastTransferBlock: 11,
};

describe('atomic IndexedDB Forge', () => {
	afterEach(resetReplayDatabaseForTests);

	it('debits enough for one concurrent opening and persists only its commitment', async () => {
		await fund();
		const first = open('first');
		const second = open('second');
		const results = await Promise.all([
			clientStateAdapter.applyForgeMutation!(first),
			clientStateAdapter.applyForgeMutation!(second),
		]);
		expect(results).toEqual([{ status: 'applied' }, { status: 'rejected', reason: 'insufficient Eitr' }]);
		expect(await getEitrLedgerTotal({ ...balanceFilter, direction: 'debit' })).toBe(40);
		expect(await getForgeCommit('first')).toEqual(first.commit);
		expect(await getForgeCommit('second')).toBeUndefined();
	});

	it('rolls back an interrupted mint and accepts only one competing outcome after retry', async () => {
		await fund();
		const first = open('first');
		await clientStateAdapter.applyForgeMutation!(first);
		await putSupplyCounter({ rarity: 'pack:common', cap: 2, minted: 0 });
		const mint = {
			kind: 'mint', commit: { ...first.commit, revealed: true }, card,
			supply: [
				{ pool: 'pack', key: 'common', cap: 2, minted: 1 },
				{ pool: 'pack', key: 'card:20001', cap: 2000, minted: 1 },
			],
		} as const;
		await expect(commitForgeMutation(mint, () => { throw new Error('interrupted'); })).rejects.toThrow('interrupted');
		expect(await getCard(card.uid)).toBeUndefined();
		expect(await getSupplyCounter('pack:common')).toMatchObject({ minted: 0 });
		expect(await getForgeCommit('first')).toMatchObject({ revealed: false });

		const results = await Promise.all([
			clientStateAdapter.applyForgeMutation!(mint),
			clientStateAdapter.applyForgeMutation!({
				kind: 'refund',
				commit: mint.commit,
				movement: { ...first.movement, entryId: 'refund', sourceType: 'forge_refund', direction: 'credit' },
			}),
		]);
		expect(results).toEqual([{ status: 'applied' }, { status: 'ignored' }]);
		expect(await getCard(card.uid)).toMatchObject({ ownerId: account, cardId: 20001 });
		expect(await getSupplyCounter('pack:common')).toMatchObject({ minted: 1 });
		expect(await getEitrLedgerTotal({ ...balanceFilter, sourceType: 'forge_refund' })).toBe(0);
	});
});
