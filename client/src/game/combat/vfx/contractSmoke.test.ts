import { describe, expect, it } from 'vitest';
import {
	emitBettingAction,
	emitCommunityCardRevealed,
	emitHandImproved,
	emitHandRankAnnounced,
	emitPhaseEntered,
	emitRagnarokTriggered,
	emitShowdownDamage,
	emitStreakAnnounced,
	visualEventTypeOf,
	type VisualEvent,
} from './events';
import {
	isVisualEventRendererEnabled,
	setVisualEventRendererEnabled,
	subscribeAllVisualEvents,
	subscribeVisualEvent,
} from './emitter';
import { CombatAction, CombatPhase, PokerHandRank } from '../../types/PokerCombatTypes';

describe('visual event contract smoke', () => {
	it('dispatches typed events and silences in headless mode', async () => {
		const seen: VisualEvent[] = [];
		const seenBets: string[] = [];
		setVisualEventRendererEnabled(true);

		const unsubscribeAll = subscribeAllVisualEvents(event => seen.push(event));
		const unsubscribeBets = subscribeVisualEvent('bettingAction', event => {
			seenBets.push(`${event.side}:${event.action}:${event.phase}`);
		});

		emitBettingAction({ phase: CombatPhase.PRE_FLOP, action: CombatAction.ATTACK, side: 'player', hpCommitment: 10 });
		await Promise.resolve();
		expect(seen).toHaveLength(1);
		expect(seenBets).toHaveLength(1);
		expect(visualEventTypeOf(seen[0])).toBe('bettingAction');

		const showdown = emitShowdownDamage({ winner: 'player', damage: 20 });
		expect(showdown.target).toBe('opponent-hero');
		await Promise.resolve();
		expect(seen).toHaveLength(2);
		expect(seenBets).toHaveLength(1);

		setVisualEventRendererEnabled(false);
		expect(isVisualEventRendererEnabled()).toBe(false);
		emitBettingAction({ phase: CombatPhase.FAITH, action: CombatAction.BRACE, side: 'opponent' });
		await Promise.resolve();
		expect(seen).toHaveLength(2);

		setVisualEventRendererEnabled(true);
		unsubscribeAll();
		unsubscribeBets();
		emitBettingAction({ phase: CombatPhase.DESTINY, action: CombatAction.DEFEND, side: 'player' });
		await Promise.resolve();
		expect(seen).toHaveLength(2);
	});

	it('carries the extended showdown/reveal/phase payloads', async () => {
		const seen: VisualEvent[] = [];
		setVisualEventRendererEnabled(true);
		const unsubscribeAll = subscribeAllVisualEvents(event => seen.push(event));

		emitCommunityCardRevealed({
			phase: CombatPhase.FAITH,
			slotIndex: 1,
			card: { suit: 'hearts', value: 'K', numericValue: 13 },
		});
		emitPhaseEntered({ phase: CombatPhase.RESOLUTION });
		emitHandRankAnnounced({
			side: 'player',
			rank: PokerHandRank.RAGNAROK,
			winner: 'player',
		});
		emitRagnarokTriggered({ side: 'player' });
		emitShowdownDamage({ winner: 'opponent', damage: 12, isLethal: true });
		emitStreakAnnounced({ side: 'opponent', streak: 3, kind: 'win' });
		emitHandImproved({ tier: 'godly', rank: PokerHandRank.THORS_HAMMER, side: 'player' });

		await Promise.resolve();
		expect(seen).toHaveLength(7);
		expect(seen.map(event => event.type)).toEqual([
			'communityCardRevealed',
			'phaseEntered',
			'handRankAnnounced',
			'ragnarokTriggered',
			'showdownDamage',
			'streakAnnounced',
			'handImproved',
		]);

		const revealed = seen[0] as Extract<VisualEvent, { type: 'communityCardRevealed' }>;
		expect(revealed.phase).toBe(CombatPhase.FAITH);
		expect(revealed.slotIndex).toBe(1);

		const damage = seen[4] as Extract<VisualEvent, { type: 'showdownDamage' }>;
		expect(damage.isLethal).toBe(true);
		expect(damage.target).toBe('player-hero');

		unsubscribeAll();
	});
});
