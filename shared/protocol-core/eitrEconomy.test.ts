import { describe, expect, it } from 'vitest';
import {
	EITR_DISSOLVE_VALUES,
	EITR_FORGE_COSTS,
	createEitrLedgerEntryId,
	createBurnEitrSourceKey,
	createForgeCommitEitrSourceKey,
	createForgeRefundEitrSourceKey,
	getEitrDissolveValue,
	getEitrForgeCost,
} from './eitrEconomy';

describe('eitr economy', () => {
	it('matches RULEBOOK Card Rarity dissolve values', () => {
		expect(EITR_DISSOLVE_VALUES).toEqual({
			common: 5,
			rare: 20,
			epic: 100,
			mythic: 400,
		});
	});

	it('matches RULEBOOK Card Rarity forge costs', () => {
		expect(EITR_FORGE_COSTS).toEqual({
			common: 40,
			rare: 100,
			epic: 400,
			mythic: 1600,
		});
	});

	it('normalizes rarity casing when reading dissolve value', () => {
		expect(getEitrDissolveValue('Common')).toBe(5);
		expect(getEitrDissolveValue('MYTHIC')).toBe(400);
	});

	it('returns 0 dissolve value for unknown rarity', () => {
		expect(getEitrDissolveValue('invalid')).toBe(0);
		expect(getEitrDissolveValue('')).toBe(0);
	});

	it('normalizes rarity casing when reading forge cost', () => {
		expect(getEitrForgeCost('Rare')).toBe(100);
		expect(getEitrForgeCost('EPIC')).toBe(400);
	});

	it('returns 0 forge cost for unknown rarity (caller must validate)', () => {
		expect(getEitrForgeCost('invalid')).toBe(0);
	});

	it('forge cost is strictly greater than dissolve value at every rarity', () => {
		for (const rarity of ['common', 'rare', 'epic', 'mythic'] as const) {
			expect(EITR_FORGE_COSTS[rarity]).toBeGreaterThan(EITR_DISSOLVE_VALUES[rarity]);
		}
	});

	it('formats canonical ledger entry id', () => {
		expect(createEitrLedgerEntryId({
			seasonId: 'S01',
			direction: 'credit',
			sourceType: 'burn',
			sourceKey: 'burn:S01:alice:abc:uid-xyz',
		})).toBe('S01:credit:burn:burn:S01:alice:abc:uid-xyz');
	});

	it('formats burn source key with seasonId, account, trxId and uid', () => {
		expect(createBurnEitrSourceKey({
			seasonId: 'S01',
			account: 'alice',
			trxId: 'abc',
			uid: 'uid-xyz',
		})).toBe('burn:S01:alice:abc:uid-xyz');
	});

	it('formats forge_commit source key without uid (mint happens at reveal)', () => {
		expect(createForgeCommitEitrSourceKey({
			seasonId: 'S01',
			account: 'alice',
			trxId: 'def',
		})).toBe('forge_commit:S01:alice:def');
	});

	it('formats forge_refund source key using the reveal trxId', () => {
		expect(createForgeRefundEitrSourceKey({
			seasonId: 'S01',
			account: 'alice',
			revealTrxId: 'ghi',
		})).toBe('forge_refund:S01:alice:ghi');
	});

	it('burn and forge_commit keys differ even for same account and trxId', () => {
		const burn = createBurnEitrSourceKey({
			seasonId: 'S01', account: 'alice', trxId: 'xyz', uid: 'u1',
		});
		const commit = createForgeCommitEitrSourceKey({
			seasonId: 'S01', account: 'alice', trxId: 'xyz',
		});
		expect(burn).not.toBe(commit);
	});
});
