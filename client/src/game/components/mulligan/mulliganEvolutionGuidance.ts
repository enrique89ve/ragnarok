export interface MulliganEvolutionCard {
	readonly petStage?: string;
	readonly petFamily?: string;
	readonly evolvesFromName?: string;
}

export interface MulliganEvolutionGuidance {
	readonly stage: 'adept' | 'master';
	readonly label: 'Evolution locked';
	readonly prerequisite: string;
	readonly recommendation: 'Replace for your opening hand';
	readonly ariaDescription: string;
}

export function getMulliganEvolutionGuidance(
	card: MulliganEvolutionCard,
): MulliganEvolutionGuidance | null {
	if (card.petStage !== 'adept' && card.petStage !== 'master') {
		return null;
	}

	const prerequisite = card.evolvesFromName
		? `Needs ${card.evolvesFromName} in play`
		: card.petStage === 'adept'
			? 'Needs its Basic form in play'
			: `Needs an Adept ${card.petFamily ? `${card.petFamily} pet` : 'pet'} in play`;
	const recommendation = 'Replace for your opening hand' as const;

	return {
		stage: card.petStage,
		label: 'Evolution locked',
		prerequisite,
		recommendation,
		ariaDescription: `Evolution locked. ${prerequisite}. ${recommendation}.`,
	};
}
