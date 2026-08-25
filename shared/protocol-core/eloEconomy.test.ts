import { describe, expect, it } from 'vitest';
import { ELO_FLOOR, projectEloMatch } from './index';

describe('canonical ELO projection', () => {
	it('preserves the existing equal-rating result', () => {
		expect(projectEloMatch({ winnerElo: 1000, loserElo: 1000 })).toEqual({
			winner: { before: 1000, after: 1016, delta: 16 },
			loser: { before: 1000, after: 984, delta: -16 },
		});
	});

	it('uses the canonical floor for the losing projection', () => {
		const projection = projectEloMatch({ winnerElo: ELO_FLOOR, loserElo: ELO_FLOOR });
		expect(projection.loser.after).toBe(ELO_FLOOR);
	});
});
