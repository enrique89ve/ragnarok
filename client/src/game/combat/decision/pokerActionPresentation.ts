import { CombatAction } from '../../types/PokerCombatTypes';
import { getPokerActionDefinition } from './pokerActionCatalog';

export type PokerActionActor = 'player' | 'opponent';
export type PokerActionPopupTarget = 'player' | 'opponent' | 'both';

export interface PokerActionPresentation {
	readonly showPopup: boolean;
	readonly action: CombatAction;
	readonly target: PokerActionPopupTarget;
	readonly text: string;
	readonly subtitle: string;
}

export const POKER_AI_ACTION_SETTLE_DELAY_MS = 1200;

export function getPokerActionPresentation(input: {
	readonly actor: PokerActionActor;
	readonly action: CombatAction;
	readonly amount?: number;
	readonly actorName?: string;
}): PokerActionPresentation {
	const actorName = input.actorName?.trim() || (input.actor === 'player' ? 'You' : 'Enemy');
	const target: PokerActionPopupTarget = input.actor === 'player' ? 'player' : 'opponent';
	const showPopup = input.actor === 'opponent' || isMajorPlayerAction(input.action);
	const context: PokerActionPresentationContext = { ...input, actorName, target, showPopup };

	switch (input.action) {
		case CombatAction.ATTACK:
			return getAttackPresentation(context);
		case CombatAction.COUNTER_ATTACK:
			return getCounterAttackPresentation(context);
		case CombatAction.ENGAGE:
			return getEngagePresentation(context);
		case CombatAction.DEFEND:
			return getDefendPresentation(context);
		case CombatAction.BRACE:
			return getBracePresentation(context);
	}
}

interface PokerActionPresentationContext {
	readonly actor: PokerActionActor;
	readonly actorName: string;
	readonly amount?: number;
	readonly target: PokerActionPopupTarget;
	readonly showPopup: boolean;
}

function getAttackPresentation(context: PokerActionPresentationContext): PokerActionPresentation {
	return {
		showPopup: context.showPopup,
		action: CombatAction.ATTACK,
		target: context.target,
		text: context.actor === 'player'
			? formatAmount('You commit', context.amount)
			: formatAmount(`${context.actorName} commits`, context.amount),
		subtitle: context.actor === 'player' ? 'Enemy must answer' : 'Your response',
	};
}

function getCounterAttackPresentation(context: PokerActionPresentationContext): PokerActionPresentation {
	return {
		showPopup: context.showPopup,
		action: CombatAction.COUNTER_ATTACK,
		target: context.target,
		text: context.actor === 'player'
			? formatAmount('You raise', context.amount)
			: formatAmount(`${context.actorName} raises`, context.amount),
		subtitle: context.actor === 'player' ? 'Enemy must answer' : 'Your response',
	};
}

function getEngagePresentation(context: PokerActionPresentationContext): PokerActionPresentation {
	return {
		showPopup: context.showPopup,
		action: CombatAction.ENGAGE,
		target: context.target,
		text: context.actor === 'player' ? 'You match the stake' : `${context.actorName} matches the stake`,
		subtitle: 'Round can close',
	};
}

function getDefendPresentation(context: PokerActionPresentationContext): PokerActionPresentation {
	return {
		showPopup: context.showPopup,
		action: CombatAction.DEFEND,
		target: context.target,
		text: context.actor === 'player' ? 'You check' : `${context.actorName} checks`,
		subtitle: context.actor === 'player' ? '+1 STA' : 'Round can close',
	};
}

function getBracePresentation(context: PokerActionPresentationContext): PokerActionPresentation {
	return {
		showPopup: context.showPopup,
		action: CombatAction.BRACE,
		target: context.target,
		text: context.actor === 'player' ? 'You brace' : `${context.actorName} braces`,
		subtitle: context.actor === 'player' ? 'You yield this hand' : 'Enemy yields this hand',
	};
}

function isMajorPlayerAction(action: CombatAction): boolean {
	return getPokerActionDefinition(action).showForPlayer;
}

function formatAmount(prefix: string, amount: number | undefined): string {
	if (!amount || amount <= 0) return prefix;
	return `${prefix} ${amount} HP`;
}
