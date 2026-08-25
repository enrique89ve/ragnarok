import { describe, expect, it } from 'vitest';
import { createProtocolRuntimeFingerprint } from '../protocolPhase';
import { createLocalCampaignSettlement } from './localCampaignSettlement';

const fingerprint = createProtocolRuntimeFingerprint({ stage: 'testnet', phaseId: 'local-gameplay-v1', protocolId: 'campaign-test', resetEpoch: 'campaign-local-1', seasonStart: '2026-01-01T00:00:00Z', indexStartBlock: 1 });

describe('local campaign settlement contract', () => {
	it('is deterministic and projects canonical Card XP/level-ups without ELO', () => {
		const record = createLocalCampaignSettlement({ runtimeFingerprint: fingerprint, account: 'alice', campaignId: 'ragnarok', missionId: 'norse-1', difficulty: 'normal', matchId: 'm1', matchSeed: 's1', turnCount: 4, firstClear: true, runeAmount: 2, seasonId: 'S-local', timestamp: 1, cards: [{ uid: 'starter:100', ownerAccount: 'alice', cardId: 100, rarity: 'common', xpBefore: 40 }] });
		const same = createLocalCampaignSettlement({ runtimeFingerprint: fingerprint, account: 'alice', campaignId: 'ragnarok', missionId: 'norse-1', difficulty: 'normal', matchId: 'm1', matchSeed: 's1', turnCount: 4, firstClear: false, runeAmount: 0, seasonId: 'S-local', timestamp: 9 });
		const changed = createLocalCampaignSettlement({ runtimeFingerprint: fingerprint, account: 'alice', campaignId: 'ragnarok', missionId: 'norse-1', difficulty: 'normal', matchId: 'm1', matchSeed: 's2', turnCount: 4, firstClear: true, runeAmount: 2, seasonId: 'S-local', timestamp: 1 });
		expect(same.resultHash).toBe(record.resultHash);
		expect(changed.resultHash).not.toBe(record.resultHash);
		expect(record.eventId).toContain('campaign-local-1');
		expect(record.runeAmount).toBe(2);
		expect(record.cardXp[0]).toMatchObject({ xpBefore: 40, xpAfter: 50, didLevelUp: true, ownerAccount: 'alice' });
		expect(JSON.stringify(record)).not.toContain('elo');
	});

	it('rejects non-local fingerprint', () => {
		expect(() => createLocalCampaignSettlement({ runtimeFingerprint: { ...fingerprint, phaseId: 'mainnet-v1' }, account: 'alice', campaignId: 'ragnarok', missionId: 'norse-1', difficulty: 'normal', matchId: 'm1', matchSeed: 's1', turnCount: 1, firstClear: false, runeAmount: 0, seasonId: 'S-local', timestamp: 1 })).toThrow('local-gameplay-v1');
	});
});
