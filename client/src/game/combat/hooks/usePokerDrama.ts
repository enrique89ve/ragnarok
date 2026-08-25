/**
 * usePokerDrama — Wires poker ambient state to the PokerDramaVFX engine.
 *
 * Moment effects (betting, reveals, showdown, phase drama) have moved to
 * VisualEvent handlers (vfx/handlers/pokerDramaHandlers.ts). This hook
 * keeps the continuous, state-projected concerns:
 * - Hand strength tracking for the live indicator + improvement flashes
 *   (improvement is a moment — emitted as a handImproved VisualEvent)
 * - Ambient tension level based on pot/HP ratio
 * - HP zone data attributes for CSS darkening
 * - Streak glow data attributes (fed by streakAnnounced VisualEvents)
 */

import { useEffect, useRef, useState } from 'react';
import { ARENA_VFX_LAYERS, getArenaVfxLayer } from '../arenaVfxTargets';
import {
	PokerCombatState,
	PokerHandRank,
	HAND_RANK_NAMES,
} from '../../types/PokerCombatTypes';
import { evaluatePokerHand } from '../../stores/combat/pokerCombatSlice';
import {
	setTensionLevel,
	startPokerOrphanSweep,
	stopPokerOrphanSweep,
	killAllPokerVFX,
} from '../animations/PokerDramaVFX';
import { emitHandImproved } from '../vfx/events';
import { subscribeVisualEvent } from '../vfx/emitter';

export interface PokerDramaState {
	currentHandRank: PokerHandRank;
	currentHandName: string;
	handTier: 'low' | 'mid' | 'high' | 'godly';
	playerStreak: number;
	opponentStreak: number;
}

interface UsePokerDramaOptions {
	combatState: PokerCombatState | null;
	isActive: boolean;
}

function getHandTier(rank: PokerHandRank): 'low' | 'mid' | 'high' | 'godly' {
	if (rank <= PokerHandRank.RUNE_MARK) return 'low';
	if (rank <= PokerHandRank.THORS_HAMMER) return 'mid';
	if (rank <= PokerHandRank.VALHALLAS_BLESSING) return 'high';
	return 'godly';
}

export function usePokerDrama(options: UsePokerDramaOptions): PokerDramaState {
	const { combatState, isActive } = options;

	const prevHandRankRef = useRef<PokerHandRank>(PokerHandRank.HIGH_CARD);
	const [streaks, setStreaks] = useState({ player: 0, opponent: 0 });

	// Start/stop orphan sweep with mount
	useEffect(() => {
		startPokerOrphanSweep();
		return () => {
			stopPokerOrphanSweep();
			killAllPokerVFX();
		};
	}, []);

	// Streak counters are owned by the showdown choreography handler, which
	// re-emits them as streakAnnounced events; mirror them into React state
	// so the dataset below re-projects with real values (the legacy refs
	// version never re-ran because ref reads cannot be effect dependencies).
	useEffect(() => {
		return subscribeVisualEvent('streakAnnounced', event => {
			if (event.kind !== 'win') return;
			setStreaks(prev => ({ ...prev, [event.side]: event.streak }));
		});
	}, []);

	// === Live hand strength tracking ===
	const currentHandRank = useRef(PokerHandRank.HIGH_CARD);
	const currentHandName = useRef('');

	useEffect(() => {
		if (!combatState || !isActive) return;

		const holeCards = combatState.player.holeCards;
		if (!holeCards || holeCards.length < 2) return;

		// Build community cards array
		const community = [
			...(combatState.communityCards.faith || []),
			...(combatState.communityCards.foresight ? [combatState.communityCards.foresight] : []),
			...(combatState.communityCards.destiny ? [combatState.communityCards.destiny] : []),
		];

		if (community.length === 0) {
			currentHandRank.current = PokerHandRank.HIGH_CARD;
			currentHandName.current = '';
			return;
		}

		const hand = evaluatePokerHand(holeCards, community);
		const prevRank = prevHandRankRef.current;
		currentHandRank.current = hand.rank;
		currentHandName.current = HAND_RANK_NAMES[hand.rank] || '';

		// Improvement is a moment: edge-detect the rank jump here and emit
		// it so the registry handler (and future composers) can react.
		if (hand.rank > prevRank && prevRank > 0) {
			emitHandImproved({ tier: getHandTier(hand.rank), rank: hand.rank, side: 'player' });
		}

		prevHandRankRef.current = hand.rank;
	}, [
		combatState?.communityCards.faith?.length,
		combatState?.communityCards.foresight,
		combatState?.communityCards.destiny,
		combatState?.player.holeCards,
		isActive
	]);

	// === Tension level tracking ===
	// Deliberately a direct state projection, not a VisualEvent: tension is
	// continuous state (pot ratio / all-in flag), not a discrete moment, and
	// the CSS variable must track every state change.
	useEffect(() => {
		if (!combatState || !isActive) return;

		const totalHP = (combatState.player.pet.stats.maxHealth + combatState.opponent.pet.stats.maxHealth);
		const potRatio = totalHP > 0 ? combatState.pot / totalHP : 0;

		if (combatState.isAllInShowdown) {
			setTensionLevel('allin');
		} else if (potRatio > 0.3) {
			setTensionLevel('high');
		} else if (potRatio > 0.1) {
			setTensionLevel('medium');
		} else {
			setTensionLevel('low');
		}
	}, [combatState?.pot, isActive]);

	// === HP zone tracking for CSS darkening ===
	// Deliberately a direct state projection, not a VisualEvent: HP is
	// continuous state and the zone classes must re-apply on every health
	// delta, including non-showdown damage and healing.
	useEffect(() => {
		if (!combatState || !isActive) return;

		const viewport = getArenaVfxLayer(ARENA_VFX_LAYERS.viewport);
		if (!viewport) return;

		const playerHP = combatState.player.pet.stats.currentHealth;
		const playerMax = combatState.player.pet.stats.maxHealth;
		const opponentHP = combatState.opponent.pet.stats.currentHealth;
		const opponentMax = combatState.opponent.pet.stats.maxHealth;

		const playerPct = playerMax > 0 ? playerHP / playerMax : 1;
		const opponentPct = opponentMax > 0 ? opponentHP / opponentMax : 1;

		viewport.dataset.playerHpZone = playerPct <= 0.2 ? 'critical' : playerPct <= 0.4 ? 'danger' : 'normal';
		viewport.dataset.opponentHpZone = opponentPct <= 0.2 ? 'critical' : opponentPct <= 0.4 ? 'danger' : 'normal';
	}, [combatState?.player.pet.stats.currentHealth, combatState?.opponent.pet.stats.currentHealth, isActive]);

	// === Streak glow dataset ===
	// Projection of the streak counts mirrored from streakAnnounced events.
	// Real state values as dependencies — the legacy version listed refs
	// here, which never change, so the data-*-streak attributes were stale.
	useEffect(() => {
		if (!combatState || !isActive) return;

		const viewport = getArenaVfxLayer(ARENA_VFX_LAYERS.viewport);
		if (!viewport) return;

		viewport.dataset.playerStreak = String(streaks.player);
		viewport.dataset.opponentStreak = String(streaks.opponent);
	}, [streaks.player, streaks.opponent, isActive]);

	return {
		currentHandRank: currentHandRank.current,
		currentHandName: currentHandName.current,
		handTier: getHandTier(currentHandRank.current),
		playerStreak: streaks.player,
		opponentStreak: streaks.opponent,
	};
}
