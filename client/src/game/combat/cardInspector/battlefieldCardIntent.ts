export type BattlefieldCardSide = 'player' | 'opponent';
export type BattlefieldCardClickIntent = 'gameplay' | 'inspect';

export interface BattlefieldCardClickContext {
	readonly side: BattlefieldCardSide;
	readonly isPlayerTurn: boolean;
	readonly cardCanAttack: boolean;
	readonly cardIsSummoningSick: boolean;
	readonly cardIsFrozen: boolean;
	readonly hasSelectedAttacker: boolean;
	readonly hasSelectedHandCard: boolean;
	readonly isHeroPowerTargeting: boolean;
	readonly isInteractionDisabled: boolean;
}

export function resolveBattlefieldCardClickIntent(context: BattlefieldCardClickContext): BattlefieldCardClickIntent {
	if (context.isInteractionDisabled) return 'inspect';
	if (!context.isPlayerTurn) return 'inspect';
	if (context.isHeroPowerTargeting || context.hasSelectedHandCard || context.hasSelectedAttacker) return 'gameplay';
	if (
		context.side === 'player' &&
		context.cardCanAttack &&
		!context.cardIsSummoningSick &&
		!context.cardIsFrozen
	) {
		return 'gameplay';
	}
	return 'inspect';
}
