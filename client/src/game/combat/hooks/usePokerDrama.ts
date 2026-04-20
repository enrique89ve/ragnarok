/**
 * usePokerDrama — Wires poker phase transitions and betting actions
 * to the PokerDramaVFX engine for cinematic combat feel.
 *
 * Responsibilities:
 * - Triggers card deal VFX on phase transitions (FAITH/FORESIGHT/DESTINY)
 * - Triggers betting action VFX (raise/reraise/call/check/fold)
 * - Tracks reraise level for escalating pressure effects
 * - Tracks hand strength for live indicator + improvement flashes
 * - Tracks round momentum (win/loss streaks)
 * - Sets ambient tension level based on pot/HP ratio
 * - Emits HP zone data attributes for CSS darkening
 */

import { useEffect, useRef, useCallback } from 'react';
import {
	CombatPhase,
	CombatAction,
	PokerCombatState,
	PokerHandRank,
	HAND_RANK_NAMES,
} from '../../types/PokerCombatTypes';
import { evaluatePokerHand } from '../../stores/combat/pokerCombatSlice';
import {
	playFlopRevealVFX,
	playTurnRevealVFX,
	playRiverRevealVFX,
	playRaiseVFX,
	playReraiseVFX,
	playCallVFX,
	playCheckVFX,
	playFoldVFX,
	playHandRankAnnouncement,
	playRagnarokVFX,
	playShowdownDamageVFX,
	playPhaseDramaVFX,
	playStreakAnnouncementVFX,
	playHandImprovementVFX,
	setTensionLevel,
	playCardSlamSound,
	playClashSound,
	startPokerOrphanSweep,
	stopPokerOrphanSweep,
	killAllPokerVFX,
} from '../animations/PokerDramaVFX';

export interface PokerDramaState {
	currentHandRank: PokerHandRank;
	currentHandName: string;
	handTier: 'low' | 'mid' | 'high' | 'godly';
	reraiseCount: number;
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

	const prevPhaseRef = useRef<CombatPhase | null>(null);
	const prevHandRankRef = useRef<PokerHandRank>(PokerHandRank.HIGH_CARD);
	const reraiseCountRef = useRef(0);
	const playerStreakRef = useRef(0);
	const opponentStreakRef = useRef(0);
	const prevActionCountRef = useRef(0);

	// Start/stop orphan sweep with mount
	useEffect(() => {
		startPokerOrphanSweep();
		return () => {
			stopPokerOrphanSweep();
			killAllPokerVFX();
		};
	}, []);

	// === Phase transition VFX ===
	useEffect(() => {
		if (!combatState || !isActive) return;
		const phase = combatState.phase;
		if (phase === prevPhaseRef.current) return;
		const prevPhase = prevPhaseRef.current;
		prevPhaseRef.current = phase;

		// Reset reraise count on new betting round
		reraiseCountRef.current = 0;

		// Phase banner drama
		playPhaseDramaVFX(phase);

		// Community card reveals
		if (phase === CombatPhase.FAITH && prevPhase !== CombatPhase.FAITH) {
			const faithCards = combatState.communityCards.faith;
			if (faithCards.length === 3) {
				playFlopRevealVFX(faithCards.map(c => ({ suit: c.suit, value: c.value })));
				playCardSlamSound();
			}
		}

		if (phase === CombatPhase.FORESIGHT && prevPhase !== CombatPhase.FORESIGHT) {
			const turnCard = combatState.communityCards.foresight;
			if (turnCard) {
				playTurnRevealVFX({ suit: turnCard.suit, value: turnCard.value });
				playCardSlamSound();
			}
		}

		if (phase === CombatPhase.DESTINY && prevPhase !== CombatPhase.DESTINY) {
			const riverCard = combatState.communityCards.destiny;
			if (riverCard) {
				playRiverRevealVFX({ suit: riverCard.suit, value: riverCard.value });
				playCardSlamSound();
			}
		}
	}, [combatState?.phase, isActive]);

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

		// Flash on improvement
		if (hand.rank > prevRank && prevRank > 0) {
			const tier = getHandTier(hand.rank);
			playHandImprovementVFX(tier);
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
	useEffect(() => {
		if (!combatState || !isActive) return;

		const viewport = document.querySelector('.game-viewport') as HTMLElement;
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

	// === Streak tracking ===
	useEffect(() => {
		if (!combatState || !isActive) return;

		const viewport = document.querySelector('.game-viewport') as HTMLElement;
		if (viewport) {
			viewport.dataset.playerStreak = String(playerStreakRef.current);
			viewport.dataset.opponentStreak = String(opponentStreakRef.current);
		}
	}, [playerStreakRef.current, opponentStreakRef.current, isActive]);

	// === Betting action VFX callback (called from handleAction) ===
	const onBettingAction = useCallback((action: CombatAction, isPlayer: boolean) => {
		switch (action) {
			case CombatAction.ATTACK:
				playRaiseVFX(isPlayer);
				break;
			case CombatAction.COUNTER_ATTACK:
				reraiseCountRef.current++;
				playReraiseVFX(isPlayer, reraiseCountRef.current);
				break;
			case CombatAction.ENGAGE:
				playCallVFX();
				playClashSound();
				break;
			case CombatAction.DEFEND:
				playCheckVFX(isPlayer);
				break;
			case CombatAction.BRACE:
				playFoldVFX(isPlayer);
				break;
		}
	}, []);

	// === Showdown VFX callback ===
	const onShowdown = useCallback((
		playerRank: PokerHandRank,
		opponentRank: PokerHandRank,
		winner: 'player' | 'opponent' | 'draw',
		damage: number
	) => {
		const playerName = HAND_RANK_NAMES[playerRank] || '';
		const opponentName = HAND_RANK_NAMES[opponentRank] || '';

		// Check for RAGNAROK
		if (playerRank === PokerHandRank.RAGNAROK || opponentRank === PokerHandRank.RAGNAROK) {
			playRagnarokVFX();
		}

		// Announce hands
		setTimeout(() => {
			playHandRankAnnouncement(playerName, playerRank, winner === 'player', true);
		}, 400);
		setTimeout(() => {
			playHandRankAnnouncement(opponentName, opponentRank, winner === 'opponent', false);
		}, 900);

		// Damage delivery
		if (winner !== 'draw' && damage > 0) {
			const rankDiff = Math.abs(playerRank - opponentRank);
			setTimeout(() => {
				playShowdownDamageVFX(damage, winner === 'player', rankDiff);
			}, 1400);
		}

		// Update streaks
		if (winner === 'player') {
			playerStreakRef.current++;
			opponentStreakRef.current = 0;
			if (playerStreakRef.current === 3) {
				setTimeout(() => playStreakAnnouncementVFX('DOMINATION', '#fbbf24'), 2000);
			}
		} else if (winner === 'opponent') {
			opponentStreakRef.current++;
			playerStreakRef.current = 0;
			if (opponentStreakRef.current === 3) {
				setTimeout(() => playStreakAnnouncementVFX('DOMINATION', '#ef4444'), 2000);
			}
		}

		// Comeback detection
		if (winner === 'player' && combatState) {
			const pHP = combatState.player.pet.stats.currentHealth;
			const pMax = combatState.player.pet.stats.maxHealth;
			if (pHP / pMax <= 0.2) {
				setTimeout(() => playStreakAnnouncementVFX('LAST STAND', '#e2e8f0'), 2200);
			}
		}
	}, [combatState]);

	// Expose for external wiring
	(usePokerDrama as any).__onBettingAction = onBettingAction;
	(usePokerDrama as any).__onShowdown = onShowdown;

	return {
		currentHandRank: currentHandRank.current,
		currentHandName: currentHandName.current,
		handTier: getHandTier(currentHandRank.current),
		reraiseCount: reraiseCountRef.current,
		playerStreak: playerStreakRef.current,
		opponentStreak: opponentStreakRef.current,
	};
}

/**
 * Get the drama action callback for use in handleAction
 */
export function getPokerDramaCallbacks(): {
	onBettingAction: (action: CombatAction, isPlayer: boolean) => void;
	onShowdown: (playerRank: PokerHandRank, opponentRank: PokerHandRank, winner: 'player' | 'opponent' | 'draw', damage: number) => void;
} {
	return {
		onBettingAction: (usePokerDrama as any).__onBettingAction || (() => {}),
		onShowdown: (usePokerDrama as any).__onShowdown || (() => {}),
	};
}
