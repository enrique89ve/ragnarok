/**
 * Handler for applying status effects on attack
 */
import { CardInstance } from '../../types/CardTypes';
import { applyStatusEffect, StatusEffectType, STATUS_EFFECTS } from '../../utils/effects/statusEffectUtils';
import { fireAnnouncement } from '../../stores/unifiedUIStore';

export function processOnAttackStatusEffect(
  attacker: CardInstance,
  target: CardInstance
): CardInstance {
  const onAttack = (attacker.card as any).onAttack;

  if (!onAttack || onAttack.type !== 'apply_status') {
    return target;
  }

  const statusEffect = onAttack.statusEffect as StatusEffectType;
  if (!statusEffect) {
    return target;
  }

  const meta = STATUS_EFFECTS[statusEffect];
  if (meta) {
    fireAnnouncement('status_effect', `${meta.icon} ${meta.name}`, {
      subtitle: `${target.card?.name ?? 'Target'} — ${meta.description}`,
      duration: 1500
    });
  }

  return applyStatusEffect(target, statusEffect);
}
