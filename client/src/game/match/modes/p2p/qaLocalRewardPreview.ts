import {
	createRagnarokStorageKey,
	isQaFullCatalogEntitlementEnabled,
	type RagnarokRuntimeConfig,
} from '@shared/runtimeConfig';
import { projectBattleEndRewards } from '../../battleEndRewards';
import type { MatchContext, RewardChannel } from '../../types';

export type P2PQaResult = 'victory' | 'defeat' | 'draw';
export type P2PLocalRewardScope = 'qa_local' | 'testnet_local';

export interface P2PQaLocalRewardPreview {
	readonly scope: P2PLocalRewardScope;
	readonly label: string;
	readonly result: P2PQaResult;
	readonly runeShown: number;
	readonly matchXpShown: number;
	readonly cardXpShown: 0;
	readonly cacheKey: string;
	readonly persistence: string;
	readonly settlementNote: string;
}

export function calculateP2PQaLocalMatchXp(
	reward: RewardChannel,
	result: P2PQaResult,
): number {
	return projectBattleEndRewards({ reward, result }).matchXp;
}

export function createP2PQaLocalRewardPreview(input: {
	readonly match: MatchContext | null;
	readonly result: P2PQaResult;
	readonly runtime: RagnarokRuntimeConfig;
	readonly account?: string | null;
}): P2PQaLocalRewardPreview | null {
	const { match, result, runtime } = input;
	if (!match || match.opponent.kind !== 'peer') return null;
	if (runtime.stage !== 'testnet' || !runtime.resettable || runtime.economic) return null;

	const isQaPreview = isQaFullCatalogEntitlementEnabled(runtime);
	const projection = projectBattleEndRewards({
		reward: match.reward,
		result,
		runtimeStage: runtime.stage,
	});
	const normalizedAccount = normalizePreviewAccount(input.account);
	const cacheKey = createRagnarokStorageKey(
		runtime,
		`${isQaPreview ? 'qa' : 'testnet'}-p2p-reward-preview:${normalizedAccount}:${match.matchId}`,
	);

	return {
		scope: isQaPreview ? 'qa_local' : 'testnet_local',
		label: result === 'victory' ? 'Victory rewards' : 'Match result',
		result,
		runeShown: projection.rune,
		matchXpShown: projection.matchXp,
		cardXpShown: 0,
		cacheKey,
		persistence: isQaPreview
			? 'Local QA preview only; no RUNE ledger, no CardXP, no level_up, no NFTLox mutableData.'
			: 'Shown on testnet only. Not written to Hive, CardXP, level_up, or the RUNE ledger.',
		settlementNote: result === 'victory'
			? 'These amounts are the protocol calculation. Ranked Hive persist waits for dual-signed evidence.'
			: 'No Match XP or RUNE is awarded on this result.',
	};
}

function normalizePreviewAccount(account: string | null | undefined): string {
	const trimmed = account?.trim().toLowerCase();
	return trimmed && trimmed.length > 0 ? trimmed : 'guest';
}
