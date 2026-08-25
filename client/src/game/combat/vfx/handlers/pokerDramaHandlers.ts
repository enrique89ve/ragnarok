/**
 * pokerDramaHandlers.ts
 *
 * VisualEvent registry handlers that re-route the legacy usePokerDrama
 * trigger cluster (betting, reveals, showdown, phase drama) through the
 * VisualEvent bus. Each handler only calls the existing play* functions
 * from PokerDramaVFX — effects themselves are not rewritten here.
 *
 * Effects remain fire-and-forget from the event bus, but delayed choreography
 * is tracked and cancellable so stale work cannot leak into the next hand.
 */

import {
	playCallVFX,
	playCardDealVFX,
	playCardSlamSound,
	playCheckVFX,
	playClashSound,
	playFoldVFX,
	playHandImprovementVFX,
	playHandRankAnnouncement,
	playPhaseDramaVFX,
	playRaiseVFX,
	playRagnarokVFX,
	playReraiseVFX,
	playShowdownDamageVFX,
	playStreakAnnouncementVFX,
} from '../../animations/PokerDramaVFX';
import { playThorHammerVFX } from '../../../animations/ThorHammerVFX';
import { CombatAction, CombatPhase, HAND_RANK_NAMES, PokerHandRank } from '../../../types/PokerCombatTypes';
import { registerVisualEffect, type EffectHandle, type VisualEffectUnregister } from '../registry';
import { registerCombatImpactVisualEffect } from './combatImpactHandler';
import {
	bettingActionMotion,
	cancelPokerMotionSchedules,
	POKER_MOTION_SPECS,
	schedulePokerMotion,
	showdownImpactMotion,
	} from '@/game/effects/poker';
import { shouldAnnounceHandRank } from '../pokerEventFx';
import {
	emitStreakAnnounced,
	type BettingActionEvent,
	type CommunityCardRevealedEvent,
	type HandImprovedEvent,
	type HandRankAnnouncedEvent,
	type PhaseEnteredEvent,
	type RagnarokTriggeredEvent,
	type ShowdownDamageEvent,
	type StreakAnnouncedEvent,
} from '../events';
import type { ArenaVfxOwner } from '../../arenaVfxTargets';

const COMPLETED_HANDLE: EffectHandle = { cancel() {} };

let bettingPressureLevel = 0;
let playerStreak = 0;
let opponentStreak = 0;
let showdownContext: {
	playerRank: PokerHandRank;
	opponentRank: PokerHandRank;
	winner: ArenaVfxOwner | 'draw';
} | null = null;
const lastThorHammerPlayedAt: Partial<Record<ArenaVfxOwner, number>> = {};

export function resetPokerBettingPressure(): void {
	bettingPressureLevel = 0;
}

function handleBettingAction(event: BettingActionEvent): EffectHandle | null {
	const isPlayer = event.side === 'player';
	const motion = bettingActionMotion(event.action, event.side);
	return schedulePokerMotion(motion, [0], () => {
		switch (event.action) {
			case CombatAction.ATTACK:
				playRaiseVFX(isPlayer);
				break;
			case CombatAction.COUNTER_ATTACK:
				bettingPressureLevel += 1;
				playReraiseVFX(isPlayer, bettingPressureLevel);
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
	}, `action-${event.side}`);
}

function handleCommunityCardRevealed(event: CommunityCardRevealedEvent): EffectHandle | null {
	// Flop: stagger each of the 3 slots by 160ms and play a single slam
	// sound for the whole flop. Turn: instant. River: slow-mo drama.
	if (event.phase === CombatPhase.FAITH) {
		if (event.slotIndex === 0) {
			playCardSlamSound();
		}
		return schedulePokerMotion(POKER_MOTION_SPECS['community-reveal'], [event.slotIndex * 160], () => {
			playCardDealVFX(event.slotIndex, event.card.suit, event.card.value, false);
		}, `community-${event.slotIndex}`);
	} else if (event.phase === CombatPhase.FORESIGHT) {
		playCardSlamSound();
		playCardDealVFX(event.slotIndex, event.card.suit, event.card.value, false);
	} else if (event.phase === CombatPhase.DESTINY) {
		playCardSlamSound();
		playCardDealVFX(event.slotIndex, event.card.suit, event.card.value, true);
	}
	return COMPLETED_HANDLE;
}

// ── Showdown choreography ─────────────────────────────────────────────
// The RESOLUTION events (handRankAnnounced x2, showdownDamage,
// ragnarokTriggered, streakAnnounced) arrive as one synchronous burst
// emitted post-commit. The handlers below re-create the legacy rhythm
// (0 / 400 / 900 / 1400 / 2000 / 2200ms) with the delays living HERE,
// so the choreography stays in one place.
// ──────────────────────────────────────────────────────────────────────

function updateShowdownStreaks(winner: ArenaVfxOwner | 'draw'): void {
	if (winner === 'player') {
		playerStreak += 1;
		opponentStreak = 0;
		emitStreakAnnounced({ side: 'player', streak: playerStreak, kind: 'win' });
		emitStreakAnnounced({ side: 'opponent', streak: 0, kind: 'win' });
		if (playerStreak === 3) {
			schedulePokerMotion(POKER_MOTION_SPECS['streak-announcement'], [2000], () => playStreakAnnouncementVFX('DOMINATION', '#fbbf24'), 'domination');
		}
	} else if (winner === 'opponent') {
		opponentStreak += 1;
		playerStreak = 0;
		emitStreakAnnounced({ side: 'opponent', streak: opponentStreak, kind: 'win' });
		emitStreakAnnounced({ side: 'player', streak: 0, kind: 'win' });
		if (opponentStreak === 3) {
			schedulePokerMotion(POKER_MOTION_SPECS['streak-announcement'], [2000], () => playStreakAnnouncementVFX('DOMINATION', '#ef4444'), 'domination');
		}
	}
}

function handleHandRankAnnounced(event: HandRankAnnouncedEvent): EffectHandle | null {
	const isPlayer = event.side === 'player';
	const rankName = HAND_RANK_NAMES[event.rank] || '';
	if (isPlayer) {
		cancelPokerMotionSchedules();
		showdownContext = { playerRank: event.rank, opponentRank: event.rank, winner: event.winner };
		updateShowdownStreaks(event.winner);
	} else if (showdownContext) {
		showdownContext.opponentRank = event.rank;
	}

	if (!shouldAnnounceHandRank(event)) {
		return COMPLETED_HANDLE;
	}

	return schedulePokerMotion(POKER_MOTION_SPECS['hand-rank'], [isPlayer ? 400 : 900], () => {
		if (event.rank === PokerHandRank.THORS_HAMMER) {
			playThorHammerIfNeeded(event.side, event.id, event.timestamp);
			return;
		}
		playHandRankAnnouncement(rankName, event.rank, true, isPlayer);
	}, 'hand-rank');
}

function handleShowdownDamage(event: ShowdownDamageEvent): EffectHandle | null {
	if (event.damage <= 0) return COMPLETED_HANDLE;
	const rankDiff = showdownContext
		? Math.abs(showdownContext.playerRank - showdownContext.opponentRank)
		: 0;
	const isPlayerWinner = event.winner === 'player';
	const isLethal = event.isLethal ?? false;
	const targetOwner = event.target === 'player-hero' ? 'player' : 'opponent';
	return schedulePokerMotion(showdownImpactMotion(targetOwner), [1400], () => {
		playShowdownDamageVFX(event.damage, isPlayerWinner, rankDiff, isLethal);
	}, `showdown-impact-${targetOwner}`);
}

function handleRagnarokTriggered(_event: RagnarokTriggeredEvent): EffectHandle | null {
	return schedulePokerMotion(POKER_MOTION_SPECS['streak-announcement'], [0], () => playRagnarokVFX(), 'ragnarok');
}

function handleStreakAnnounced(event: StreakAnnouncedEvent): EffectHandle | null {
	if (event.kind === 'last_stand') {
		return schedulePokerMotion(POKER_MOTION_SPECS['streak-announcement'], [2200], () => playStreakAnnouncementVFX('LAST STAND', '#e2e8f0'), 'last-stand');
	}
	return COMPLETED_HANDLE;
}

function handlePhaseEntered(event: PhaseEnteredEvent): EffectHandle | null {
	// Legacy behavior: every phase change reset the re-raise pressure
	// counter; keep that here so the counter lives with its handler.
	resetPokerBettingPressure();
	return schedulePokerMotion(POKER_MOTION_SPECS['phase-reveal'], [0], () => playPhaseDramaVFX(event.phase), 'phase');
}

function playThorHammerIfNeeded(side: ArenaVfxOwner, seed: string, timestamp: number): void {
	const previous = lastThorHammerPlayedAt[side];
	if (previous !== undefined && timestamp - previous < 2800) return;
	lastThorHammerPlayedAt[side] = timestamp;
	void playThorHammerVFX({ side, seed });
}

function handleHandImproved(event: HandImprovedEvent): EffectHandle | null {
	if (event.rank === PokerHandRank.THORS_HAMMER) {
		playThorHammerIfNeeded(event.side, event.id, event.timestamp);
		return COMPLETED_HANDLE;
	}
	return schedulePokerMotion(POKER_MOTION_SPECS['betting-action'], [0], () => playHandImprovementVFX(event.tier), 'hand-improved');
}

export function registerPokerDramaVisualEffects(): VisualEffectUnregister {
	// Fresh combat mount: pressure and streak counters restart with the arena.
	bettingPressureLevel = 0;
	playerStreak = 0;
	opponentStreak = 0;
	showdownContext = null;
	delete lastThorHammerPlayedAt.player;
	delete lastThorHammerPlayedAt.opponent;

	const unregisterFns = [
		registerVisualEffect('bettingAction', handleBettingAction),
		registerVisualEffect('communityCardRevealed', handleCommunityCardRevealed),
		registerVisualEffect('handRankAnnounced', handleHandRankAnnounced),
		registerVisualEffect('showdownDamage', handleShowdownDamage),
		registerVisualEffect('ragnarokTriggered', handleRagnarokTriggered),
		registerVisualEffect('streakAnnounced', handleStreakAnnounced),
		registerVisualEffect('phaseEntered', handlePhaseEntered),
		registerVisualEffect('handImproved', handleHandImproved),
		registerCombatImpactVisualEffect(),
	];
	return () => {
		cancelPokerMotionSchedules();
		for (const unregister of unregisterFns) {
			unregister();
		}
	};
}
