import type { GameState } from '../types';
import type { LocalCampaignCardInput } from '@shared/protocol-core/localCampaignSettlement';
import type { LocalCardProgressionRecord } from '@/data/blockchain/replayDB';
import { getStarterUid } from '@/data/schemas/HiveTypes';
import { isStarterEntitlementCardId } from '@shared/schemas/starterEntitlement';

/** Collects only cards whose local instance is authoritative for this account. */
export function collectLocalWinnerCards(gameState: GameState | undefined, ownerAccount: string, progression: readonly LocalCardProgressionRecord[] = []): LocalCampaignCardInput[] {
	if (!gameState) return [];
	const player = gameState.players.player;
	const zones = [player.battlefield, player.graveyard, player.hand];
	const previousByUid = new Map(progression.map(record => [record.uid, record]));
	const seen = new Set<string>();
	const cards: LocalCampaignCardInput[] = [];
	for (const zone of zones) for (const instance of zone ?? []) {
		const cardId = typeof instance.card.id === 'number' ? instance.card.id : Number(instance.card.id);
		const uid = instance.nft_id ?? (Number.isInteger(cardId) && isStarterEntitlementCardId(cardId) ? getStarterUid(cardId) : null);
		if (!uid || seen.has(uid) || !Number.isInteger(cardId)) continue;
		const previous = previousByUid.get(uid);
		if (instance.nft_id && !previous) continue;
		seen.add(uid);
		cards.push({
			uid,
			ownerAccount,
			cardId,
			rarity: instance.card.rarity ?? 'common',
			xpBefore: previous?.xp ?? 0,
		});
	}
	return cards.sort((a, b) => a.uid.localeCompare(b.uid));
}
