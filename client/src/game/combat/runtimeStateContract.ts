/**
 * Runtime state contract shared by the battlefield and card inspector.
 *
 * This is presentation metadata only. Gameplay owns the fields on
 * CardInstance; this module translates those resolved facts into stable
 * state ids, labels, and counters for UI consumers.
 */

import type { CardInstance } from '../types';
import { hasKeyword } from '../utils/cards/keywordUtils';

export type RuntimeStateId =
	| 'ready'
	| 'summoning_sick'
	| 'exhausted'
	| 'divine_shield'
	| 'stealth'
	| 'taunt'
	| 'frozen'
	| 'burning'
	| 'poisoned'
	| 'bleeding'
	| 'paralyzed'
	| 'weakened'
	| 'vulnerable'
	| 'marked'
	| 'dormant'
	| 'submerged'
	| 'coiled'
	| 'evolution_ready'
	| 'ragnarok_chain';

export interface RuntimeStateDefinition {
	readonly id: RuntimeStateId;
	readonly name: string;
	readonly description: string;
	readonly isActive: (
		card: CardInstance,
		keywords: ReadonlySet<string>,
	) => boolean;
	readonly value?: (card: CardInstance) => string | undefined;
}

export const MAX_EINHERJAR_RETURNS = 3;

const withTurns = (turns: number | undefined): string | undefined => {
	if (turns === undefined) return undefined;
	return `${turns} turn${turns === 1 ? '' : 's'} remaining`;
};

/** Charge and Rush are the two current exceptions to summoning sickness. */
export const hasEffectiveSummoningSickness = (card: CardInstance): boolean =>
	card.isSummoningSick === true && !hasKeyword(card, 'charge') && !hasKeyword(card, 'rush');

/**
 * Exhausted is only a spent attack, not every reason that canAttack is false.
 * Frozen, Dormant, Submerged, Coil, and summoning sickness have their own
 * state contract and must not be mislabeled as "Already attacked".
 */
export const hasExhaustedCombatState = (card: CardInstance): boolean =>
	card.card.type === 'minion' &&
	card.canAttack === false &&
	(card.attacksPerformed ?? 0) > 0 &&
	!hasEffectiveSummoningSickness(card) &&
	card.isFrozen !== true &&
	card.isDormant !== true &&
	card.isSubmerged !== true &&
	!card.coiledBy;

export const getEinherjarReturnsRemaining = (card: CardInstance): number | undefined => {
	if (!hasKeyword(card, 'einherjar')) return undefined;
	return Math.max(0, MAX_EINHERJAR_RETURNS - (card.einherjarGeneration ?? 0));
};

const runtimeStateDefinitions: readonly RuntimeStateDefinition[] = [
	{
		id: 'ready',
		name: 'Ready to attack',
		description: 'This unit can be selected as an attacker now.',
		isActive: card =>
			card.canAttack === true &&
			!hasEffectiveSummoningSickness(card) &&
			card.isFrozen !== true &&
			card.isDormant !== true &&
			card.isSubmerged !== true &&
			!card.coiledBy,
	},
	{
		id: 'summoning_sick',
		name: 'Summoning sickness',
		description: 'Cannot attack on the turn it enters play.',
		isActive: card => hasEffectiveSummoningSickness(card),
	},
	{
		id: 'exhausted',
		name: 'Exhausted',
		description: 'Has used its available attacks this turn.',
		isActive: card => hasExhaustedCombatState(card),
	},
	{
		id: 'divine_shield',
		name: 'Divine Shield',
		description: 'Absorbs the next source of damage.',
		isActive: card => card.hasDivineShield === true,
	},
	{
		id: 'stealth',
		name: 'Stealth',
		description: 'Cannot be targeted until the protection is broken.',
		isActive: card => card.isStealth === true,
	},
	{
		id: 'taunt',
		name: 'Taunt',
		description: 'Enemies must attack this unit before other targets.',
		isActive: (card, keywords) => card.isTaunt === true || keywords.has('taunt'),
	},
	{
		id: 'frozen',
		name: 'Frozen',
		description: 'Cannot attack while frozen.',
		isActive: card => card.isFrozen === true,
	},
	{
		id: 'burning',
		name: 'Burning',
		description: 'Has increased attack and takes self-damage.',
		isActive: card => card.isBurning === true,
	},
	{
		id: 'poisoned',
		name: 'Poisoned',
		description: 'Takes damage at the start of its turn.',
		isActive: card => card.isPoisonedDoT === true,
	},
	{
		id: 'bleeding',
		name: 'Bleeding',
		description: 'Takes additional damage when damaged.',
		isActive: card => card.isBleeding === true,
	},
	{
		id: 'paralyzed',
		name: 'Paralyzed',
		description: 'Has a chance to fail actions.',
		isActive: card => card.isParalyzed === true,
	},
	{
		id: 'weakened',
		name: 'Weakened',
		description: 'Current attack is reduced.',
		isActive: card => card.isWeakened === true,
	},
	{
		id: 'vulnerable',
		name: 'Vulnerable',
		description: 'Takes additional damage from all sources.',
		isActive: card => card.isVulnerable === true,
	},
	{
		id: 'marked',
		name: 'Marked',
		description: 'Can be targeted through stealth and protection.',
		isActive: card => card.isMarked === true,
	},
	{
		id: 'dormant',
		name: 'Dormant',
		description: 'Cannot act or be targeted until it awakens.',
		isActive: card => card.isDormant === true,
		value: card => withTurns(card.dormantTurnsLeft),
	},
	{
		id: 'submerged',
		name: 'Submerged',
		description: 'Hidden and untargetable until it surfaces.',
		isActive: card => card.isSubmerged === true,
		value: card => withTurns(card.submergeTurnsLeft),
	},
	{
		id: 'coiled',
		name: 'Coiled',
		description: 'Attack is locked while the coil source remains in play.',
		isActive: card => typeof card.coiledBy === 'string' && card.coiledBy.length > 0,
	},
	{
		id: 'evolution_ready',
		name: 'Evolution ready',
		description: 'The evolution condition has been completed.',
		isActive: card => card.petEvolutionMet === true,
	},
	{
		id: 'ragnarok_chain',
		name: 'Ragnarok Chain',
		description: 'The linked partner is currently present on the battlefield.',
		isActive: card => typeof card.chainPartnerInstanceId === 'string' && card.chainPartnerInstanceId.length > 0,
	},
];

export const RUNTIME_STATE_DEFINITIONS = runtimeStateDefinitions;

export const getRuntimeStateDefinition = (stateId: RuntimeStateId): RuntimeStateDefinition | undefined =>
	runtimeStateDefinitions.find(state => state.id === stateId);

const getKeywordSet = (card: CardInstance): ReadonlySet<string> =>
	new Set((card.instanceKeywords ?? card.card.keywords ?? []).map(keyword => keyword.toLowerCase()));

export function isRuntimeStateActive(
	card: CardInstance,
	stateId: RuntimeStateId,
): boolean {
	const definition = runtimeStateDefinitions.find(state => state.id === stateId);
	return definition?.isActive(card, getKeywordSet(card)) ?? false;
}

export function getActiveRuntimeStates(
	card: CardInstance,
): readonly RuntimeStateDefinition[] {
	const keywords = getKeywordSet(card);
	return runtimeStateDefinitions.filter(state => state.isActive(card, keywords));
}
