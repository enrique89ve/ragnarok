import type { ArmySelection } from '../types/ChessTypes';
import { cardRegistry } from '../data/cardRegistry';
import { getNFTBridge } from '../nft';
import { useHeroDeckStore } from '../stores/heroDeckStore';
import {
	buildWarbandLoadout,
	type WarbandLoadoutResult,
} from './heroDeckRules';

export function buildReadyWarbandLoadout(
	army: ArmySelection,
): WarbandLoadoutResult {
	const nftBridge = getNFTBridge();
	return buildWarbandLoadout(
		army,
		useHeroDeckStore.getState().decks,
		{
			getCardById: (cardId) => cardRegistry.find(card => Number(card.id) === cardId),
			getOwnedCopies: (cardId) => nftBridge.getOwnedCopies(cardId),
			enforceOwnership: nftBridge.isHiveMode(),
		},
	);
}
