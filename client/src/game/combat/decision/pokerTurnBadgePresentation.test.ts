import { describe, expect, it } from 'vitest';
import { getPokerTurnBadgePresentation } from './pokerTurnBadgePresentation';

describe('getPokerTurnBadgePresentation', () => {
	it('returns a green active badge model for the local player turn', () => {
		expect(getPokerTurnBadgePresentation('player')).toMatchObject({
			turn: 'player',
			tone: 'active',
			className: 'persistent-turn-badge player-turn',
			kicker: 'Your',
			main: 'Turn',
		});
	});

	it('returns a grey waiting badge model for the opponent turn', () => {
		expect(getPokerTurnBadgePresentation('opponent')).toMatchObject({
			turn: 'opponent',
			tone: 'waiting',
			className: 'persistent-turn-badge opponent-turn',
			kicker: 'Enemy',
			main: 'Turn',
		});
	});

	it('returns null when no poker turn should be shown', () => {
		expect(getPokerTurnBadgePresentation(undefined)).toBeNull();
	});
});
