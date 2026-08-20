/**
 * Adapt Battlecry Handler
 *
 * Presents random adaptations from a fixed pool and applies one per roll.
 * Keywords go through addKeyword so combat reads them without `as any` flags.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { cardsRng } from '../../../utils/cardsCommandRng';
import { addKeyword } from '../../../utils/cards/keywordUtils';
import { shuffleArray } from '../../../utils/seededRng';

export const ADAPTATION_IDS = [
	'crackling_shield',
	'flaming_claws',
	'living_spores',
	'lightning_speed',
	'massive',
	'poison_spit',
	'rocky_carapace',
	'shrouding_mist',
	'volcanic_might',
	'liquid_membrane',
] as const;

export type AdaptationId = typeof ADAPTATION_IDS[number];

type AdaptationOption = {
	readonly id: AdaptationId;
	readonly name: string;
	readonly description: string;
	readonly apply: (state: CardInstance) => void;
};

function bumpAttack(state: CardInstance, amount: number): void {
	state.currentAttack = (state.currentAttack ?? state.card.attack ?? 0) + amount;
}

function bumpHealth(state: CardInstance, amount: number): void {
	state.currentHealth = (state.currentHealth ?? state.card.health ?? 0) + amount;
}

export const ADAPTATION_OPTIONS: readonly AdaptationOption[] = [
	{
		id: 'crackling_shield',
		name: 'Crackling Shield',
		description: 'Divine Shield',
		apply: (state) => {
			state.hasDivineShield = true;
			addKeyword(state, 'divine_shield');
		},
	},
	{
		id: 'flaming_claws',
		name: 'Flaming Claws',
		description: '+3 Attack',
		apply: (state) => bumpAttack(state, 3),
	},
	{
		id: 'living_spores',
		name: 'Living Spores',
		description: 'Deathrattle: Summon two 1/1 Plants',
		apply: (state) => addKeyword(state, 'deathrattle'),
	},
	{
		id: 'lightning_speed',
		name: 'Lightning Speed',
		description: 'Windfury',
		apply: (state) => addKeyword(state, 'windfury'),
	},
	{
		id: 'massive',
		name: 'Massive',
		description: 'Taunt',
		apply: (state) => addKeyword(state, 'taunt'),
	},
	{
		id: 'poison_spit',
		name: 'Poison Spit',
		description: 'Poisonous',
		apply: (state) => {
			state.isPoisonous = true;
			addKeyword(state, 'poisonous');
		},
	},
	{
		id: 'rocky_carapace',
		name: 'Rocky Carapace',
		description: '+3 Health',
		apply: (state) => bumpHealth(state, 3),
	},
	{
		id: 'shrouding_mist',
		name: 'Shrouding Mist',
		description: 'Stealth until your next turn',
		apply: (state) => addKeyword(state, 'stealth'),
	},
	{
		id: 'volcanic_might',
		name: 'Volcanic Might',
		description: '+1/+1',
		apply: (state) => {
			bumpAttack(state, 1);
			bumpHealth(state, 1);
		},
	},
	{
		id: 'liquid_membrane',
		name: 'Liquid Membrane',
		description: "Can't be targeted by spells or Hero Powers",
		apply: (state) => addKeyword(state, 'elusive'),
	},
];

function makeFallbackInstance(sourceCard: Card): CardInstance {
	return {
		instanceId: `adapt-${sourceCard.id}`,
		card: sourceCard,
		canAttack: false,
		isPlayed: true,
		isSummoningSick: false,
		attacksPerformed: 0,
	};
}

export default function executeAdapt(
	context: GameContext,
	effect: BattlecryEffect,
	sourceCard: Card,
): EffectResult {
	try {
		context.logGameEvent(`Executing battlecry:adapt for ${sourceCard.name}`);

		const targetType = effect.targetType || 'self';
		const adaptCount = effect.adaptCount || 1;
		const fallback = makeFallbackInstance(sourceCard);

		let targets: CardInstance[];
		if (targetType === 'self') {
			const friendlyMinions = context.getFriendlyMinions();
			const selfMinion = friendlyMinions.find(m => m.card.id === sourceCard.id);
			targets = selfMinion ? [selfMinion] : [fallback];
		} else {
			targets = context.getTargets(targetType, fallback);
		}

		if (targets.length === 0) {
			context.logGameEvent('No valid targets for adapt');
			return { success: false, error: 'No valid targets for adapt' };
		}

		const target = targets[0];
		const appliedAdaptations: AdaptationId[] = [];

		for (let i = 0; i < adaptCount; i++) {
			const availableOptions = ADAPTATION_OPTIONS.filter(o => !appliedAdaptations.includes(o.id));
			const presentedOptions = shuffleArray(availableOptions, cardsRng).slice(0, 3);
			if (presentedOptions.length === 0) {
				context.logGameEvent('No more adaptations available');
				break;
			}

			const selectedOption = presentedOptions[Math.floor(cardsRng() * presentedOptions.length)];
			if (!selectedOption) continue;

			selectedOption.apply(target);
			appliedAdaptations.push(selectedOption.id);
			context.logGameEvent(
				`${sourceCard.name} adapted ${target.card.name} with ${selectedOption.name}: ${selectedOption.description}`,
			);
		}

		return {
			success: true,
			additionalData: {
				appliedAdaptations,
				target: target.card.name,
			},
		};
	} catch (error) {
		debug.error('Error executing battlecry:adapt:', error);
		return {
			success: false,
			error: `Error executing battlecry:adapt: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}
