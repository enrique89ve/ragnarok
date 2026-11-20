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
	playPokerSpellCast,
	playRaiseVFX,
	playRagnarokVFX,
	playReraiseVFX,
	playShowdownDamageVFX,
	playStaminaVfx,
	playStreakAnnouncementVFX,
	playWagerActivate,
} from '../../animations/PokerDramaVFX';
import { playThorHammerVFX } from '../../../animations/ThorHammerVFX';
import { CombatAction, CombatPhase, HAND_RANK_NAMES, PokerHandRank } from '../../../types/PokerCombatTypes';
import { useAudio } from '@/lib/stores/useAudio';
import type { GameAudioCueId } from '@/game/audio/gameAudioCues';
import { registerVisualEffect, type EffectHandle, type VisualEffectUnregister } from '../registry';
import { registerCombatImpactVisualEffect } from './combatImpactHandler';
import { registerSpellVfxHandler } from './spellVfxHandler';
import { registerFactionVfxSubscriber } from '../factionScenes';
import { requestCombatDamageFloater } from '../../floaters/combatDamageFloater';
import {
	bettingActionMotion,
	cancelPokerMotionSchedules,
	POKER_MOTION_SPECS,
	CENTER_SLAM_GAP_MS,
	schedulePokerMotion,
	showdownImpactMotion,
	} from '@/game/effects/poker';
import { shouldAnnounceHandRank } from '../pokerEventFx';
import {
	vfxOrchestrationDirector,
	type VfxCascadeWeight,
	type VfxFocalZone,
} from '../vfxOrchestrationDirector';
import { publishArenaVfxBeat } from '../../../qa/arenaVfxQa';
import {
	resolvePokerVfxIntent,
	resolvePokerVfxIntentForBettingAction,
} from '../../animations/pokerVfxCatalog';
import {
	emitStreakAnnounced,
	type BettingActionEvent,
	type CommunityCardRevealedEvent,
	type HandImprovedEvent,
	type HandRankAnnouncedEvent,
	type PhaseEnteredEvent,
	type RagnarokTriggeredEvent,
	type ShowdownDamageEvent,
	type StaminaChangedEvent,
	type StreakAnnouncedEvent,
	type SpellCastEvent,
	type WagerActivatedEvent,
} from '../events';
import type { ArenaVfxOwner } from '../../arenaVfxTargets';

const COMPLETED_HANDLE: EffectHandle = { cancel() {} };

const FX_GOLD = '#f5c542';
const FX_BLOOD = '#dc2626';
const FX_INK = '#e5e7eb';
const SHOWDOWN_RANK_LEAD_MS = 400;
const SHOWDOWN_OPPONENT_RANK_LEAD_MS = 900;
/** One center title finishes (enter + 3s read + exit) before the next begins. */
const SHOWDOWN_READ_GAP_MS = CENTER_SLAM_GAP_MS;

function showdownRankLeadMs(winner: ArenaVfxOwner | 'draw'): number {
	return winner === 'opponent' ? SHOWDOWN_OPPONENT_RANK_LEAD_MS : SHOWDOWN_RANK_LEAD_MS;
}

function showdownFollowMs(winner: ArenaVfxOwner | 'draw'): number {
	return showdownRankLeadMs(winner) + SHOWDOWN_READ_GAP_MS;
}

const PHASE_AUDIO_CUE: Partial<Record<CombatPhase, GameAudioCueId>> = {
	[CombatPhase.FAITH]: 'new_phase_sting',
	[CombatPhase.FORESIGHT]: 'new_phase_sting',
	[CombatPhase.DESTINY]: 'new_phase_sting',
	[CombatPhase.RESOLUTION]: 'showdown_escalation',
};

let bettingPressureLevel = 0;
let playerStreak = 0;
let opponentStreak = 0;
let phaseAudioCueCancel: (() => void) | null = null;
let showdownContext: {
	playerRank: PokerHandRank;
	opponentRank: PokerHandRank;
	winner: ArenaVfxOwner | 'draw';
} | null = null;
let showdownBannerSlot = 0;
let pendingRagnarok = false;
let pendingDomination: { color: string } | null = null;

function placeCenterBanner(winner: ArenaVfxOwner | 'draw'): number {
	const at = showdownRankLeadMs(winner) + SHOWDOWN_READ_GAP_MS * showdownBannerSlot;
	showdownBannerSlot += 1;
	return at;
}

function flushDeferredCenterBanners(winner: ArenaVfxOwner | 'draw'): void {
	if (pendingRagnarok) {
		pendingRagnarok = false;
		schedulePokerMotion(
			POKER_MOTION_SPECS['ragnarok-ultimate'],
			[placeCenterBanner(winner)],
			() => playRagnarokVFX(),
			'ragnarok',
		);
	}
	if (pendingDomination) {
		const color = pendingDomination.color;
		pendingDomination = null;
		schedulePokerMotion(
			POKER_MOTION_SPECS['streak-announcement'],
			[placeCenterBanner(winner)],
			() => playStreakAnnouncementVFX('DOMINATION', color),
			'domination',
		);
	}
}
const lastThorHammerPlayedAt: Partial<Record<ArenaVfxOwner, number>> = {};

export function resetPokerBettingPressure(): void {
	bettingPressureLevel = 0;
}

const STAKE_ACTIONS = new Set([
	CombatAction.ATTACK,
	CombatAction.COUNTER_ATTACK,
	CombatAction.ENGAGE,
]);

function maybePublishStakeFloater(event: BettingActionEvent): void {
	const hp = event.hpCommitment ?? 0;
	if (hp <= 0 || !STAKE_ACTIONS.has(event.action)) return;
	const targetId = event.side === 'player' ? 'player-hero' : 'opponent-hero';
	requestCombatDamageFloater({
		id: `${event.id}:stake`,
		targetId,
		amount: hp,
		variant: 'stake',
	});
}

function handleBettingAction(event: BettingActionEvent): EffectHandle | null {
	const isPlayer = event.side === 'player';
	const motion = bettingActionMotion(event.action, event.side);
	const rawIntent = resolvePokerVfxIntentForBettingAction(event.action, event.side);
	const bettingIntent = rawIntent && event.hpCommitment !== undefined
		? { ...rawIntent, stakeAmount: event.hpCommitment }
		: rawIntent;
	const weight: VfxCascadeWeight = event.action === CombatAction.COUNTER_ATTACK || (event.hpCommitment ?? 0) >= 26
		? 'heavy'
		: event.action === CombatAction.ATTACK || event.action === CombatAction.ENGAGE
			? 'medium'
			: 'light';
	const zone: VfxFocalZone = event.action === CombatAction.ENGAGE
		? 'center'
		: isPlayer
			? 'opponentHero'
			: 'playerHero';
	const slot = vfxOrchestrationDirector.reserveCascadeSlot({ weight, zone });
	return schedulePokerMotion(motion, [slot.delayMs], () => {
		maybePublishStakeFloater(event);
		switch (event.action) {
			case CombatAction.ATTACK:
				playRaiseVFX(isPlayer, bettingIntent ?? undefined);
				publishArenaVfxBeat({
					source: 'bettingAction',
					detail: event.action,
					motion: bettingIntent?.motion,
				});
				break;
			case CombatAction.COUNTER_ATTACK:
				bettingPressureLevel += 1;
				playReraiseVFX(isPlayer, bettingPressureLevel, bettingIntent ?? undefined);
				publishArenaVfxBeat({
					source: 'bettingAction',
					detail: event.action,
					motion: bettingIntent?.motion,
				});
				break;
			case CombatAction.ENGAGE:
				playCallVFX(bettingIntent ?? undefined);
				playClashSound();
				publishArenaVfxBeat({
					source: 'bettingAction',
					detail: event.action,
					motion: bettingIntent?.motion,
				});
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
// The RESOLUTION events arrive as one synchronous burst. Visible center
// titles take successive slots of CENTER_SLAM_GAP_MS so none share the
// pixel. DOMINATION and a leftover RAGNAROK wait until both ranks have
// claimed their slot.
// ──────────────────────────────────────────────────────────────────────

function updateShowdownStreaks(winner: ArenaVfxOwner | 'draw'): void {
	if (winner === 'player') {
		playerStreak += 1;
		opponentStreak = 0;
		emitStreakAnnounced({ side: 'player', streak: playerStreak, kind: 'win' });
		emitStreakAnnounced({ side: 'opponent', streak: 0, kind: 'win' });
		if (playerStreak === 3) pendingDomination = { color: FX_GOLD };
	} else if (winner === 'opponent') {
		opponentStreak += 1;
		playerStreak = 0;
		emitStreakAnnounced({ side: 'opponent', streak: opponentStreak, kind: 'win' });
		emitStreakAnnounced({ side: 'player', streak: 0, kind: 'win' });
		if (opponentStreak === 3) pendingDomination = { color: FX_BLOOD };
	}
}

function handleHandRankAnnounced(event: HandRankAnnouncedEvent): EffectHandle | null {
	const isPlayer = event.side === 'player';
	const rankName = HAND_RANK_NAMES[event.rank] || '';
	if (isPlayer) {
		cancelPokerMotionSchedules();
		showdownContext = { playerRank: event.rank, opponentRank: event.rank, winner: event.winner };
		showdownBannerSlot = 0;
		pendingDomination = null;
		updateShowdownStreaks(event.winner);
	} else if (showdownContext) {
		showdownContext.opponentRank = event.rank;
	}

	let handle: EffectHandle = COMPLETED_HANDLE;
	if (shouldAnnounceHandRank(event) && event.rank > PokerHandRank.HIGH_CARD) {
		const at = placeCenterBanner(event.winner);
		if (event.rank === PokerHandRank.RAGNAROK) {
			pendingRagnarok = false;
			handle = schedulePokerMotion(
				POKER_MOTION_SPECS['ragnarok-ultimate'],
				[at],
				() => playRagnarokVFX(),
				'ragnarok',
			);
		} else if (event.rank === PokerHandRank.THORS_HAMMER) {
			handle = schedulePokerMotion(POKER_MOTION_SPECS['hand-rank'], [at], () => {
				playThorHammerIfNeeded(event.side, event.id, event.timestamp, 'strike');
			}, 'hand-rank');
		} else {
			handle = schedulePokerMotion(POKER_MOTION_SPECS['hand-rank'], [at], () => {
				playHandRankAnnouncement(rankName, event.rank, true, isPlayer);
			}, 'hand-rank');
		}
	}

	if (!isPlayer) {
		flushDeferredCenterBanners(showdownContext?.winner ?? event.winner);
	}
	return handle;
}

function handleShowdownDamage(event: ShowdownDamageEvent): EffectHandle | null {
	if (event.damage <= 0) return COMPLETED_HANDLE;
	// Non-lethal showdowns are choreographed in one synchronized pass by
	// PokerCombatAnimation so HP latch release, Pixi blast, floater, and audio
	// never fire twice at competing timestamps.
	if (event.handledByCelebration) return COMPLETED_HANDLE;
	const rankDiff = showdownContext
		? Math.abs(showdownContext.playerRank - showdownContext.opponentRank)
		: 0;
	const isPlayerWinner = event.winner === 'player';
	const isLethal = event.isLethal ?? false;
	const targetOwner = event.target === 'player-hero' ? 'player' : 'opponent';
	const damageAt = isLethal
		? SHOWDOWN_RANK_LEAD_MS
		: Math.max(
			SHOWDOWN_RANK_LEAD_MS,
			showdownFollowMs(showdownContext?.winner ?? event.winner) - 400,
		);
	return schedulePokerMotion(showdownImpactMotion(targetOwner), [damageAt], () => {
		playShowdownDamageVFX(event.damage, isPlayerWinner, rankDiff, isLethal, () => {
			requestCombatDamageFloater({
				id: event.id,
				targetId: event.target,
				amount: event.damage,
				variant: 'showdown',
			});
		});
	}, `showdown-impact-${targetOwner}`);
}

function handleSpellCast(event: SpellCastEvent): EffectHandle | null {
	return schedulePokerMotion(
		POKER_MOTION_SPECS['spell-cast'],
		[0],
		() => {
			const intent = resolvePokerVfxIntent('spell', event) ?? undefined;
			playPokerSpellCast(event.effectType, event.side, intent);
			publishArenaVfxBeat({
				source: 'spellCast',
				detail: event.effectType,
				motion: intent?.motion,
			});
		},
		`spell-cast-${event.side}`,
	);
}

function handleWagerActivated(event: WagerActivatedEvent): EffectHandle | null {
	return schedulePokerMotion(
		POKER_MOTION_SPECS['wager-activate'],
		[0],
		() => {
			const intent = resolvePokerVfxIntent('wager', event) ?? undefined;
			playWagerActivate(event.wagerType, event.side, intent);
			publishArenaVfxBeat({
				source: 'wagerActivated',
				detail: event.wagerType,
				motion: intent?.motion,
			});
		},
		`wager-activate-${event.side}`,
	);
}

function handleRagnarokTriggered(_event: RagnarokTriggeredEvent): EffectHandle | null {
	pendingRagnarok = true;
	return {
		cancel() {
			pendingRagnarok = false;
		},
	};
}

function handleStreakAnnounced(event: StreakAnnouncedEvent): EffectHandle | null {
	if (event.kind === 'last_stand') {
		return schedulePokerMotion(
			POKER_MOTION_SPECS['streak-announcement'],
			[placeCenterBanner(showdownContext?.winner ?? 'player')],
			() => playStreakAnnouncementVFX('LAST STAND', FX_INK),
			'last-stand',
		);
	}
	return COMPLETED_HANDLE;
}

function handlePhaseEntered(event: PhaseEnteredEvent): EffectHandle | null {
	// Legacy behavior: every phase change reset the re-raise pressure
	// counter; keep that here so the counter lives with its handler.
	resetPokerBettingPressure();
	const audioCue = PHASE_AUDIO_CUE[event.phase];
	if (audioCue) {
		phaseAudioCueCancel?.();
		phaseAudioCueCancel = useAudio.getState().playAudioCue(audioCue);
	}
	return schedulePokerMotion(POKER_MOTION_SPECS['phase-reveal'], [0], () => playPhaseDramaVFX(event.phase), 'phase');
}

function playThorHammerIfNeeded(
	side: ArenaVfxOwner,
	seed: string,
	timestamp: number,
	mode: 'strike' | 'hand-rank' = 'hand-rank',
): void {
	const previous = lastThorHammerPlayedAt[side];
	if (previous !== undefined && timestamp - previous < 2800) return;
	lastThorHammerPlayedAt[side] = timestamp;
	void playThorHammerVFX({ side, seed, mode });
}

function handleStaminaChanged(event: StaminaChangedEvent): EffectHandle | null {
	return schedulePokerMotion(
		POKER_MOTION_SPECS['betting-action'],
		[0],
		() => {
			playStaminaVfx(event.side, event.reason);
		},
		`stamina-${event.side}-${event.reason}`,
	);
}

function handleHandImproved(event: HandImprovedEvent): EffectHandle | null {
	if (event.rank === PokerHandRank.THORS_HAMMER) {
		playThorHammerIfNeeded(event.side, event.id, event.timestamp, 'hand-rank');
		return COMPLETED_HANDLE;
	}
	return schedulePokerMotion(POKER_MOTION_SPECS['hand-improve'], [0], () => playHandImprovementVFX(event.tier), 'hand-improved');
}

export function registerPokerDramaVisualEffects(): VisualEffectUnregister {
	// Fresh combat mount: pressure and streak counters restart with the arena.
	bettingPressureLevel = 0;
	playerStreak = 0;
	opponentStreak = 0;
	phaseAudioCueCancel = null;
	showdownContext = null;
	showdownBannerSlot = 0;
	pendingRagnarok = false;
	pendingDomination = null;
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
		registerVisualEffect('spellCast', handleSpellCast),
		registerVisualEffect('wagerActivated', handleWagerActivated),
		registerVisualEffect('staminaChanged', handleStaminaChanged),
		registerCombatImpactVisualEffect(),
		registerSpellVfxHandler(),
		registerFactionVfxSubscriber(),
	];
	return () => {
		phaseAudioCueCancel?.();
		phaseAudioCueCancel = null;
		cancelPokerMotionSchedules();
		for (const unregister of unregisterFns) {
			unregister();
		}
	};
}
