/**
 * pokerDramaHandlers.ts
 *
 * VisualEvent registry handlers that re-route the legacy usePokerDrama
 * trigger cluster (betting, reveals, showdown, phase drama) through the
 * VisualEvent bus. Each handler only calls the existing play* functions
 * from PokerDramaVFX — effects themselves are not rewritten here.
 *
 * Effects are fire-and-forget, same as the legacy hook behavior.
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
import { CombatAction, CombatPhase, HAND_RANK_NAMES, PokerHandRank } from '../../../types/PokerCombatTypes';
import { registerVisualEffect, type EffectHandle, type VisualEffectUnregister } from '../registry';
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

const NO_OP_HANDLE: EffectHandle = { cancel() {} };

let bettingPressureLevel = 0;
let playerStreak = 0;
let opponentStreak = 0;
let showdownContext: {
	playerRank: PokerHandRank;
	opponentRank: PokerHandRank;
	winner: ArenaVfxOwner | 'draw';
} | null = null;

export function resetPokerBettingPressure(): void {
	bettingPressureLevel = 0;
}

function handleBettingAction(event: BettingActionEvent): EffectHandle | null {
	const isPlayer = event.side === 'player';
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
	return NO_OP_HANDLE;
}

function handleCommunityCardRevealed(event: CommunityCardRevealedEvent): EffectHandle | null {
	// Flop: stagger each of the 3 slots by 200ms and play a single slam
	// sound for the whole flop. Turn: instant. River: slow-mo drama.
	if (event.phase === CombatPhase.FAITH) {
		if (event.slotIndex === 0) {
			playCardSlamSound();
		}
		setTimeout(() => {
			playCardDealVFX(event.slotIndex, event.card.suit, event.card.value, false);
		}, event.slotIndex * 200);
	} else if (event.phase === CombatPhase.FORESIGHT) {
		playCardSlamSound();
		playCardDealVFX(event.slotIndex, event.card.suit, event.card.value, false);
	} else if (event.phase === CombatPhase.DESTINY) {
		playCardSlamSound();
		playCardDealVFX(event.slotIndex, event.card.suit, event.card.value, true);
	}
	return NO_OP_HANDLE;
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
			setTimeout(() => playStreakAnnouncementVFX('DOMINATION', '#fbbf24'), 2000);
		}
	} else if (winner === 'opponent') {
		opponentStreak += 1;
		playerStreak = 0;
		emitStreakAnnounced({ side: 'opponent', streak: opponentStreak, kind: 'win' });
		emitStreakAnnounced({ side: 'player', streak: 0, kind: 'win' });
		if (opponentStreak === 3) {
			setTimeout(() => playStreakAnnouncementVFX('DOMINATION', '#ef4444'), 2000);
		}
	}
}

function handleHandRankAnnounced(event: HandRankAnnouncedEvent): EffectHandle | null {
	const isPlayer = event.side === 'player';
	const rankName = HAND_RANK_NAMES[event.rank] || '';
	if (isPlayer) {
		// Player announcement anchors the burst: capture the full showdown
		// picture for the damage step, then replay the legacy timing.
		showdownContext = { playerRank: event.rank, opponentRank: event.rank, winner: event.winner };
		setTimeout(() => {
			playHandRankAnnouncement(rankName, event.rank, event.winner === 'player', true);
		}, 400);
		updateShowdownStreaks(event.winner);
	} else {
		if (showdownContext) {
			showdownContext.opponentRank = event.rank;
		}
		setTimeout(() => {
			playHandRankAnnouncement(rankName, event.rank, event.winner === 'opponent', false);
		}, 900);
	}
	return NO_OP_HANDLE;
}

function handleShowdownDamage(event: ShowdownDamageEvent): EffectHandle | null {
	if (event.damage <= 0) return NO_OP_HANDLE;
	const rankDiff = showdownContext
		? Math.abs(showdownContext.playerRank - showdownContext.opponentRank)
		: 0;
	const isPlayerWinner = event.winner === 'player';
	const isLethal = event.isLethal ?? false;
	setTimeout(() => {
		playShowdownDamageVFX(event.damage, isPlayerWinner, rankDiff, isLethal);
	}, 1400);
	return NO_OP_HANDLE;
}

function handleRagnarokTriggered(_event: RagnarokTriggeredEvent): EffectHandle | null {
	playRagnarokVFX();
	return NO_OP_HANDLE;
}

function handleStreakAnnounced(event: StreakAnnouncedEvent): EffectHandle | null {
	if (event.kind === 'last_stand') {
		setTimeout(() => playStreakAnnouncementVFX('LAST STAND', '#e2e8f0'), 2200);
	}
	return NO_OP_HANDLE;
}

function handlePhaseEntered(event: PhaseEnteredEvent): EffectHandle | null {
	// Legacy behavior: every phase change reset the re-raise pressure
	// counter; keep that here so the counter lives with its handler.
	resetPokerBettingPressure();
	playPhaseDramaVFX(event.phase);
	return NO_OP_HANDLE;
}

function handleHandImproved(event: HandImprovedEvent): EffectHandle | null {
	playHandImprovementVFX(event.tier);
	return NO_OP_HANDLE;
}

export function registerPokerDramaVisualEffects(): VisualEffectUnregister {
	// Fresh combat mount: pressure and streak counters restart with the arena.
	bettingPressureLevel = 0;
	playerStreak = 0;
	opponentStreak = 0;
	showdownContext = null;

	const unregisterFns = [
		registerVisualEffect('bettingAction', handleBettingAction),
		registerVisualEffect('communityCardRevealed', handleCommunityCardRevealed),
		registerVisualEffect('handRankAnnounced', handleHandRankAnnounced),
		registerVisualEffect('showdownDamage', handleShowdownDamage),
		registerVisualEffect('ragnarokTriggered', handleRagnarokTriggered),
		registerVisualEffect('streakAnnounced', handleStreakAnnounced),
		registerVisualEffect('phaseEntered', handlePhaseEntered),
		registerVisualEffect('handImproved', handleHandImproved),
	];
	return () => {
		for (const unregister of unregisterFns) {
			unregister();
		}
	};
}
