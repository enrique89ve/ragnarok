import type { GameState } from '../types';
import type { MatchContext } from '../match/types';
import {
	createLocalSettlement,
	applyLocalSettlement,
	type LocalSettlementApplyResult,
	type LocalSettlementEnvelope,
	type LocalSettlementStore,
} from '@shared/protocol-core/localSettlement';
import { canonicalStringify, sha256Hash } from '@shared/protocol-core/hash';
import { deriveRuneSeasonId } from '@shared/protocol-core/runeSeasonHash';
import { projectBattleEndRewards } from '../match/battleEndRewards';
import type { RagnarokRuntimeConfig, RagnarokRuntimeEvidence } from '@shared/runtimeConfig';
import type { EloRating, LocalCardProgressionRecord } from '@/data/blockchain/replayDB';
import { collectLocalWinnerCards } from '../match/localCardProjection';
import { commitHiveProgressAccountId } from '../auth/progressAccount';

type LocalTokenBalance = { readonly RUNE: number };

export type LocalP2PSettlementDependencies = {
	readonly runtimeConfig: RagnarokRuntimeConfig;
	readonly runtimeEvidence: RagnarokRuntimeEvidence;
	readonly getLocalAccount: () => string | null;
	readonly getEloRating: (account: string) => Promise<EloRating>;
	readonly getTokenBalance: (account: string, seasonId: string) => Promise<LocalTokenBalance>;
	readonly getLatestCardProgressionByOwner: (account: string) => Promise<LocalCardProgressionRecord[]>;
	readonly getTranscriptRoot: () => Promise<string | undefined>;
	readonly clearTranscript: () => void;
	readonly settlementStore: LocalSettlementStore;
	readonly now: () => number;
};

export type LocalP2PSettlementCause = 'engine' | 'technical_abandonment';

export type LocalP2PSettlementResult =
	| { readonly status: 'skipped'; readonly reason: 'not_local_phase' | 'not_peer' | 'not_terminal' | 'missing_account' | 'missing_opponent_account' | 'draw' | 'technical_abandonment' }
	| { readonly status: LocalSettlementApplyResult['status']; readonly envelope: LocalSettlementEnvelope };

export function resolveLocalP2PSettlementCause(input: {
	readonly eventReason: string;
	readonly lifecycleKind?: string | null;
}): LocalP2PSettlementCause {
	if (input.eventReason === 'technical' || input.lifecycleKind === 'technical_abandonment') {
		return 'technical_abandonment';
	}
	return 'engine';
}

function accountForOpponent(ctx: MatchContext): string | null {
	if (ctx.opponent.kind !== 'peer') throw new Error('local P2P settlement requires peer opponent');
	return ctx.opponent.opponentUsername;
}

export async function settleLocalP2PGameOver(
	ctx: MatchContext | null,
	gameState: GameState | null,
	deps: LocalP2PSettlementDependencies,
	cause: LocalP2PSettlementCause = 'engine',
): Promise<LocalP2PSettlementResult> {
	if (cause === 'technical_abandonment') return { status: 'skipped', reason: 'technical_abandonment' };
	if (!deps.runtimeEvidence.phasePolicy.localSettlement) return { status: 'skipped', reason: 'not_local_phase' };
	if (!ctx || ctx.opponent.kind !== 'peer') return { status: 'skipped', reason: 'not_peer' };
	if (!gameState || gameState.gamePhase !== 'game_over') return { status: 'skipped', reason: 'not_terminal' };
	if (!gameState.winner || gameState.winner === 'draw') return { status: 'skipped', reason: 'draw' };
	const localAccount = commitHiveProgressAccountId(deps.getLocalAccount(), deps.runtimeConfig.stage);
	if (!localAccount) return { status: 'skipped', reason: 'missing_account' };

	const opponentAccount = commitHiveProgressAccountId(accountForOpponent(ctx), deps.runtimeConfig.stage);
	if (!opponentAccount) return { status: 'skipped', reason: 'missing_opponent_account' };
	const localWon = gameState.winner === 'player';
	const winnerAccount = localWon ? localAccount : opponentAccount;
	const loserAccount = localWon ? opponentAccount : localAccount;
	const seasonId = deriveRuneSeasonId(deps.runtimeConfig);
	const [winnerElo, loserElo, winnerBalance, loserBalance, transcriptRoot] = await Promise.all([
		deps.getEloRating(winnerAccount),
		deps.getEloRating(loserAccount),
		deps.getTokenBalance(winnerAccount, seasonId),
		deps.getTokenBalance(loserAccount, seasonId),
		deps.getTranscriptRoot(),
	]);
	const winnerReward = projectBattleEndRewards({ reward: ctx.reward, result: 'victory', runtimeStage: deps.runtimeConfig.stage });
	const loserReward = projectBattleEndRewards({ reward: ctx.reward, result: 'defeat', runtimeStage: deps.runtimeConfig.stage });
	const resultHash = await sha256Hash(canonicalStringify({
		matchId: ctx.matchId,
		matchSeed: ctx.matchSeed,
		winner: winnerAccount,
		loser: loserAccount,
		terminalTurn: gameState.turnNumber,
		transcriptRoot: transcriptRoot ?? '',
	}));
	const localCards = localWon
		? collectLocalWinnerCards(gameState, localAccount, await deps.getLatestCardProgressionByOwner(localAccount))
		: [];
	const envelope = createLocalSettlement({
		runtimeFingerprint: {
			stage: deps.runtimeEvidence.runtimeFingerprint.stage,
			phaseId: deps.runtimeEvidence.runtimeFingerprint.phaseId,
			protocolId: deps.runtimeEvidence.runtimeFingerprint.protocolId,
			resetEpoch: deps.runtimeEvidence.runtimeFingerprint.resetEpoch,
			seasonStart: deps.runtimeEvidence.runtimeFingerprint.seasonStart,
			indexStartBlock: deps.runtimeEvidence.runtimeFingerprint.indexStartBlock,
			representation: deps.runtimeEvidence.runtimeFingerprint.representation,
		},
		matchId: ctx.matchId,
		timestamp: deps.now(),
		seed: ctx.matchSeed,
		resultHash,
		winnerAccount,
		loserAccount,
		winnerEloBefore: winnerElo.elo,
		loserEloBefore: loserElo.elo,
		winnerWinsBefore: winnerElo.wins,
		winnerLossesBefore: winnerElo.losses,
		loserWinsBefore: loserElo.wins,
		loserLossesBefore: loserElo.losses,
		seasonId,
		winnerRuneAmount: winnerReward.rune,
		loserRuneAmount: loserReward.rune,
		winnerRuneBalanceBefore: winnerBalance.RUNE,
		loserRuneBalanceBefore: loserBalance.RUNE,
		winnerCards: localCards,
		totalRounds: gameState.turnNumber,
		transcriptRoot,
	});
	const result = await applyLocalSettlement(envelope, deps.settlementStore, deps.runtimeEvidence.runtimeFingerprint.representation);
	deps.clearTranscript();
	return result.status === 'rejected'
		? { ...result, envelope }
		: { status: result.status, envelope };
}
