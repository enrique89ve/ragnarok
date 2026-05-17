import { CombatAction, type PokerCombatState } from '../../types/PokerCombatTypes';
import {
	getPokerActionPermissions,
	validatePokerActionIntent,
	type ActionPermissions,
} from '../rules/pokerActionRules';

export interface PokerAiDecisionProposal {
	readonly action: CombatAction;
	readonly betAmount: number;
	readonly reasoning?: string;
}

export interface LegalPokerAiAction {
	readonly action: CombatAction;
	readonly hpCommitment?: number;
	readonly reasoning?: string;
	readonly wasAdjusted: boolean;
	readonly proposedAction: CombatAction;
}

export function deriveLegalPokerAiAction(input: {
	readonly combatState: PokerCombatState;
	readonly aiPlayerId: string;
	readonly proposed: PokerAiDecisionProposal;
}): LegalPokerAiAction {
	const direct = toLegalAction(input.proposed, false);
	const directValidation = validatePokerActionIntent({
		combatState: input.combatState,
		playerId: input.aiPlayerId,
		action: direct.action,
		hpCommitment: direct.hpCommitment,
	});
	if (directValidation.ok) return direct;

	const permissions = directValidation.permissions
		?? getPokerActionPermissions(input.combatState, input.aiPlayerId === input.combatState.player.playerId);
	const fallback = chooseFallbackAction(input.proposed, permissions);
	const fallbackValidation = validatePokerActionIntent({
		combatState: input.combatState,
		playerId: input.aiPlayerId,
		action: fallback.action,
		hpCommitment: fallback.hpCommitment,
	});

	if (fallbackValidation.ok) return fallback;
	return direct;
}

function toLegalAction(
	proposed: PokerAiDecisionProposal,
	wasAdjusted: boolean,
): LegalPokerAiAction {
	return {
		action: proposed.action,
		hpCommitment: getHpCommitmentForAction(proposed.action, proposed.betAmount),
		reasoning: proposed.reasoning,
		wasAdjusted,
		proposedAction: proposed.action,
	};
}

function chooseFallbackAction(
	proposed: PokerAiDecisionProposal,
	permissions: ActionPermissions | null,
): LegalPokerAiAction {
	const base = {
		reasoning: proposed.reasoning,
		wasAdjusted: true,
		proposedAction: proposed.action,
	};

	if (!permissions) {
		return { ...base, action: proposed.action, hpCommitment: getHpCommitmentForAction(proposed.action, proposed.betAmount) };
	}

	const adjustedProposed = buildActionIfAllowed(proposed.action, permissions, base);
	if (adjustedProposed) return adjustedProposed;

	for (const action of getFallbackActionOrder(permissions)) {
		return buildAction(action, permissions, base);
	}

	return { ...base, action: proposed.action, hpCommitment: getHpCommitmentForAction(proposed.action, proposed.betAmount) };
}

function buildActionIfAllowed(
	action: CombatAction,
	permissions: ActionPermissions,
	base: Omit<LegalPokerAiAction, 'action' | 'hpCommitment'>,
): LegalPokerAiAction | null {
	if (!isActionAllowed(action, permissions)) return null;
	return buildAction(action, permissions, base);
}

function getFallbackActionOrder(permissions: ActionPermissions): CombatAction[] {
	const actions: CombatAction[] = [];
	if (permissions.canCall) actions.push(CombatAction.ENGAGE);
	if (permissions.canCheck) actions.push(CombatAction.DEFEND);
	if (permissions.canBet) actions.push(CombatAction.ATTACK);
	if (permissions.canFold) actions.push(CombatAction.BRACE);
	if (permissions.canRaise) actions.push(CombatAction.COUNTER_ATTACK);
	return actions;
}

function isActionAllowed(action: CombatAction, permissions: ActionPermissions): boolean {
	switch (action) {
		case CombatAction.ATTACK:
			return permissions.canBet;
		case CombatAction.COUNTER_ATTACK:
			return permissions.canRaise;
		case CombatAction.ENGAGE:
			return permissions.canCall;
		case CombatAction.DEFEND:
			return permissions.canCheck;
		case CombatAction.BRACE:
			return permissions.canFold;
	}
}

function buildAction(
	action: CombatAction,
	permissions: ActionPermissions,
	base: Omit<LegalPokerAiAction, 'action' | 'hpCommitment'>,
): LegalPokerAiAction {
	if (action === CombatAction.ATTACK || action === CombatAction.COUNTER_ATTACK) {
		return { ...base, action, hpCommitment: getSafeStake(permissions) };
	}
	return { ...base, action };
}

function getHpCommitmentForAction(action: CombatAction, betAmount: number): number | undefined {
	if (action !== CombatAction.ATTACK && action !== CombatAction.COUNTER_ATTACK) {
		return undefined;
	}
	return Math.max(0, Math.trunc(betAmount));
}

function getSafeStake(permissions: ActionPermissions): number {
	return Math.max(permissions.minBet, Math.min(permissions.maxBetAmount, permissions.minBet));
}
