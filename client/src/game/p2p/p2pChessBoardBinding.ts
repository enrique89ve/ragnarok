import type { CanonicalChessSide } from '@shared/p2p-wire/chess';

import { useUnifiedCombatStore } from '../stores/unifiedCombatStore';
import type { P2PBoardBinding } from '../stores/combat/types';
import type { ArmySelection } from '../types/ChessTypes';
import { createSeededIdGen } from '../utils/seededRng';
import { createP2PViewerPerspective, mapViewerValuesToCanonical } from './p2pPerspective';

export function isP2PBoardBoundTo(
	binding: P2PBoardBinding | null,
	matchId: string,
	matchSeed: string,
): boolean {
	return binding !== null
		&& binding.matchId === matchId
		&& binding.matchSeed === matchSeed;
}

export function ensureCanonicalP2PChessBoard(input: Readonly<{
	readonly matchId: string;
	readonly matchSeed: string;
	readonly myCanonicalSide: CanonicalChessSide;
	readonly localArmy: ArmySelection;
	readonly remoteArmy: ArmySelection;
}>): 'reused' | 'initialized' {
	const store = useUnifiedCombatStore.getState();
	if (
		isP2PBoardBoundTo(store.p2pBoardBinding, input.matchId, input.matchSeed)
		&& store.boardState.pieces.length > 0
	) {
		return 'reused';
	}
	rebuildCanonicalP2PChessBoard(input);
	return 'initialized';
}

function rebuildCanonicalP2PChessBoard(input: Readonly<{
	readonly matchId: string;
	readonly matchSeed: string;
	readonly myCanonicalSide: CanonicalChessSide;
	readonly localArmy: ArmySelection;
	readonly remoteArmy: ArmySelection;
}>): void {
	const store = useUnifiedCombatStore.getState();
	store.reset();
	store.initChessWithSeed(input.matchSeed);
	const canonicalArmies = mapViewerValuesToCanonical({
		perspective: createP2PViewerPerspective(input.myCanonicalSide),
		localValue: input.localArmy,
		remoteValue: input.remoteArmy,
	});
	store.initializeBoard(
		canonicalArmies.player,
		canonicalArmies.opponent,
		createSeededIdGen(input.matchSeed, 'chess-pieces'),
	);
	store.bindP2PBoard({
		matchId: input.matchId,
		matchSeed: input.matchSeed,
	});
}
