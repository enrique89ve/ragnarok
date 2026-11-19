import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedAttack } from '../core/commands/resolvedAttack';
import type { MatchContext } from '../match/types';
import { CombatEventBus, type ImpactPhaseEvent } from '../services/CombatEventBus';
import { useAIAttackAnimationStore } from '../stores/aiAttackAnimationStore';
import { publishAIAttackImpact } from './aiAttackPresentation';

const heroHit: ResolvedAttack = {
	id: 'ai-hit',
	attackerId: 'draugr',
	targetId: null,
	targetType: 'hero',
	attackerSide: 'opponent',
	damageToTarget: 4,
	damageToAttacker: 0,
	healthDamageToTarget: 3,
	healthDamageToAttacker: 0,
	targetHealthBefore: 20,
	targetHealthAfter: 17,
	attackerHealthBefore: 3,
	attackerHealthAfter: 3,
	targetShieldConsumed: false,
	attackerShieldConsumed: false,
	targetLethal: false,
	attackerLethal: false,
	counterAttackOccurred: false,
	triggeredEffects: [],
	statChanges: [],
	zoneChanges: [],
};

const localMatch: MatchContext = {
	matchId: 'local-test',
	matchSeed: 'local-seed',
	opponent: { kind: 'ai', difficulty: 'normal', deckSource: 'default' },
	reward: { matchXp: { kind: 'none' }, rune: { kind: 'none' }, ranking: { kind: 'none' } },
};

afterEach(() => useAIAttackAnimationStore.getState().clearAll());

describe('AI attack presentation', () => {
	it('publishes the resolved hero hit and its health delta', () => {
		const listener = vi.fn<(event: ImpactPhaseEvent) => void>();
		const unsubscribe = CombatEventBus.subscribe<ImpactPhaseEvent>('IMPACT_PHASE', listener);
		try {
			publishAIAttackImpact(heroHit);

			expect(listener).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
				attackerId: 'draugr',
				targetId: 'player-hero',
				damageToTarget: 4,
				damageToAttacker: 0,
				resolvedAttack: heroHit,
				presentation: expect.objectContaining({
					target: expect.objectContaining({
						target: { type: 'hero', side: 'player' },
						healthDamage: 3,
					}),
				}),
			}));
		} finally {
			unsubscribe();
		}
	});

	it('drops queued visuals on a match change', () => {
		const newMatch = { ...localMatch, matchId: 'new-match' };
		const queue = useAIAttackAnimationStore.getState();
		queue.queueResolvedAttacks(localMatch, [heroHit]);

		expect(queue.startAnimation(newMatch)).toBeNull();
		expect(useAIAttackAnimationStore.getState().pendingAttacks).toEqual([]);
	});

	it('allows only one visual consumer and ignores stale completion', () => {
		const nextHit = { ...heroHit, id: 'next-hit' };
		const queue = useAIAttackAnimationStore.getState();
		queue.queueResolvedAttacks(localMatch, [heroHit, nextHit]);

		const first = queue.startAnimation(localMatch);
		if (!first) throw new Error('Expected the first attack');
		expect(first.resolvedAttack).toBe(heroHit);
		expect(queue.startAnimation(localMatch)).toBeNull();
		queue.completeAnimation(first);

		const second = queue.startAnimation(localMatch);
		expect(second?.resolvedAttack).toBe(nextHit);
		queue.completeAnimation(first);
		expect(useAIAttackAnimationStore.getState().currentAttack).toBe(second);
	});
});
