import { describe, expect, it } from 'vitest';
import { VISUAL_EVENT_TYPES } from './registry';
import {
	POKER_EVENT_FX,
	pokerEventFx,
	shouldAnnounceHandRank,
} from './pokerEventFx';
import { CENTER_SLAM_GAP_MS, POKER_MOTION_SPECS } from './pokerMotionContract';

describe('poker one-event-one-FX contract', () => {
	it('maps every visual event to exactly one overlay lane', () => {
		expect(Object.keys(POKER_EVENT_FX).sort()).toEqual([...VISUAL_EVENT_TYPES].sort());
		for (const eventType of VISUAL_EVENT_TYPES) {
			const spec = pokerEventFx(eventType);
			expect(spec.event).toBe(eventType);
			expect(['cinema', 'stack', 'floater', 'zone']).toContain(spec.lane);
			expect(POKER_MOTION_SPECS[spec.motion].priority).toBe(spec.priority);
		}
	});

	it('keeps phase and winning-hand slams exclusive cinema', () => {
		expect(pokerEventFx('phaseEntered').lane).toBe('cinema');
		expect(pokerEventFx('handRankAnnounced').lane).toBe('cinema');
		expect(pokerEventFx('ragnarokTriggered').lane).toBe('cinema');
		expect(pokerEventFx('bettingAction').lane).toBe('zone');
		expect(pokerEventFx('spellCast').lane).toBe('stack');
		expect(pokerEventFx('showdownDamage').lane).toBe('floater');
	});

	it('gives each beat its own scale; phase title read lives on PhaseBanner', () => {
		expect(pokerEventFx('handImproved').motion).toBe('hand-improve');
		expect(pokerEventFx('spellCast').motion).toBe('spell-cast');
		expect(pokerEventFx('wagerActivated').motion).toBe('wager-activate');
		expect(pokerEventFx('ragnarokTriggered').motion).toBe('ragnarok-ultimate');
		expect(pokerEventFx('combatImpact').motion).toBe('combat-hit');
		expect(POKER_MOTION_SPECS['hand-improve'].zone).toBe('communityCards');
		const phase = POKER_MOTION_SPECS['phase-reveal'];
		expect(phase.enterMs + (phase.readMs ?? 0) + phase.exitMs).toBeLessThanOrEqual(1200);
		for (const intent of ['hand-rank', 'streak-announcement', 'ragnarok-ultimate'] as const) {
			const spec = POKER_MOTION_SPECS[intent];
			expect(spec.readMs).toBeGreaterThanOrEqual(3_000);
			expect(spec.enterMs + (spec.readMs ?? 0) + spec.exitMs).toBeLessThan(CENTER_SLAM_GAP_MS);
		}
	});

	it('announces only the winning hand rank (player line on a draw)', () => {
		expect(shouldAnnounceHandRank({ side: 'player', winner: 'player' })).toBe(true);
		expect(shouldAnnounceHandRank({ side: 'opponent', winner: 'player' })).toBe(false);
		expect(shouldAnnounceHandRank({ side: 'opponent', winner: 'opponent' })).toBe(true);
		expect(shouldAnnounceHandRank({ side: 'player', winner: 'draw' })).toBe(true);
		expect(shouldAnnounceHandRank({ side: 'opponent', winner: 'draw' })).toBe(false);
	});
});
