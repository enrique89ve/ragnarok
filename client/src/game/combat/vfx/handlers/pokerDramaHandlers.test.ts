import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CombatAction, CombatPhase, PokerHandRank } from '../../../types/PokerCombatTypes';
import {
	emitBettingAction,
	emitHandRankAnnounced,
	emitPhaseEntered,
	emitRagnarokTriggered,
	emitSpellCast,
	emitStreakAnnounced,
	emitWagerActivatedFromMinion,
} from '../events';
import { setVisualEventRendererEnabled } from '../emitter';
import { resetVisualEffectRegistry } from '../registry';
import { useCombatFeedbackStore } from '../../feedback/combatFeedbackStore';
import { cancelPokerMotionSchedules } from '@/game/effects/poker';
import { registerPokerDramaVisualEffects } from './pokerDramaHandlers';

const requestCombatDamageFloater = vi.fn();
vi.mock('../../floaters/combatDamageFloater', () => ({
	requestCombatDamageFloater: (...args: unknown[]) => requestCombatDamageFloater(...args),
	subscribeCombatDamageFloater: () => () => {},
}));

const playHandRankAnnouncement = vi.fn();
const playPhaseDramaVFX = vi.fn();
const playThorHammerVFX = vi.fn();
const playPokerSpellCast = vi.fn();
const playWagerActivate = vi.fn();
const playRaiseVFX = vi.fn();
const playRagnarokVFX = vi.fn();
const playStreakAnnouncementVFX = vi.fn();

vi.mock('../../../animations/ThorHammerVFX', () => ({
	playThorHammerVFX: (...args: unknown[]) => playThorHammerVFX(...args),
}));

vi.mock('../../animations/PokerDramaVFX', () => ({
	playHandRankAnnouncement: (...args: unknown[]) => playHandRankAnnouncement(...args),
	playPhaseDramaVFX: (...args: unknown[]) => playPhaseDramaVFX(...args),
	playRaiseVFX: (...args: unknown[]) => playRaiseVFX(...args),
	playReraiseVFX: vi.fn(),
	playCallVFX: vi.fn(),
	playClashSound: vi.fn(),
	playCheckVFX: vi.fn(),
	playFoldVFX: vi.fn(),
	playCardDealVFX: vi.fn(),
	playCardSlamSound: vi.fn(),
	playShowdownDamageVFX: vi.fn(),
	playRagnarokVFX: (...args: unknown[]) => playRagnarokVFX(...args),
	playStreakAnnouncementVFX: (...args: unknown[]) => playStreakAnnouncementVFX(...args),
	playHandImprovementVFX: vi.fn(),
	playPokerSpellCast: (...args: unknown[]) => playPokerSpellCast(...args),
	playWagerActivate: (...args: unknown[]) => playWagerActivate(...args),
	dismissCenterSlams: vi.fn(),
}));

describe('poker drama handlers — one event one FX', () => {
	let unregister: () => void;

	beforeEach(() => {
		vi.useFakeTimers();
		setVisualEventRendererEnabled(true);
		resetVisualEffectRegistry();
		useCombatFeedbackStore.getState().reset();
		playHandRankAnnouncement.mockReset();
		playPhaseDramaVFX.mockReset();
		playThorHammerVFX.mockReset();
		playPokerSpellCast.mockReset();
		playWagerActivate.mockReset();
		playRaiseVFX.mockReset();
		requestCombatDamageFloater.mockReset();
		playRagnarokVFX.mockReset();
		playStreakAnnouncementVFX.mockReset();
		unregister = registerPokerDramaVisualEffects();
	});

	afterEach(() => {
		unregister?.();
		cancelPokerMotionSchedules();
		resetVisualEffectRegistry();
		useCombatFeedbackStore.getState().reset();
		vi.useRealTimers();
	});

	it('slams only the winning hand rank', () => {
		emitHandRankAnnounced({
			side: 'player',
			rank: PokerHandRank.ODINS_EYE,
			winner: 'player',
		});
		emitHandRankAnnounced({
			side: 'opponent',
			rank: PokerHandRank.THORS_HAMMER,
			winner: 'player',
		});

		vi.advanceTimersByTime(1000);
		expect(playHandRankAnnouncement).toHaveBeenCalledTimes(1);
		expect(playHandRankAnnouncement).toHaveBeenCalledWith('Odin\'s Eye', PokerHandRank.ODINS_EYE, true, true);
		expect(playThorHammerVFX).not.toHaveBeenCalled();
	});

	it('lets RAGNAROK own the rank slot and starts LAST STAND after that read', () => {
		emitRagnarokTriggered({ side: 'player' });
		emitHandRankAnnounced({
			side: 'player',
			rank: PokerHandRank.RAGNAROK,
			winner: 'player',
		});
		emitHandRankAnnounced({
			side: 'opponent',
			rank: PokerHandRank.HIGH_CARD,
			winner: 'player',
		});
		emitStreakAnnounced({ side: 'player', streak: 0, kind: 'last_stand' });

		vi.advanceTimersByTime(1_000);
		expect(playRagnarokVFX).toHaveBeenCalledTimes(1);
		expect(playHandRankAnnouncement).not.toHaveBeenCalled();
		expect(playStreakAnnouncementVFX).not.toHaveBeenCalled();

		vi.advanceTimersByTime(3_400);
		expect(playRagnarokVFX).toHaveBeenCalledTimes(1);
		expect(playStreakAnnouncementVFX).toHaveBeenCalledWith('LAST STAND', '#e5e7eb');
	});

	it('starts DOMINATION only after the winning rank has had its slot', () => {
		for (let hand = 0; hand < 3; hand += 1) {
			emitHandRankAnnounced({
				side: 'player',
				rank: PokerHandRank.RUNE_MARK,
				winner: 'player',
			});
			emitHandRankAnnounced({
				side: 'opponent',
				rank: PokerHandRank.HIGH_CARD,
				winner: 'player',
			});
		}

		vi.advanceTimersByTime(1_000);
		expect(playHandRankAnnouncement).toHaveBeenCalledTimes(1);
		expect(playStreakAnnouncementVFX).not.toHaveBeenCalled();

		vi.advanceTimersByTime(3_400);
		expect(playStreakAnnouncementVFX).toHaveBeenCalledWith('DOMINATION', '#f5c542');
	});

	it('runs decorative phase VFX without grabbing the center-title cinema slot', () => {
		emitPhaseEntered({ phase: CombatPhase.FAITH });
		expect(useCombatFeedbackStore.getState().cinemaHolders).not.toContain('poker-cinema');
		vi.advanceTimersByTime(50);
		expect(playPhaseDramaVFX).toHaveBeenCalledWith(CombatPhase.FAITH);
	});

	it('routes spell and wager visuals with resolved presentation intent', () => {
		emitSpellCast({ effectType: 'bluff_rune', side: 'player' });
		emitWagerActivatedFromMinion('betting_round_damage', 'opponent', 'minion-9');

		vi.advanceTimersByTime(50);
		expect(playPokerSpellCast).toHaveBeenCalledWith(
			'bluff_rune',
			'player',
			expect.objectContaining({ motion: 'travel-impact', side: 'player' }),
		);
		expect(playWagerActivate).toHaveBeenCalledWith(
			'betting_round_damage',
			'opponent',
			expect.objectContaining({
				motion: 'travel-impact',
				sourceInstanceId: 'minion-9',
			}),
		);
	});

	it('stakes bets toward the risk display instead of a damage idiom', () => {
		emitBettingAction({
			phase: CombatPhase.FAITH,
			action: CombatAction.ATTACK,
			side: 'player',
			hpCommitment: 15,
		});
		vi.advanceTimersByTime(50);
		expect(playRaiseVFX).toHaveBeenCalledWith(
			true,
			expect.objectContaining({ motion: 'stake-to-pot', side: 'player' }),
		);
		expect(requestCombatDamageFloater).toHaveBeenCalledWith(
			expect.objectContaining({
				targetId: 'player-hero',
				amount: 15,
				variant: 'stake',
			}),
		);
	});
});
