import { describe, expect, it } from 'vitest';
import { createProtocolRuntimeFingerprint } from '../protocolPhase';
import { createLocalCampaignSettlement } from './localCampaignSettlement';

const fingerprint = createProtocolRuntimeFingerprint({ stage: 'testnet', phaseId: 'local-gameplay-v1', protocolId: 'campaign-test', resetEpoch: 'campaign-local-1', seasonStart: '2026-01-01T00:00:00Z', indexStartBlock: 1 });

const baseInput = {
	runtimeFingerprint: fingerprint,
	account: 'alice',
	campaignId: 'ragnarok',
	missionId: 'norse-1',
	difficulty: 'normal' as const,
	matchId: 'm1',
	matchSeed: 's1',
	turnCount: 4,
	seasonId: 'S-local',
	timestamp: 1,
};

describe('local campaign settlement contract', () => {
	it('defaults to empty Card XP on the Alfa campaign path', () => {
		const record = createLocalCampaignSettlement({
			...baseInput,
			firstClear: true,
			runeAmount: 2,
		});
		expect(record.cardXp).toEqual([]);
		expect(record.matchXpShown).toBe(0);
		expect(record.runeAmount).toBe(2);
		expect(JSON.stringify(record)).not.toContain('elo');
	});

	it('is deterministic on resultHash and eventId', () => {
		const record = createLocalCampaignSettlement({ ...baseInput, firstClear: true, runeAmount: 2 });
		const same = createLocalCampaignSettlement({ ...baseInput, firstClear: false, runeAmount: 0, timestamp: 9 });
		const changed = createLocalCampaignSettlement({ ...baseInput, matchSeed: 's2', firstClear: true, runeAmount: 2 });
		expect(same.resultHash).toBe(record.resultHash);
		expect(changed.resultHash).not.toBe(record.resultHash);
		expect(record.eventId).toContain('campaign-local-1');
	});

	it('still projects Card XP when legacy cards input is provided', () => {
		const record = createLocalCampaignSettlement({
			...baseInput,
			firstClear: true,
			runeAmount: 2,
			cards: [{ uid: 'starter:100', ownerAccount: 'alice', cardId: 100, rarity: 'common', xpBefore: 40 }],
		});
		expect(record.cardXp[0]).toMatchObject({ xpBefore: 40, xpAfter: 50, didLevelUp: true, ownerAccount: 'alice' });
	});

	it('rejects non-local fingerprint', () => {
		expect(() => createLocalCampaignSettlement({
			...baseInput,
			runtimeFingerprint: { ...fingerprint, phaseId: 'mainnet-v1' },
			firstClear: false,
			runeAmount: 0,
		})).toThrow('local-gameplay-v1');
	});
});