import type { ArmySelection } from '../types/ChessTypes';
import { cardRegistry } from '../data/cardRegistry';
import { getNFTBridge } from '../nft';
import { useHeroDeckStore } from '../stores/heroDeckStore';
import {
	buildWarbandLoadout,
	type WarbandLoadoutResult,
} from './heroDeckRules';

const CARD_BY_ID = new Map<number, (typeof cardRegistry)[number]>(
	cardRegistry.map(card => [Number(card.id), card]),
);

export function buildReadyWarbandLoadout(
	army: ArmySelection,
): WarbandLoadoutResult {
	const nftBridge = getNFTBridge();
	return buildWarbandLoadout(
		army,
		useHeroDeckStore.getState().decks,
		{
			getCardById: (cardId) => CARD_BY_ID.get(cardId),
			getOwnedCopies: (cardId) => nftBridge.getOwnedCopies(cardId),
			enforceOwnership: nftBridge.isHiveMode(),
		},
	);
}
