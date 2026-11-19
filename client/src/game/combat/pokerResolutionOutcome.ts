import { CombatPhase, type PokerCombatState, type PokerResolvedHand } from '../types/PokerCombatTypes';

/** Ceiling for rank + domination + ragnarok + last stand, then the verdict badge. */
export const SHOWDOWN_PRESENTATION_BUDGET_MS = 21_000;

export type PokerCombatWinner = 'player' | 'opponent' | 'draw';

export interface HeroDeathPresentation {
	readonly combatId: string;
	readonly heroName: string;
	readonly heroId: string | undefined;
	readonly isPlayer: boolean;
}

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

interface PokerResolutionState {
	readonly combatState: PokerCombatState | null;
	readonly isActive: boolean;
	readonly lastResolvedHand: PokerResolvedHand | null;
}

export function progressResolvedPokerHand(
	hand: PokerResolvedHand,
	{
		readPoker,
		commitRewards,
		startNextHand,
		endCombat,
	}: {
		readonly readPoker: () => PokerResolutionState;
		readonly commitRewards: (onCommitted: () => void) => void;
		readonly startNextHand: () => void;
		readonly endCombat: (winner: PokerCombatWinner, presentation: HeroDeathPresentation) => void;
	},
): void {
	const readResolvedCombat = (): PokerCombatState | null => {
		const { combatState, isActive, lastResolvedHand } = readPoker();
		return isActive
			&& lastResolvedHand === hand
			&& combatState?.phase === CombatPhase.RESOLUTION
			&& combatState.combatId === hand.combatId
			&& combatState.handNumber === hand.handIndex
			? combatState
			: null;
	};

	const combat = readResolvedCombat();
	if (!combat) return;

	const outcome = planPokerResolutionOutcome(hand.resolution);
	if (outcome.kind === 'combat-over') {
		const hero = outcome.isPlayerDead ? combat.player.pet : combat.opponent.pet;
		endCombat(outcome.winner, {
			combatId: hand.combatId,
			heroName: hero.name,
			heroId: hero.norseHeroId,
			isPlayer: outcome.isPlayerDead,
		});
		return;
	}

	commitRewards(() => {
		// Receipts may arrive after reconnect, a repeated callback, or combat exit.
		if (readResolvedCombat()) startNextHand();
	});
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
