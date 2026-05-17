import type { ChessGameStatus } from '../../types/ChessTypes';

export type ChessTurnProcessMode = 'p2p' | 'local_ai';
export type ChessTurnActor = 'local_human' | 'remote_peer' | 'remote_ai' | 'none';

export interface ChessTurnPolicy {
	readonly processMode: ChessTurnProcessMode;
	readonly actor: ChessTurnActor;
	readonly shouldScheduleAiTurn: boolean;
}

export function getChessTurnProcessMode(isP2PMatch: boolean): ChessTurnProcessMode {
	return isP2PMatch ? 'p2p' : 'local_ai';
}

export function deriveChessTurnPolicy(input: {
	readonly enabled: boolean;
	readonly currentTurn: 'player' | 'opponent';
	readonly gameStatus: ChessGameStatus;
	readonly isP2PMatch: boolean;
}): ChessTurnPolicy {
	const processMode = getChessTurnProcessMode(input.isP2PMatch);
	const actor = getChessTurnActor({
		enabled: input.enabled,
		currentTurn: input.currentTurn,
		gameStatus: input.gameStatus,
		processMode,
	});

	return {
		processMode,
		actor,
		shouldScheduleAiTurn: actor === 'remote_ai',
	};
}

function getChessTurnActor(input: {
	readonly enabled: boolean;
	readonly currentTurn: 'player' | 'opponent';
	readonly gameStatus: ChessGameStatus;
	readonly processMode: ChessTurnProcessMode;
}): ChessTurnActor {
	if (!input.enabled || input.gameStatus !== 'playing') return 'none';
	if (input.currentTurn === 'player') return 'local_human';
	return input.processMode === 'p2p' ? 'remote_peer' : 'remote_ai';
}
