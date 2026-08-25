import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createLocalDailyQuestLedgerEntry } from '@shared/protocol-core/localDailyQuestSettlement';
import { commitLocalDailyQuestLedger, getRuneLedgerEntries } from './replayDB';

function entry(slot: number, amount = 1) {
	const base = createLocalDailyQuestLedgerEntry({ account: 'daily-idb-user', ymdUtc: '2099-01-01', slot, seasonId: 'daily-idb-season', stage: 'testnet', balanceBefore: slot, timestamp: 1 });
	return amount === base.amount ? base : { ...base, amount, balanceAfter: slot + amount };
}

describe('local daily quest ledger batch', () => {
	it('applies a batch, retries mixed/full, and rejects material conflicts without overwrite', async () => {
		const first = [entry(0), entry(1)];
		const applied = await commitLocalDailyQuestLedger(first);
		expect(applied.appliedIds).toHaveLength(2);
		const mixed = await commitLocalDailyQuestLedger([first[0], entry(2)]);
		expect(mixed.alreadyAppliedIds).toEqual([first[0].entryId]);
		expect(mixed.appliedIds).toEqual([entry(2).entryId]);
		const retry = await commitLocalDailyQuestLedger(first);
		expect(retry.appliedIds).toEqual([]);
		expect(retry.alreadyAppliedIds).toHaveLength(2);
		const conflict = await commitLocalDailyQuestLedger([{ ...first[0], amount: first[0].amount + 9, balanceAfter: first[0].balanceAfter + 9 }]);
		expect(conflict.conflictingIds).toEqual([first[0].entryId]);
		const missingWithConflict = entry(3);
		const atomicConflict = await commitLocalDailyQuestLedger([{ ...first[0], amount: first[0].amount + 8, balanceAfter: first[0].balanceAfter + 8 }, missingWithConflict]);
		expect(atomicConflict.appliedIds).toEqual([]);
		expect((await getRuneLedgerEntries({ seasonId: 'daily-idb-season', account: 'daily-idb-user', direction: 'credit' })).some(item => item.entryId === missingWithConflict.entryId)).toBe(false);
		const ledger = await getRuneLedgerEntries({ seasonId: 'daily-idb-season', account: 'daily-idb-user', direction: 'credit' });
		expect(ledger).toHaveLength(3);
		expect(ledger.reduce((sum, item) => sum + item.amount, 0)).toBe(first[0].amount + first[1].amount + entry(2).amount);
	});
});
