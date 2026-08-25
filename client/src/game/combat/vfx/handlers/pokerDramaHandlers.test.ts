import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CombatPhase, PokerHandRank } from '../../../types/PokerCombatTypes';
import { emitHandRankAnnounced, emitPhaseEntered } from '../events';
import { setVisualEventRendererEnabled } from '../emitter';
import { resetVisualEffectRegistry } from '../registry';
import { useCombatFeedbackStore } from '../../feedback/combatFeedbackStore';
import { cancelPokerMotionSchedules } from '@/game/effects/poker';
import { registerPokerDramaVisualEffects } from './pokerDramaHandlers';

const playHandRankAnnouncement = vi.fn();
const playPhaseDramaVFX = vi.fn();
const playThorHammerVFX = vi.fn();

vi.mock('../../../animations/ThorHammerVFX', () => ({
	playThorHammerVFX: (...args: unknown[]) => playThorHammerVFX(...args),
}));

vi.mock('../../animations/PokerDramaVFX', () => ({
	playHandRankAnnouncement: (...args: unknown[]) => playHandRankAnnouncement(...args),
	playPhaseDramaVFX: (...args: unknown[]) => playPhaseDramaVFX(...args),
	playRaiseVFX: vi.fn(),
	playReraiseVFX: vi.fn(),
	playCallVFX: vi.fn(),
	playClashSound: vi.fn(),
	playCheckVFX: vi.fn(),
	playFoldVFX: vi.fn(),
	playCardDealVFX: vi.fn(),
	playCardSlamSound: vi.fn(),
	playShowdownDamageVFX: vi.fn(),
	playRagnarokVFX: vi.fn(),
	playStreakAnnouncementVFX: vi.fn(),
	playHandImprovementVFX: vi.fn(),
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

	it('holds cinema so the stack waits during a phase slam', () => {
		emitPhaseEntered({ phase: CombatPhase.FAITH });
		expect(useCombatFeedbackStore.getState().cinemaHolders).toContain('poker-cinema');
		vi.advanceTimersByTime(50);
		expect(playPhaseDramaVFX).toHaveBeenCalledWith(CombatPhase.FAITH);
	});
});
