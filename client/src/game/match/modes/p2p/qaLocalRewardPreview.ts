import {
	createRagnarokStorageKey,
	isQaFullCatalogEntitlementEnabled,
	type RagnarokRuntimeConfig,
} from '@shared/runtimeConfig';
import { getRuneEconomy } from '@shared/protocol-core/runeEconomy';
import type { MatchContext, RewardChannel } from '../../types';

export type P2PQaResult = 'victory' | 'defeat' | 'draw';

export interface P2PQaLocalRewardPreview {
	readonly scope: 'qa_local';
	readonly label: string;
	readonly result: P2PQaResult;
	readonly runeShown: number;
	readonly matchXpShown: number;
	readonly cardXpShown: 0;
	readonly cacheKey: string;
	readonly persistence: string;
	readonly settlementNote: string;
}

const QA_LOCAL_MATCH_XP_BASE = 25;

export function calculateP2PQaLocalMatchXp(
	reward: RewardChannel,
	result: P2PQaResult,
): number {
	if (result !== 'victory') return 0;
	if (reward.xpRunes.kind === 'none') return 0;
	return Math.max(0, Math.round(QA_LOCAL_MATCH_XP_BASE * reward.xpRunes.multiplier));
}

export function createP2PQaLocalRewardPreview(input: {
	readonly match: MatchContext | null;
	readonly result: P2PQaResult;
	readonly runtime: RagnarokRuntimeConfig;
	readonly account?: string | null;
}): P2PQaLocalRewardPreview | null {
	const { match, result, runtime } = input;
	if (!match || match.opponent.kind !== 'peer') return null;
	if (!isQaFullCatalogEntitlementEnabled(runtime)) return null;

	const economy = getRuneEconomy(runtime.stage);
	const normalizedAccount = normalizePreviewAccount(input.account);
	const cacheKey = createRagnarokStorageKey(
		runtime,
		`qa-p2p-reward-preview:${normalizedAccount}:${match.matchId}`,
	);

	return {
		scope: 'qa_local',
		label: result === 'victory' ? 'QA local reward preview' : 'QA local result preview',
		result,
		runeShown: result === 'victory' ? economy.p2pWinRune : economy.p2pLossRune,
		matchXpShown: calculateP2PQaLocalMatchXp(match.reward, result),
		cardXpShown: 0,
		cacheKey,
		persistence: 'Local QA preview only; no RUNE ledger, no CardXP, no level_up, no NFTLox mutableData.',
		settlementNote: 'Ranked RUNE still waits for dual-signed match evidence.',
	};
}

function normalizePreviewAccount(account: string | null | undefined): string {
	const trimmed = account?.trim().toLowerCase();
	return trimmed && trimmed.length > 0 ? trimmed : 'guest';
}
