export type PokerTurnBadgeTurn = 'player' | 'opponent';
export type PokerTurnBadgeTone = 'active' | 'waiting';

export interface PokerTurnBadgePresentation {
	readonly turn: PokerTurnBadgeTurn;
	readonly tone: PokerTurnBadgeTone;
	readonly className: string;
	readonly kicker: string;
	readonly main: string;
	readonly ariaLabel: string;
}

export function getPokerTurnBadgePresentation(
	currentTurn: PokerTurnBadgeTurn | undefined
): PokerTurnBadgePresentation | null {
	if (!currentTurn) return null;

	if (currentTurn === 'player') {
		return {
			turn: 'player',
			tone: 'active',
			className: 'persistent-turn-badge player-turn',
			kicker: 'Your',
			main: 'Turn',
			ariaLabel: 'Your turn. Actions are available.',
		};
	}

	return {
		turn: 'opponent',
		tone: 'waiting',
		className: 'persistent-turn-badge opponent-turn',
		kicker: 'Enemy',
		main: 'Turn',
		ariaLabel: 'Enemy turn. Waiting for the opponent.',
	};
}
