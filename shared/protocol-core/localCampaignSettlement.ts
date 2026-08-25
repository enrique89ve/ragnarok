import type { ProtocolRuntimeFingerprint } from '../protocolPhase';
import { projectInstanceXpGain, type InstanceXpProjection } from './xpEconomy';
import type { RuneLedgerEntry } from './runeEconomy';
import { canonicalStringify } from './hash';

export const LOCAL_CAMPAIGN_SETTLEMENT_KIND = 'local_campaign_settlement_v1' as const;
export type LocalCampaignDifficulty = 'normal' | 'heroic' | 'mythic';
export type LocalCampaignCardInput = { readonly uid: string; readonly ownerAccount: string; readonly cardId: number; readonly rarity: string; readonly xpBefore: number };
export type LocalCampaignCardXpProjection = LocalCampaignCardInput & InstanceXpProjection & { readonly updateId: string; readonly levelUpId?: string };
export type LocalCampaignSettlementInput = {
	readonly runtimeFingerprint: ProtocolRuntimeFingerprint; readonly account: string; readonly campaignId: string;
	readonly missionId: string; readonly difficulty: LocalCampaignDifficulty; readonly matchId: string; readonly matchSeed: string;
	readonly turnCount: number; readonly firstClear: boolean; readonly runeAmount: number; readonly seasonId: string;
	readonly cards?: readonly LocalCampaignCardInput[]; readonly matchXpShown?: number; readonly timestamp: number;
};
export type LocalCampaignSettlementEnvelope = {
	readonly kind: typeof LOCAL_CAMPAIGN_SETTLEMENT_KIND; readonly scope: 'local-replay'; readonly phaseId: 'local-gameplay-v1';
	readonly runtimeFingerprint: string; readonly resetEpoch: string; readonly eventId: string; readonly account: string;
	readonly campaignId: string; readonly missionId: string; readonly difficulty: LocalCampaignDifficulty; readonly matchId: string; readonly matchSeed: string; readonly turnCount: number;
	readonly firstClear: boolean; readonly runeAmount: number; readonly seasonId: string; readonly matchXpShown: number; readonly timestamp: number;
	readonly resultHash: string; readonly cardXp: readonly LocalCampaignCardXpProjection[]; readonly runeEntry?: RuneLedgerEntry;
	readonly anchor: { readonly anchorId: string; readonly matchId: string; readonly fingerprint: string };
	readonly result: { readonly resultId: string; readonly matchId: string; readonly matchSeed: string; readonly resultHash: string; readonly winner: string };
};
export function createLocalCampaignSettlement(input: LocalCampaignSettlementInput): LocalCampaignSettlementEnvelope {
	if (input.runtimeFingerprint.phaseId !== 'local-gameplay-v1') throw new Error('local campaign settlement requires local-gameplay-v1');
	const eventId = `${LOCAL_CAMPAIGN_SETTLEMENT_KIND}:${input.runtimeFingerprint.resetEpoch}:${input.account}:${input.missionId}:${input.matchId}`;
	const cardXp = (input.cards ?? []).map(card => {
		const projection = projectInstanceXpGain({ rarity: card.rarity, authority: 'local-testnet', xpBefore: card.xpBefore });
		return { ...card, ...projection, updateId: `${eventId}:card:${card.uid}`, ...(projection.didLevelUp ? { levelUpId: `${eventId}:level-up:${card.uid}` } : {}) };
	});
	const result = { matchId: input.matchId, matchSeed: input.matchSeed, turnCount: input.turnCount, account: input.account, campaignId: input.campaignId, missionId: input.missionId, difficulty: input.difficulty };
	const resultHash = canonicalStringify(result);
	return { kind: LOCAL_CAMPAIGN_SETTLEMENT_KIND, scope: 'local-replay', phaseId: 'local-gameplay-v1', runtimeFingerprint: input.runtimeFingerprint.representation, resetEpoch: input.runtimeFingerprint.resetEpoch, eventId, account: input.account, campaignId: input.campaignId, missionId: input.missionId, difficulty: input.difficulty, matchId: input.matchId, matchSeed: input.matchSeed, turnCount: input.turnCount, firstClear: input.firstClear, runeAmount: Math.max(0, input.runeAmount), seasonId: input.seasonId, matchXpShown: Math.max(0, input.matchXpShown ?? 0), timestamp: input.timestamp, resultHash, cardXp, anchor: { anchorId: `${eventId}:anchor`, matchId: input.matchId, fingerprint: input.runtimeFingerprint.representation }, result: { resultId: `${eventId}:result`, matchId: input.matchId, matchSeed: input.matchSeed, resultHash, winner: input.account } };
}
