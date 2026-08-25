import { ELO_FLOOR, ELO_K_FACTOR } from './types';

export type EloMatchProjection = {
	readonly winner: { readonly before: number; readonly after: number; readonly delta: number };
	readonly loser: { readonly before: number; readonly after: number; readonly delta: number };
};

export function projectEloMatch(input: {
	readonly winnerElo: number;
	readonly loserElo: number;
}): EloMatchProjection {
	const expectedWinner = 1 / (1 + Math.pow(10, (input.loserElo - input.winnerElo) / 400));
	const winnerDelta = Math.round(ELO_K_FACTOR * (1 - expectedWinner));
	const loserDelta = Math.round(ELO_K_FACTOR * (0 - (1 - expectedWinner)));
	return {
		winner: {
			before: input.winnerElo,
			after: Math.max(0, input.winnerElo + winnerDelta),
			delta: winnerDelta,
		},
		loser: {
			before: input.loserElo,
			after: Math.max(ELO_FLOOR, input.loserElo + loserDelta),
			delta: loserDelta,
		},
	};
}
