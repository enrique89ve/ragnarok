import {
  CombatAction,
  CombatPhase,
  type PlayerCombatState,
  type PokerCombatState,
} from '../../types/PokerCombatTypes';
import { isTimedPokerDecisionPhase } from '../../../../../shared/p2p-wire/pokerTurnClock';

export interface ActionPermissions {
  isPreForesight: boolean;
  hasBetToCall: boolean;
  toCall: number;
  availableHP: number;
  minBet: number;
  canCheck: boolean;
  canBet: boolean;
  canCall: boolean;
  canRaise: boolean;
  canFold: boolean;
  maxBetAmount: number;
  isAllIn: boolean;
  isMyTurnToAct: boolean;
  waitingForOpponent: boolean;
}

export type PokerActionRejectReason =
  | 'missing_combat_state'
  | 'unknown_player'
  | 'phase_not_actionable'
  | 'combat_resolved'
  | 'all_in_showdown'
  | 'not_active_player'
  | 'actor_already_ready'
  | 'malformed_hp_commitment'
  | 'hp_commitment_unexpected'
  | 'bet_not_allowed'
  | 'bet_below_minimum'
  | 'bet_exceeds_capacity'
  | 'raise_not_allowed'
  | 'raise_below_minimum'
  | 'raise_exceeds_capacity'
  | 'call_not_allowed'
  | 'check_not_allowed'
  | 'fold_not_allowed'
  | 'turn_expired';

export type PokerActionValidationResult =
  | {
      ok: true;
      permissions: ActionPermissions;
      hpCommitment?: number;
    }
  | {
      ok: false;
      reason: PokerActionRejectReason;
      permissions: ActionPermissions | null;
    };

type PokerActionValidationContext = {
  readonly permissions: ActionPermissions;
  readonly hpCommitment?: number;
};

type PokerActionValidator = (context: PokerActionValidationContext) => PokerActionValidationResult;

type PokerStakeContext = {
  readonly hasBetToCall: boolean;
  readonly toCall: number;
  readonly availableHP: number;
  readonly minBet: number;
  readonly maxBetAmount: number;
  readonly isAllIn: boolean;
};

type PokerActionFlags = {
  readonly canCheck: boolean;
  readonly canBet: boolean;
  readonly canCall: boolean;
  readonly canRaise: boolean;
  readonly canFold: boolean;
};

type PokerTurnFlags = {
  readonly isMyTurnToAct: boolean;
  readonly waitingForOpponent: boolean;
};

const BETTING_PHASES = new Set<CombatPhase>([
  CombatPhase.PRE_FLOP,
  CombatPhase.FAITH,
  CombatPhase.FORESIGHT,
  CombatPhase.DESTINY,
]);

const ACTION_VALIDATORS: Record<CombatAction, PokerActionValidator> = {
  [CombatAction.ATTACK]: validateAttack,
  [CombatAction.COUNTER_ATTACK]: validateRaise,
  [CombatAction.ENGAGE]: validateCall,
  [CombatAction.DEFEND]: validateCheck,
  [CombatAction.BRACE]: validateFold,
};

export function getPokerActionPermissions(
  combatState: PokerCombatState | null,
  isPlayer: boolean = true,
): ActionPermissions | null {
  if (!combatState) return null;

  const actor = isPlayer ? combatState.player : combatState.opponent;
  const isResolution = combatState.phase === CombatPhase.RESOLUTION;
  const stake = getPokerStakeContext(combatState, actor);
  const actions = getPokerActionFlags(stake, isResolution);
  const turn = getPokerTurnFlags(combatState, actor, isResolution);

  return {
		isPreForesight: combatState.phase === CombatPhase.PRE_FLOP,
    ...stake,
    ...actions,
    ...turn,
  };
}

export function derivePokerTimeoutIntent(combatState: PokerCombatState | null): {
  readonly actorId: string;
  readonly action: CombatAction;
} | null {
  if (!combatState || !isTimedPokerDecisionPhase(combatState.phase)) return null;
  if (!combatState.activePlayerId || combatState.turnId === null || combatState.turnDeadlineAtMs === null) return null;

  const isPlayer = combatState.activePlayerId === combatState.player.playerId;
  const permissions = getPokerActionPermissions(combatState, isPlayer);
  if (!permissions) return null;

  return {
    actorId: combatState.activePlayerId,
    action: permissions.hasBetToCall ? CombatAction.BRACE : CombatAction.DEFEND,
  };
}

export function validatePokerActionIntent(input: {
  combatState: PokerCombatState | null;
  playerId: string;
  action: CombatAction;
  hpCommitment?: number;
  nowMs?: number;
  allowExpiredTurn?: boolean;
}): PokerActionValidationResult {
  const { combatState, playerId, action, hpCommitment, nowMs, allowExpiredTurn = false } = input;
  if (!combatState) return reject('missing_combat_state', null);

  const actorSide = getActorSide(combatState, playerId);
  if (!actorSide) return reject('unknown_player', null);

  const permissions = getPokerActionPermissions(combatState, actorSide === 'player');
  if (!permissions) return reject('missing_combat_state', null);
  if (!BETTING_PHASES.has(combatState.phase)) return reject('phase_not_actionable', permissions);
  if (combatState.phase === CombatPhase.RESOLUTION || combatState.foldWinner) return reject('combat_resolved', permissions);
  if (combatState.isAllInShowdown) return reject('all_in_showdown', permissions);
  if (combatState.activePlayerId !== playerId) return reject('not_active_player', permissions);
	if (!allowExpiredTurn && combatState.turnDeadlineAtMs !== null
		&& (nowMs ?? Date.now()) >= combatState.turnDeadlineAtMs) {
		return reject('turn_expired', permissions);
	}

  const actor = actorSide === 'player' ? combatState.player : combatState.opponent;
  if (actor.isReady) return reject('actor_already_ready', permissions);

  const parsedHp = parseHpCommitment(hpCommitment);
  if (parsedHp === null) return reject('malformed_hp_commitment', permissions);

  return ACTION_VALIDATORS[action]({ permissions, hpCommitment: parsedHp });
}

export function getPokerActorState(
  combatState: PokerCombatState,
  playerId: string,
): PlayerCombatState | null {
  const actorSide = getActorSide(combatState, playerId);
  if (!actorSide) return null;
  return actorSide === 'player' ? combatState.player : combatState.opponent;
}

function getActorSide(combatState: PokerCombatState, playerId: string): 'player' | 'opponent' | null {
  if (combatState.player.playerId === playerId) return 'player';
  if (combatState.opponent.playerId === playerId) return 'opponent';
  return null;
}

function getPokerStakeContext(combatState: PokerCombatState, actor: PlayerCombatState): PokerStakeContext {
  const minBet = combatState.minBet || 10;
  const toCall = Math.max(0, combatState.currentBet - actor.hpCommitted);
  const hasBetToCall = toCall > 0;
  const actorCurrentHP = Math.max(0, actor.pet.stats.currentHealth);
  const actorStaminaCap = Math.max(0, actor.pet.stats.currentStamina) * 10;
  const availableHP = Math.min(actorCurrentHP, actorStaminaCap);
  const actualCallAmount = Math.min(toCall, availableHP);

  return {
    minBet,
    toCall,
    hasBetToCall,
    availableHP,
    maxBetAmount: hasBetToCall ? Math.max(0, availableHP - toCall) : availableHP,
    isAllIn: actualCallAmount < toCall,
  };
}

function getPokerActionFlags(stake: PokerStakeContext, isResolution: boolean): PokerActionFlags {
  const canAct = !isResolution;

  return {
    canCheck: canAct && !stake.hasBetToCall,
    canBet: canAct && !stake.hasBetToCall && stake.availableHP >= stake.minBet,
    canCall: canAct && stake.hasBetToCall && stake.availableHP > 0,
    canRaise: canAct && stake.hasBetToCall && stake.toCall + stake.minBet <= stake.availableHP,
    canFold: canAct && stake.hasBetToCall,
  };
}

function getPokerTurnFlags(
  combatState: PokerCombatState,
  actor: PlayerCombatState,
  isResolution: boolean,
): PokerTurnFlags {
  const isResolved = isResolution || Boolean(combatState.foldWinner);
  const hasActiveActor = combatState.activePlayerId !== null;

  return {
    isMyTurnToAct: !isResolved && !actor.isReady && combatState.activePlayerId === actor.playerId,
    waitingForOpponent: !isResolved && hasActiveActor && combatState.activePlayerId !== actor.playerId,
  };
}

function parseHpCommitment(value: number | undefined): number | undefined | null {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) return null;
  return value;
}

function validateAttack({ permissions, hpCommitment }: PokerActionValidationContext): PokerActionValidationResult {
  if (hpCommitment === undefined) return reject('malformed_hp_commitment', permissions);
  if (!permissions.canBet || permissions.hasBetToCall) return reject('bet_not_allowed', permissions);
  if (hpCommitment < permissions.minBet) return reject('bet_below_minimum', permissions);
  if (hpCommitment > permissions.maxBetAmount) return reject('bet_exceeds_capacity', permissions);
  return accept(permissions, hpCommitment);
}

function validateRaise({ permissions, hpCommitment }: PokerActionValidationContext): PokerActionValidationResult {
  if (hpCommitment === undefined) return reject('malformed_hp_commitment', permissions);
  if (!permissions.canRaise || !permissions.hasBetToCall) return reject('raise_not_allowed', permissions);
  if (hpCommitment < permissions.minBet) return reject('raise_below_minimum', permissions);
  if (hpCommitment > permissions.maxBetAmount) return reject('raise_exceeds_capacity', permissions);
  return accept(permissions, hpCommitment);
}

function validateCall({ permissions, hpCommitment }: PokerActionValidationContext): PokerActionValidationResult {
  if (hpCommitment !== undefined) return reject('hp_commitment_unexpected', permissions);
  if (!permissions.canCall) return reject('call_not_allowed', permissions);
  return accept(permissions);
}

function validateCheck({ permissions, hpCommitment }: PokerActionValidationContext): PokerActionValidationResult {
  if (hpCommitment !== undefined) return reject('hp_commitment_unexpected', permissions);
  if (!permissions.canCheck || permissions.hasBetToCall) return reject('check_not_allowed', permissions);
  return accept(permissions);
}

function validateFold({ permissions, hpCommitment }: PokerActionValidationContext): PokerActionValidationResult {
  if (hpCommitment !== undefined) return reject('hp_commitment_unexpected', permissions);
  if (!permissions.canFold) return reject('fold_not_allowed', permissions);
  return accept(permissions);
}

function accept(permissions: ActionPermissions, hpCommitment?: number): PokerActionValidationResult {
  if (hpCommitment === undefined) {
    return { ok: true, permissions };
  }
  return { ok: true, permissions, hpCommitment };
}

function reject(
  reason: PokerActionRejectReason,
  permissions: ActionPermissions | null,
): PokerActionValidationResult {
  return { ok: false, reason, permissions };
}
