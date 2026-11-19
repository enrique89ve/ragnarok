import { useEffect, useRef, useState } from 'react';
import {
	PokerHandRank,
	type CombatResolution,
	type PokerCard,
	type PokerCombatState,
	type PokerResolvedHand,
} from '../../types/PokerCombatTypes';
import { initializeCombatEventSubscribers, cleanupCombatEventSubscribers } from '../../services/CombatEventSubscribers';
import {
	emitHandRankAnnounced,
	emitRagnarokTriggered,
	emitShowdownDamage,
	emitStreakAnnounced,
} from '../vfx/events';
import { holdHeroVisualHp } from '../vfx/visualVitalsHold';
import { planPokerResolutionOutcome } from '../pokerResolutionOutcome';

export interface ShowdownCelebration {
	readonly combatId: string;
	readonly handIndex: number;
	readonly resolution: CombatResolution;
	readonly winningCards: PokerCard[];
}

export function useCombatEvents(
	combatState: PokerCombatState | null,
	resolvedHand: PokerResolvedHand | null,
) {
	const [celebration, setCelebration] = useState<ShowdownCelebration | null>(null);
	const presentedHandRef = useRef<PokerResolvedHand | null>(null);

	useEffect(() => {
		initializeCombatEventSubscribers();
		return cleanupCombatEventSubscribers;
	}, []);

	useEffect(() => {
		if (!resolvedHand || !combatState || presentedHandRef.current === resolvedHand) return;
		if (resolvedHand.combatId !== combatState.combatId || resolvedHand.handIndex !== combatState.handNumber) return;
		presentedHandRef.current = resolvedHand;

		const result = resolvedHand.resolution;
		const { playerHand, opponentHand, winner } = result;
		const isCombatOver = planPokerResolutionOutcome(result).kind === 'combat-over';
		if (isCombatOver) {
			setCelebration(null);
		} else {
			const winningCards = winner === 'draw'
				? [...playerHand.cards, ...opponentHand.cards]
				: winner === 'player' ? playerHand.cards : opponentHand.cards;
			setCelebration({
				combatId: resolvedHand.combatId,
				handIndex: resolvedHand.handIndex,
				resolution: result,
				winningCards,
			});
		}

		const loserSide = winner === 'player' ? 'opponent' : 'player';
		const damage = loserSide === 'player' ? result.playerDamage : result.opponentDamage;
		if (winner !== 'draw' && damage > 0) {
			const loserFinalHp = loserSide === 'player' ? result.playerFinalHealth : result.opponentFinalHealth;
			holdHeroVisualHp(loserSide, loserFinalHp + damage, 'showdown-impact', 2_400);
		}

		if (playerHand.rank === PokerHandRank.RAGNAROK || opponentHand.rank === PokerHandRank.RAGNAROK) {
			emitRagnarokTriggered({ side: playerHand.rank === PokerHandRank.RAGNAROK ? 'player' : 'opponent' });
		}
		emitHandRankAnnounced({ side: 'player', rank: playerHand.rank, winner });
		emitHandRankAnnounced({ side: 'opponent', rank: opponentHand.rank, winner });
		if (winner !== 'draw' && damage > 0) {
			emitShowdownDamage({ winner, damage, isLethal: isCombatOver, handledByCelebration: !isCombatOver });
		}
		const { currentHealth, maxHealth } = combatState.player.pet.stats;
		if (winner === 'player' && maxHealth > 0 && currentHealth / maxHealth <= 0.2) {
			emitStreakAnnounced({ side: 'player', streak: 0, kind: 'last_stand' });
		}
	}, [combatState, resolvedHand]);

	return {
		showdownCelebration: celebration?.combatId === combatState?.combatId ? celebration : null,
		dismissShowdown: (snapshot: ShowdownCelebration) => {
			setCelebration(current => current === snapshot ? null : current);
		},
	};
}
