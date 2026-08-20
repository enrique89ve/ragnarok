export type BettingMatchKind = 'call' | 'check';
export type BettingCommitKind = 'bet' | 'raise';
export type BettingActionKind = BettingCommitKind | BettingMatchKind | 'fold' | 'all_in' | 'frontline';

export const BETTING_ACTION_LABEL = {
	bet: 'Bet',
	raise: 'Raise',
	call: 'Call',
	check: 'Check',
	fold: 'Fold',
	frontline: 'Frontline',
	all_in: 'All in',
} as const satisfies Record<BettingActionKind, string>;

export type BettingDisabledCause =
	| { readonly kind: 'waiting_opponent' }
	| { readonly kind: 'need_min_bet'; readonly minBet: number }
	| { readonly kind: 'not_enough_hp_to_raise' }
	| { readonly kind: 'need_stamina_to_call'; readonly toCall: number }
	| { readonly kind: 'cannot_call'; readonly toCall: number }
	| { readonly kind: 'cannot_check' }
	| { readonly kind: 'nothing_to_fold' };

export function pokerQuickBetHp(input: {
	readonly pct: number;
	readonly maxBetAmount: number;
	readonly minBet: number;
}): number {
	if (input.maxBetAmount <= 0) return 0;
	const floor = Math.max(1, input.minBet);
	const raw = Math.floor(input.maxBetAmount * input.pct);
	return Math.min(input.maxBetAmount, Math.max(floor, raw));
}

export function bettingCommitKind(hasBetToCall: boolean): BettingCommitKind {
	return hasBetToCall ? 'raise' : 'bet';
}

export function bettingMatchKind(hasBetToCall: boolean): BettingMatchKind {
	return hasBetToCall ? 'call' : 'check';
}

export function bettingDisabledCause(input: {
	readonly isMyTurn: boolean;
	readonly kind: BettingActionKind;
	readonly allowed: boolean;
	readonly availableHP: number;
	readonly toCall: number;
	readonly minBet: number;
}): BettingDisabledCause | null {
	if (!input.isMyTurn) return { kind: 'waiting_opponent' };
	if (input.allowed) return null;
	if (input.kind === 'all_in' || input.kind === 'raise' || input.kind === 'bet') {
		if (input.availableHP < input.minBet) {
			return { kind: 'need_min_bet', minBet: input.minBet };
		}
		return { kind: 'not_enough_hp_to_raise' };
	}
	if (input.kind === 'call') {
		if (input.availableHP <= 0) {
			return { kind: 'need_stamina_to_call', toCall: input.toCall };
		}
		return { kind: 'cannot_call', toCall: input.toCall };
	}
	if (input.kind === 'check') return { kind: 'cannot_check' };
	if (input.kind === 'frontline') return { kind: 'waiting_opponent' };
	return { kind: 'nothing_to_fold' };
}

export function bettingDisabledCopy(cause: BettingDisabledCause): string {
	switch (cause.kind) {
		case 'waiting_opponent':
			return 'Waiting for the opponent.';
		case 'need_min_bet':
			return `Need ${cause.minBet} HP of stamina to bet.`;
		case 'not_enough_hp_to_raise':
			return 'Not enough HP left to raise.';
		case 'need_stamina_to_call':
			return `Need stamina to call ${cause.toCall} HP. Fold is still open.`;
		case 'cannot_call':
			return `Cannot call ${cause.toCall} HP.`;
		case 'cannot_check':
			return 'Cannot check while a bet is open.';
		case 'nothing_to_fold':
			return 'Nothing to fold.';
	}
}

export function bettingDisabledReason(input: Parameters<typeof bettingDisabledCause>[0]): string | null {
	const cause = bettingDisabledCause(input);
	return cause ? bettingDisabledCopy(cause) : null;
}
