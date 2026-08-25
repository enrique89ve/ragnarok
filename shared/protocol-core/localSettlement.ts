import {
	calculateSeasonScore,
	createRuneLedgerEntryId,
} from './runeEconomy';
import { projectEloMatch } from './eloEconomy';
import type { RuneLedgerEntry } from './runeEconomy';
import { projectInstanceXpGain } from './xpEconomy';
import type { ProtocolRuntimeFingerprint } from '../protocolPhase';

export const LOCAL_SETTLEMENT_KIND = 'local_match_settlement_v1' as const;
export const LOCAL_SETTLEMENT_SCOPE = 'local-replay' as const;
export const LOCAL_SETTLEMENT_PHASE_ID = 'local-gameplay-v1' as const;

export type LocalSettlementRejectionCode = 'fingerprint_mismatch' | 'invalid_scope' | 'settlement_conflict';

export type LocalSettlementCardInput = {
	readonly uid: string;
	readonly ownerAccount: string;
	readonly cardId: number;
	readonly rarity: string;
	readonly xpBefore: number;
	readonly isMvp?: boolean;
};

export type LocalSettlementInput = {
	readonly runtimeFingerprint: ProtocolRuntimeFingerprint;
	readonly matchId: string;
	readonly timestamp: number;
	readonly seed: string;
	readonly resultHash: string;
	readonly winnerAccount: string;
	readonly loserAccount: string;
	readonly winnerEloBefore: number;
	readonly loserEloBefore: number;
	readonly winnerWinsBefore?: number;
	readonly winnerLossesBefore?: number;
	readonly loserWinsBefore?: number;
	readonly loserLossesBefore?: number;
	readonly winnerCampaignRuneEarned?: number;
	readonly loserCampaignRuneEarned?: number;
	readonly winnerDailyQuestRuneEarned?: number;
	readonly loserDailyQuestRuneEarned?: number;
	readonly seasonId: string;
	readonly winnerRuneAmount: number;
	readonly loserRuneAmount?: number;
	readonly winnerRuneBalanceBefore?: number;
	readonly loserRuneBalanceBefore?: number;
	readonly winnerCards?: readonly LocalSettlementCardInput[];
	readonly totalRounds?: number;
	readonly transcriptRoot?: string;
};

export type LocalSettlementAnchor = {
	readonly anchorId: string;
	readonly matchId: string;
	readonly playerA: string;
	readonly playerB: string;
	readonly matchHash: string;
};

export type LocalSettlementResult = {
	readonly resultId: string;
	readonly matchId: string;
	readonly winnerAccount: string;
	readonly loserAccount: string;
	readonly seed: string;
	readonly resultHash: string;
	readonly totalRounds: number;
	readonly transcriptRoot?: string;
};

export type LocalSettlementEloProjection = {
	readonly updateId: string;
	readonly account: string;
	readonly eloBefore: number;
	readonly eloAfter: number;
	readonly winsBefore: number;
	readonly winsAfter: number;
	readonly lossesBefore: number;
	readonly lossesAfter: number;
	readonly seasonScoreAfter: number;
};

export type LocalSettlementCardXpProjection = {
	readonly updateId: string;
	readonly uid: string;
	readonly ownerAccount: string;
	readonly cardId: number;
	readonly xpBefore: number;
	readonly xpGained: number;
	readonly xpAfter: number;
	readonly levelBefore: number;
	readonly levelAfter: number;
	readonly didLevelUp: boolean;
	readonly levelUpId?: string;
};

export type LocalSettlementLevelUpProjection = {
	readonly levelUpId: string;
	readonly uid: string;
	readonly ownerAccount: string;
	readonly cardId: number;
	readonly newLevel: number;
};

export type LocalSettlementEnvelope = {
	readonly kind: typeof LOCAL_SETTLEMENT_KIND;
	readonly scope: typeof LOCAL_SETTLEMENT_SCOPE;
	readonly phaseId: typeof LOCAL_SETTLEMENT_PHASE_ID;
	readonly runtimeFingerprint: string;
	readonly resetEpoch: string;
	readonly eventId: string;
	readonly matchId: string;
	readonly participants: readonly [string, string];
	readonly timestamp: number;
	readonly anchor: LocalSettlementAnchor;
	readonly result: LocalSettlementResult;
	readonly runeEntries: readonly RuneLedgerEntry[];
	readonly elo: readonly [LocalSettlementEloProjection, LocalSettlementEloProjection];
	readonly cardXp: readonly LocalSettlementCardXpProjection[];
	readonly levelUps: readonly LocalSettlementLevelUpProjection[];
};

export type LocalSettlementRecord = LocalSettlementEnvelope;

export type LocalSettlementStore = {
	readonly commit: (record: LocalSettlementRecord) => Promise<LocalSettlementCommitResult>;
};

export type LocalSettlementCommitResult =
	| 'applied'
	| 'already_applied'
	| {
			readonly status: 'conflict';
			readonly existingResultHash: string;
			readonly existingRuntimeFingerprint: string;
		};

export type LocalSettlementApplyResult =
	| { readonly status: 'applied'; readonly eventId: string }
	| { readonly status: 'already_applied'; readonly eventId: string }
	| { readonly status: 'rejected'; readonly eventId: string; readonly code: LocalSettlementRejectionCode };

export function createLocalSettlementEventId(input: {
	readonly phaseId: typeof LOCAL_SETTLEMENT_PHASE_ID;
	readonly resetEpoch: string;
	readonly matchId: string;
}): string {
	return `${LOCAL_SETTLEMENT_KIND}:${input.phaseId}:${input.resetEpoch}:${input.matchId}`;
}

function createEloProjection(input: {
	readonly eventId: string;
	readonly account: string;
	readonly eloBefore: number;
	readonly opponentElo: number;
	readonly winsBefore: number;
	readonly lossesBefore: number;
	readonly isWinner: boolean;
	readonly p2pRuneEarned: number;
	readonly campaignRuneEarned: number;
	readonly dailyQuestRuneEarned: number;
}): LocalSettlementEloProjection {
	const eloMatch = input.isWinner
		? projectEloMatch({ winnerElo: input.eloBefore, loserElo: input.opponentElo })
		: projectEloMatch({ winnerElo: input.opponentElo, loserElo: input.eloBefore });
	const eloAfter = input.isWinner ? eloMatch.winner.after : eloMatch.loser.after;
	const winsAfter = input.winsBefore + (input.isWinner ? 1 : 0);
	const lossesAfter = input.lossesBefore + (input.isWinner ? 0 : 1);
	return {
		updateId: `${input.eventId}:elo:${input.account}`,
		account: input.account,
		eloBefore: input.eloBefore,
		eloAfter,
		winsBefore: input.winsBefore,
		winsAfter,
		lossesBefore: input.lossesBefore,
		lossesAfter,
		seasonScoreAfter: calculateSeasonScore({
			finalElo: eloAfter,
			campaignRuneEarned: input.campaignRuneEarned,
			p2pRuneEarned: input.p2pRuneEarned,
			dailyQuestRuneEarned: input.dailyQuestRuneEarned,
		}),
	};
}

function createCardXpProjection(eventId: string, card: LocalSettlementCardInput): LocalSettlementCardXpProjection {
	const projection = projectInstanceXpGain({
		rarity: card.rarity,
		authority: 'local-testnet',
		xpBefore: card.xpBefore,
		isMvp: card.isMvp,
	});
	return {
		updateId: `${eventId}:card-xp:${card.uid}`,
		uid: card.uid,
		ownerAccount: card.ownerAccount,
		cardId: card.cardId,
		xpBefore: projection.xpBefore,
		xpGained: projection.xpGained,
		xpAfter: projection.xpAfter,
		levelBefore: projection.levelBefore,
		levelAfter: projection.levelAfter,
		didLevelUp: projection.didLevelUp,
		...(projection.didLevelUp ? { levelUpId: `${eventId}:level-up:${card.uid}` } : {}),
	};
}

export function createLocalSettlement(input: LocalSettlementInput): LocalSettlementEnvelope {
	if (input.runtimeFingerprint.phaseId !== LOCAL_SETTLEMENT_PHASE_ID) {
		throw new Error(`local settlement requires ${LOCAL_SETTLEMENT_PHASE_ID} runtime`);
	}
	const eventId = createLocalSettlementEventId({
		phaseId: LOCAL_SETTLEMENT_PHASE_ID,
		resetEpoch: input.runtimeFingerprint.resetEpoch,
		matchId: input.matchId,
	});
	const winnerRune = Math.max(0, input.winnerRuneAmount);
	const loserRune = Math.max(0, input.loserRuneAmount ?? 0);
	const runeEntries: RuneLedgerEntry[] = [];
	for (const [account, amount, role, balanceBefore] of [
		[input.winnerAccount, winnerRune, 'winner', Math.max(0, input.winnerRuneBalanceBefore ?? 0)],
		[input.loserAccount, loserRune, 'loser', Math.max(0, input.loserRuneBalanceBefore ?? 0)],
	] as const) {
		if (amount <= 0) continue;
		const sourceKey = `${eventId}:rune:${role}:${account}`;
		const entryId = createRuneLedgerEntryId({
			seasonId: input.seasonId,
			direction: 'credit',
			sourceType: 'p2p_ranked',
			sourceKey,
		});
		runeEntries.push({
			entryId,
			seasonId: input.seasonId,
			account,
			direction: 'credit',
			sourceType: 'p2p_ranked',
			sourceKey,
			amount,
			balanceBefore,
			balanceAfter: balanceBefore + amount,
			trxId: eventId,
			blockNum: 0,
			timestamp: input.timestamp,
		});
	}
	const winnerElo = createEloProjection({
		eventId, account: input.winnerAccount, eloBefore: input.winnerEloBefore,
		opponentElo: input.loserEloBefore, winsBefore: input.winnerWinsBefore ?? 0,
		lossesBefore: input.winnerLossesBefore ?? 0, isWinner: true,
		p2pRuneEarned: winnerRune, campaignRuneEarned: input.winnerCampaignRuneEarned ?? 0,
		dailyQuestRuneEarned: input.winnerDailyQuestRuneEarned ?? 0,
	});
	const loserElo = createEloProjection({
		eventId, account: input.loserAccount, eloBefore: input.loserEloBefore,
		opponentElo: input.winnerEloBefore, winsBefore: input.loserWinsBefore ?? 0,
		lossesBefore: input.loserLossesBefore ?? 0, isWinner: false,
		p2pRuneEarned: loserRune, campaignRuneEarned: input.loserCampaignRuneEarned ?? 0,
		dailyQuestRuneEarned: input.loserDailyQuestRuneEarned ?? 0,
	});
	const cardXp = (input.winnerCards ?? []).map(card => createCardXpProjection(eventId, card));
	const levelUps = cardXp
		.filter((projection): projection is LocalSettlementCardXpProjection & { readonly levelUpId: string } => projection.didLevelUp && projection.levelUpId !== undefined)
		.map(projection => ({
			levelUpId: projection.levelUpId,
			uid: projection.uid,
			ownerAccount: projection.ownerAccount,
			cardId: projection.cardId,
			newLevel: projection.levelAfter,
		}));
	return {
		kind: LOCAL_SETTLEMENT_KIND,
		scope: LOCAL_SETTLEMENT_SCOPE,
		phaseId: LOCAL_SETTLEMENT_PHASE_ID,
		runtimeFingerprint: input.runtimeFingerprint.representation,
		resetEpoch: input.runtimeFingerprint.resetEpoch,
		eventId,
		matchId: input.matchId,
		timestamp: input.timestamp,
		participants: [input.winnerAccount, input.loserAccount],
		anchor: {
			anchorId: `${eventId}:anchor`, matchId: input.matchId,
			playerA: input.winnerAccount, playerB: input.loserAccount, matchHash: input.resultHash,
		},
		result: {
			resultId: `${eventId}:result`, matchId: input.matchId,
			winnerAccount: input.winnerAccount, loserAccount: input.loserAccount,
			seed: input.seed, resultHash: input.resultHash,
			totalRounds: input.totalRounds ?? 0, ...(input.transcriptRoot ? { transcriptRoot: input.transcriptRoot } : {}),
		},
		runeEntries,
		elo: [winnerElo, loserElo],
		cardXp,
		levelUps,
	};
}

export async function applyLocalSettlement(
	envelope: LocalSettlementEnvelope,
	store: LocalSettlementStore,
	expectedRuntimeFingerprint: string,
): Promise<LocalSettlementApplyResult> {
	if (envelope.scope !== LOCAL_SETTLEMENT_SCOPE || envelope.phaseId !== LOCAL_SETTLEMENT_PHASE_ID) {
		return { status: 'rejected', eventId: envelope.eventId, code: 'invalid_scope' };
	}
	if (envelope.runtimeFingerprint !== expectedRuntimeFingerprint) {
		return { status: 'rejected', eventId: envelope.eventId, code: 'fingerprint_mismatch' };
	}
	const commitResult = await store.commit(envelope);
	if (commitResult === 'applied' || commitResult === 'already_applied') {
		return { status: commitResult, eventId: envelope.eventId };
	}
	return { status: 'rejected', eventId: envelope.eventId, code: 'settlement_conflict' };
}
