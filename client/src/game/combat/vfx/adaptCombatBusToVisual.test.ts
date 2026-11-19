import { afterEach, describe, expect, it, vi } from 'vitest';
import { CombatEventBus } from '../../services/CombatEventBus';
import { subscribeVisualEvent, setVisualEventRendererEnabled } from './emitter';
import { adaptCombatBusToVisual } from './adaptCombatBusToVisual';
import type { CombatImpactEvent } from './events';

describe('combat bus visual adapter', () => {
	afterEach(() => {
		setVisualEventRendererEnabled(true);
	});

	it('emits one primary event carrying the counter for ordered rendering', async () => {
		const seen: CombatImpactEvent[] = [];
		const unsubscribeAdapter = adaptCombatBusToVisual();
		const unsubscribeVisual = subscribeVisualEvent('combatImpact', event => seen.push(event));

		CombatEventBus.emitImpactPhase({
			attackerId: 'attacker-1',
			targetId: 'target-1',
			damageToTarget: 8,
			damageToAttacker: 3,
		});
		await Promise.resolve();

		expect(seen).toHaveLength(1);
		expect(seen[0]).toMatchObject({
			kind: 'hit',
			damage: 8,
			presentation: {
				target: { amount: 8 },
				counter: { amount: 3 },
			},
		});

		unsubscribeVisual();
		unsubscribeAdapter();
	});

	it('uses resolved event amounts when an older presentation payload is stale', async () => {
		const seen: CombatImpactEvent[] = [];
		const unsubscribeAdapter = adaptCombatBusToVisual();
		const unsubscribeVisual = subscribeVisualEvent('combatImpact', event => seen.push(event));

		CombatEventBus.emitImpactPhase({
			attackerId: 'attacker-1',
			targetId: 'target-1',
			damageToTarget: 7,
			damageToAttacker: 2,
			presentation: {
				id: 'combat-step-1',
				action: 'melee-hit',
				source: { type: 'card', instanceId: 'attacker-1' },
				attackerSide: 'player',
				target: {
					target: { type: 'card', instanceId: 'target-1' },
					amount: 1,
					healthDamage: 1,
					level: 'light',
					outcome: 'damage',
					lethal: null,
				},
				counter: {
					source: { type: 'card', instanceId: 'target-1' },
					target: { type: 'card', instanceId: 'attacker-1' },
					amount: 1,
					healthDamage: 1,
					level: 'light',
					outcome: 'damage',
					lethal: null,
				},
			},
		});
		await Promise.resolve();

		expect(seen[0]).toMatchObject({
			presentation: {
				target: { amount: 7, healthDamage: 7, level: 'normal' },
				counter: { amount: 2, healthDamage: 2, level: 'light' },
			},
		});

		unsubscribeVisual();
		unsubscribeAdapter();
	});

	it('keeps a zero-damage shield break visible as an impact outcome', async () => {
		const seen: CombatImpactEvent[] = [];
		const unsubscribeAdapter = adaptCombatBusToVisual();
		const unsubscribeVisual = subscribeVisualEvent('combatImpact', event => seen.push(event));

		CombatEventBus.emitImpactPhase({
			attackerId: 'attacker-1',
			targetId: 'target-1',
			damageToTarget: 0,
			damageToAttacker: 0,
			resolvedAttack: {
				id: 'combat-step-shield',
				attackerId: 'attacker-1',
				targetId: 'target-1',
				targetType: 'minion',
				attackerSide: 'player',
				damageToTarget: 0,
				damageToAttacker: 0,
				healthDamageToTarget: 0,
				healthDamageToAttacker: 0,
				targetHealthBefore: 5,
				targetHealthAfter: 5,
				attackerHealthBefore: 5,
				attackerHealthAfter: 5,
				targetShieldConsumed: true,
				attackerShieldConsumed: false,
				targetLethal: false,
				attackerLethal: false,
				counterAttackOccurred: false,
				triggeredEffects: [],
				statChanges: [],
				zoneChanges: [],
			},
		});
		await Promise.resolve();

		expect(seen).toHaveLength(1);
		expect(seen[0]).toMatchObject({
			damage: 0,
			presentation: { target: { amount: 0, outcome: 'shield', lethal: false } },
		});

		unsubscribeVisual();
		unsubscribeAdapter();
	});

	it('drops queued cues on teardown and keeps failed observers independent', async () => {
		const seen = vi.fn();
		const offAdapter = adaptCombatBusToVisual();
		const offFailed = subscribeVisualEvent('combatImpact', async () => { throw new Error('renderer failed'); });
		const offSeen = subscribeVisualEvent('combatImpact', seen);
		const hit = () => CombatEventBus.emitImpactPhase({
			attackerId: 'wolf', targetId: 'guard', damageToTarget: 2, damageToAttacker: 0,
		});
		try {
			hit();
			setVisualEventRendererEnabled(false);
			setVisualEventRendererEnabled(true);
			await Promise.resolve();
			expect(seen).not.toHaveBeenCalled();
			hit();
			await Promise.resolve();
			expect(seen).toHaveBeenCalledTimes(1);
			hit();
			offSeen();
			await Promise.resolve();
			expect(seen).toHaveBeenCalledTimes(1);
		} finally {
			offSeen();
			offFailed();
			offAdapter();
		}
	});
});
