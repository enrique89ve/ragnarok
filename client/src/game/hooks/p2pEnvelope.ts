import type { GameState } from '../types';
import type { AttackCommand, EndTurnCommand, PlayCardCommand, UseHeroPowerCommand } from '../core/commands';

export type WireGameCommand = PlayCardCommand | AttackCommand | EndTurnCommand | UseHeroPowerCommand;

export interface GameCommandEnvelope {
	type: 'game_command';
	matchId: string;
	seq: number;
	commandId: string;
	prevStateHash: string;
	command: WireGameCommand;
}

/**
 * Canonical perspective-invariant quickhash.
 * Both peers compute the same string for the same logical state by always
 * ordering host-side data first, regardless of which side is hashing.
 */
export function canonicalQuickHash(state: GameState | null | undefined, isHostPerspective: boolean): string {
	if (!state) return '';
	const hostPlayer = isHostPerspective ? state.players?.player : state.players?.opponent;
	const clientPlayer = isHostPerspective ? state.players?.opponent : state.players?.player;
	const canonicalTurn = isHostPerspective
		? state.currentTurn
		: state.currentTurn === 'player' ? 'opponent' : state.currentTurn === 'opponent' ? 'player' : state.currentTurn;
	return `${state.turnNumber}:${state.gamePhase}:${canonicalTurn}:${hostPlayer?.heroHealth ?? 0}:${clientPlayer?.heroHealth ?? 0}`;
}
