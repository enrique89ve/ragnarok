import {
	computeChessIntegrityRoot,
	parseHash256,
	type Hash256,
} from '@shared/p2p-wire/integrity';
import { isSafeRoomOrMatchId } from '@shared/p2pAvailability';

import { computeChessPrevStateHash } from '../engine/chessHash';
import { computeCardsPrevStateHash } from '../engine/wireHash';
import { useGameStore } from '../stores/gameStore';
import { useUnifiedCombatStore } from '../stores/unifiedCombatStore';

export type ChessIntegrityCheckpoint = Readonly<{
	chessHash: Hash256;
	cardsHash: Hash256;
	root: Hash256;
}>;

export function buildChessIntegrityCheckpoint(input: Readonly<{
	matchId: string;
	chessHash: unknown;
	cardsHash: unknown;
}>): ChessIntegrityCheckpoint | null {
	if (!isSafeRoomOrMatchId(input.matchId)) return null;
	const chessHash = parseHash256(input.chessHash);
	const cardsHash = parseHash256(input.cardsHash);
	if (chessHash === null || cardsHash === null) return null;
	return {
		chessHash,
		cardsHash,
		root: computeChessIntegrityRoot({
			matchId: input.matchId,
			chessHash,
			cardsHash,
		}),
	};
}

export function captureChessIntegrityCheckpoint(input: Readonly<{
	matchId: string;
	isCardsAuthority: boolean;
}>): ChessIntegrityCheckpoint | null {
	const boardState = useUnifiedCombatStore.getState().boardState ?? null;
	const chessHash = computeChessPrevStateHash(boardState);
	const cardsHash = computeCardsPrevStateHash(
		useGameStore.getState().gameState,
		input.isCardsAuthority,
	);
	return buildChessIntegrityCheckpoint({
		matchId: input.matchId,
		chessHash,
		cardsHash,
	});
}
