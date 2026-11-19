import type { ResolvedAttack } from '../core/commands/resolvedAttack';
import { buildCombatPresentationFromResolvedAttack } from '../effects/presentation/CombatPresentation';
import { CombatEventBus } from '../services/CombatEventBus';

export function publishAIAttackImpact(resolvedAttack: ResolvedAttack): void {
	const targetId = resolvedAttack.targetType === 'hero'
		? (resolvedAttack.attackerSide === 'opponent' ? 'player-hero' : 'opponent-hero')
		: resolvedAttack.targetId;
	if (!targetId) return;

	CombatEventBus.emitImpactPhase({
		attackerId: resolvedAttack.attackerId,
		targetId,
		damageToTarget: resolvedAttack.damageToTarget,
		damageToAttacker: resolvedAttack.damageToAttacker,
		resolvedAttack,
		presentation: buildCombatPresentationFromResolvedAttack(resolvedAttack),
	});
}
