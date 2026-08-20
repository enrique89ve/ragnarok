export const SHOWDOWN_PRESENTATION_BUDGET_MS = 8000;
export const SHOWDOWN_BACKUP_MS = 9000;
export const HERO_DEATH_PRESENTATION_BUDGET_MS = 4000;

export type PokerCombatWinner = 'player' | 'opponent' | 'draw';

export type PokerResolutionOutcome =
	| { readonly kind: 'next-hand' }
	| {
		readonly kind: 'combat-over';
		readonly winner: PokerCombatWinner;
		readonly isPlayerDead: boolean;
	};

export type PokerResolutionHealth = {
	readonly winner: PokerCombatWinner;
	readonly playerFinalHealth: number;
	readonly opponentFinalHealth: number;
};

export function planPokerResolutionOutcome(
	result: PokerResolutionHealth,
): PokerResolutionOutcome {
	const playerDead = result.playerFinalHealth <= 0;
	const opponentDead = result.opponentFinalHealth <= 0;
	if (!playerDead && !opponentDead) {
		return { kind: 'next-hand' };
	}
	if (playerDead && opponentDead) {
		return {
			kind: 'combat-over',
			winner: result.winner,
			isPlayerDead: true,
		};
	}
	return {
		kind: 'combat-over',
		winner: playerDead ? 'opponent' : 'player',
		isPlayerDead: playerDead,
	};
}

export function createOnceRunner(run: () => void): () => boolean {
	let done = false;
	return () => {
		if (done) return false;
		done = true;
		run();
		return true;
	};
}
