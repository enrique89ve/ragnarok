/**
 * One backdrop owner per match scene. Coordinator shell stays neutral during
 * VS / poker; chess mission realm lives only on the chess phase surface.
 */

export type MatchSceneId =
	| 'chess'
	| 'vs'
	| 'poker-combat'
	| 'intro'
	| 'game-over'
	| 'neutral';

export function resolveMatchSceneId(flowTag: string | null | undefined): MatchSceneId {
	switch (flowTag) {
		case 'chess':
			return 'chess';
		case 'vs_screen':
			return 'vs';
		case 'poker_combat':
			return 'poker-combat';
		case 'game_over':
			return 'game-over';
		case 'cinematic':
		case 'mission_intro':
		case 'chess_intro':
			return 'intro';
		default:
			return 'neutral';
	}
}

export function buildChessPhaseSceneShellClass(input: {
	readonly chessRealmClass: string;
	readonly finaleClass: string;
	readonly chessRootMotionClass: string;
}): string {
	return [
		'chess-phase-scene',
		input.chessRealmClass,
		input.finaleClass,
		input.chessRootMotionClass,
	]
		.filter(Boolean)
		.join(' ');
}