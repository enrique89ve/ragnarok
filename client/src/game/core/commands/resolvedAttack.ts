import type { CardInstance, GameState } from '../../types';
import { getHealth } from '../../utils/cards/typeGuards';
import { getEffectiveAttack } from '../../utils/effects/statusEffectUtils';

export type CombatSide = 'player' | 'opponent';

export type ResolvedStatChange = {
	readonly entityId: string;
	readonly stat: 'attack';
	readonly before: number;
	readonly after: number;
};

export type ResolvedZoneChange = {
	readonly entityId: string;
	readonly from: 'battlefield';
	readonly to: 'graveyard';
};

/**
 * Gameplay-owned facts produced after an attack has been applied.
 *
 * `damageToTarget` and `damageToAttacker` are the resolved combat amounts
 * before a Divine Shield absorbs them. The health deltas are exposed
 * separately so a renderer can distinguish an impact from actual HP loss.
 * No presentation code should read CardInstance stats to reconstruct these
 * values.
 */
export type ResolvedAttack = {
	readonly id: string;
	readonly attackerId: string;
	readonly targetId: string | null;
	readonly targetType: 'hero' | 'minion';
	readonly attackerSide: CombatSide;
	readonly attackerElement?: string;
	readonly attackerKeywords?: readonly string[];
	readonly attackerRace?: string;
	readonly damageToTarget: number;
	readonly damageToAttacker: number;
	readonly healthDamageToTarget: number;
	readonly healthDamageToAttacker: number;
	readonly targetHealthBefore: number;
	readonly targetHealthAfter: number;
	readonly attackerHealthBefore: number;
	readonly attackerHealthAfter: number;
	readonly targetShieldConsumed: boolean;
	readonly attackerShieldConsumed: boolean;
	readonly targetLethal: boolean;
	readonly attackerLethal: boolean;
	readonly counterAttackOccurred: boolean;
	readonly triggeredEffects: readonly string[];
	readonly statChanges: readonly ResolvedStatChange[];
	readonly zoneChanges: readonly ResolvedZoneChange[];
};

type AttackImpact = Pick<ResolvedAttack, 'id' | 'attackerId' | 'targetId' | 'targetType' | 'attackerSide'> & {
	readonly damage: number;
	readonly counterDamage: number;
};

function cardForCombatant(
	state: GameState,
	side: CombatSide,
	type: 'hero' | 'minion',
	id: string | null,
): CardInstance | undefined {
	if (type === 'hero' || id === null) return undefined;
	return state.players?.[side]?.battlefield?.find(card => card.instanceId === id);
}

function healthForCard(card: CardInstance | undefined): number {
	if (!card) return 0;
	return card.currentHealth ?? getHealth(card.card);
}

function healthForCombatant(
	state: GameState,
	side: CombatSide,
	type: 'hero' | 'minion',
	id: string | null,
): number {
	const player = state.players?.[side];
	if (!player) return 0;
	if (type === 'hero') return player.heroHealth ?? player.health ?? 0;
	return healthForCard(cardForCombatant(state, side, type, id));
}

function shieldWasConsumed(
	beforeState: GameState,
	afterState: GameState,
	side: CombatSide,
	type: 'hero' | 'minion',
	id: string | null,
): boolean {
	if (type === 'hero') return false;
	const before = cardForCombatant(beforeState, side, type, id);
	const after = cardForCombatant(afterState, side, type, id);
	return before?.hasDivineShield === true && after?.hasDivineShield !== true;
}

function combatantIsLethal(
	state: GameState,
	side: CombatSide,
	type: 'hero' | 'minion',
	id: string | null,
): boolean {
	if (type === 'hero') return healthForCombatant(state, side, type, id) <= 0;
	const card = cardForCombatant(state, side, type, id);
	return id !== null && (!card || healthForCard(card) <= 0);
}

function attackStatChange(
	beforeState: GameState,
	afterState: GameState,
	side: CombatSide,
	id: string,
): ResolvedStatChange | null {
	const before = cardForCombatant(beforeState, side, 'minion', id);
	const after = cardForCombatant(afterState, side, 'minion', id);
	if (!before || !after) return null;
	const beforeAttack = before.currentAttack ?? getBaseAttack(before);
	const afterAttack = after.currentAttack ?? getBaseAttack(after);
	if (beforeAttack === afterAttack) return null;
	return { entityId: id, stat: 'attack', before: beforeAttack, after: afterAttack };
}

function getBaseAttack(card: CardInstance): number {
	return 'attack' in card.card && typeof card.card.attack === 'number' ? card.card.attack : 0;
}

/**
 * Builds a resolved result from the authoritative before/after states. This
 * is intentionally a pure snapshot adapter: it never mutates gameplay state
 * and it does not infer new mechanics.
 */
export function createResolvedAttackFromStates(
	beforeState: GameState,
	afterState: GameState,
	step: AttackImpact,
): ResolvedAttack {
	const defenderSide: CombatSide = step.attackerSide === 'player' ? 'opponent' : 'player';
	const targetBefore = healthForCombatant(beforeState, defenderSide, step.targetType, step.targetId);
	const targetAfter = healthForCombatant(afterState, defenderSide, step.targetType, step.targetId);
	const attackerBefore = healthForCombatant(beforeState, step.attackerSide, 'minion', step.attackerId);
	const attackerAfter = healthForCombatant(afterState, step.attackerSide, 'minion', step.attackerId);
	const targetLethal = combatantIsLethal(afterState, defenderSide, step.targetType, step.targetId);
	const attackerLethal = combatantIsLethal(afterState, step.attackerSide, 'minion', step.attackerId);
	const zoneChanges: ResolvedZoneChange[] = [];

	if (step.targetType === 'minion' && step.targetId !== null && targetLethal) {
		zoneChanges.push({ entityId: step.targetId, from: 'battlefield', to: 'graveyard' });
	}
	if (attackerLethal) {
		zoneChanges.push({ entityId: step.attackerId, from: 'battlefield', to: 'graveyard' });
	}

	const statChanges = [
		attackStatChange(beforeState, afterState, step.attackerSide, step.attackerId),
		attackStatChange(beforeState, afterState, defenderSide, step.targetId ?? ''),
	].filter((change): change is ResolvedStatChange => change !== null);

	const attackerCard = cardForCombatant(beforeState, step.attackerSide, 'minion', step.attackerId);
	const attackerElement = attackerCard && 'element' in attackerCard.card && typeof attackerCard.card.element === 'string'
		? attackerCard.card.element
		: undefined;
	const attackerKeywords = attackerCard?.card.keywords;
	const attackerRace = attackerCard && 'race' in attackerCard.card && typeof attackerCard.card.race === 'string'
		? attackerCard.card.race
		: undefined;

	return {
		id: step.id,
		attackerId: step.attackerId,
		targetId: step.targetId,
		targetType: step.targetType,
		attackerSide: step.attackerSide,
		...(attackerElement ? { attackerElement } : {}),
		...(attackerKeywords && attackerKeywords.length > 0 ? { attackerKeywords: [...attackerKeywords] } : {}),
		...(attackerRace ? { attackerRace } : {}),
		damageToTarget: Math.max(0, step.damage),
		damageToAttacker: Math.max(0, step.counterDamage),
		healthDamageToTarget: Math.max(0, targetBefore - targetAfter),
		healthDamageToAttacker: Math.max(0, attackerBefore - attackerAfter),
		targetHealthBefore: targetBefore,
		targetHealthAfter: targetAfter,
		attackerHealthBefore: attackerBefore,
		attackerHealthAfter: attackerAfter,
		targetShieldConsumed: shieldWasConsumed(beforeState, afterState, defenderSide, step.targetType, step.targetId),
		attackerShieldConsumed: shieldWasConsumed(beforeState, afterState, step.attackerSide, 'minion', step.attackerId),
		targetLethal,
		attackerLethal,
		counterAttackOccurred: step.targetType === 'minion' && step.counterDamage > 0,
		triggeredEffects: [],
		statChanges,
		zoneChanges,
	};
}

export function describeCardAttack(
	beforeState: GameState,
	afterState: GameState,
	attacker: CardInstance,
	defender: CardInstance | undefined,
	attackerSide: CombatSide,
	id: string,
): ResolvedAttack {
	return createResolvedAttackFromStates(beforeState, afterState, {
		id,
		attackerId: attacker.instanceId,
		targetId: defender?.instanceId ?? null,
		targetType: defender ? 'minion' : 'hero',
		damage: getEffectiveAttack(attacker),
		counterDamage: defender ? getEffectiveAttack(defender) : 0,
		attackerSide,
	});
}
