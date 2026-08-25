import type { PokerActionOrigin } from '../p2p-wire/combat';

export type PokerDecisionAction = 'attack' | 'counter' | 'engage' | 'brace' | 'defend';

export function derivePokerTimeoutAction(input: Readonly<{ hasBetToCall: boolean }>): 'brace' | 'defend' {
	return input.hasBetToCall ? 'brace' : 'defend';
}

export function deriveDefendStaminaAfterAction(input: Readonly<{
	action: PokerDecisionAction;
	origin: PokerActionOrigin;
	currentStamina: number;
	maxStamina: number;
}>): number {
	if (input.action !== 'defend' || input.origin === 'timeout') return input.currentStamina;
	return Math.min(input.maxStamina, input.currentStamina + 1);
}
