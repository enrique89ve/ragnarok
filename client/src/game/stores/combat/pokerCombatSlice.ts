/**
 * PokerCombatSlice - Poker combat state and actions
 * 
 * Manages all poker-related gameplay including betting, hands, and resolution.
 */

import { StateCreator } from 'zustand';
import {
  PokerCombatState,
  CombatPhase as PokerCombatPhase,
  CombatAction,
  PokerCard,
  PlayerCombatState,
  EvaluatedHand,
  CombatResolution,
  PetData,
  createPokerDeck,
  shuffleDeck,
  DEFAULT_BLIND_CONFIG,
  PokerPosition,
  PokerHandRank,
  HAND_RANK_NAMES,
  ElementBuff,
  PokerCombatDeterministicOptions
} from '../../types/PokerCombatTypes';
import {
  getActivePlayerForPhase,
  validateActivePlayer,
  type ActivePlayerContext
} from './activePlayerUtils';
import { BLINDS } from '../../combat/modules/BettingEngine';
import { 
  PokerState, 
  PokerPhase, 
  CombatLogEntry,
  PokerCombatSlice,
  UnifiedCombatStore
} from './types';
import { getElementAdvantage } from '../../utils/elements';
import type { PokerActionOrigin } from '@shared/p2p-wire/combat';
import { deriveDefendStaminaAfterAction } from '@shared/protocol-core/pokerActionPolicy';
import { validatePokerResourceInvariants, type ResourceInvariantViolation } from '@shared/protocol-core/gameLimits';
import { getCachedHandEvaluation, clearHandCache } from '../../utils/poker/handCache';
import {
  applyPokerHpDelta,
  applyPokerHpDeltaOnSlot,
  commitPokerHp,
  growPokerHpMax,
  pokerHpChannelId,
  settlePokerHp,
  settleResolvedPokerHp,
  uncommitPokerHp,
} from '../../combat/pokerCombatHp';
import { notifyOpponentHpDebit } from '../../combat/notifyCombatHp';
import { compareHands } from '../../combat/modules/HandEvaluator';
import { debug } from '../../config/debugConfig';
import { applyStaminaShield, getExtraFoldPenalty } from '../../utils/poker/pokerSpellUtils';
import { cryptoRng, seededRngFromString } from '../../utils/seededRng';
import {
  createNotarizedPokerTurnClock,
  createPokerTurnClock,
	createReceivedPokerTurnClock,
	getPokerTurnRemainingSeconds,
	isTimedPokerDecisionPhase,
	POKER_TURN_CLOCK_NOTARY_OWNER_ID,
	UNIVERSAL_POKER_TURN_CLOCK_POLICY,
	type PokerTurnIdentityInput,
} from '@shared/p2p-wire/pokerTurnClock';
import { validatePokerActionIntent } from '../../combat/rules/pokerActionRules';
import { emitCommunityCardRevealed, emitPhaseEntered, emitWagerActivated, isWagerType } from '../../combat/vfx/events';

function findPokerResourceViolation(state: PokerCombatState): ResourceInvariantViolation | null {
	for (const participant of [state.player, state.opponent]) {
		const violation = validatePokerResourceInvariants({
			manaCurrent: participant.mana,
			manaMax: participant.maxMana,
			armor: participant.heroArmor,
			currentHealth: participant.pet.stats.currentHealth,
			maxHealth: participant.pet.stats.maxHealth,
			currentStamina: participant.pet.stats.currentStamina,
			maxStamina: participant.pet.stats.maxStamina,
		});
		if (violation) return violation;
	}
	return null;
}

// ── v1.1: Wager Keyword Utilities ──

interface WagerEffect {
	type: string;
	value?: number;
	damage?: number;
	chance?: number;
	multiplierBonus?: number;
	selfDamage?: number;
	bonusDamage?: number;
	buffAttack?: number;
	minRank?: number;
	drawCount?: number;
	ranks?: number;
}

function getTurnDurationMs(_state: Pick<PokerCombatState, 'maxTurnTime'>): number {
	return UNIVERSAL_POKER_TURN_CLOCK_POLICY.durationMs;
}

function getTurnIdentity(state: PokerCombatState): PokerTurnIdentityInput {
  return {
    combatId: state.combatId,
    phase: state.phase,
    activePlayerId: state.activePlayerId,
    actionsThisRound: state.actionsThisRound,
  };
}

function applyLocalPokerTurnClock(state: PokerCombatState, nowMs = Date.now()): PokerCombatState {
	const clock = createPokerTurnClock({
    ...getTurnIdentity(state),
    nowMs,
    durationMs: getTurnDurationMs(state),
  });
	if (!clock) {
    return {
      ...state,
      turnId: null,
      turnStartedAtMs: null,
      turnDeadlineAtMs: null,
      turnClockOwnerId: null,
      turnTimer: state.maxTurnTime,
    };
	}
	if (
		state.turnId === clock.turnId
		&& state.turnStartedAtMs !== null
		&& state.turnDeadlineAtMs !== null
	) {
		return {
			...state,
			turnTimer: getPokerTurnRemainingSeconds({ nowMs, deadlineAtMs: state.turnDeadlineAtMs }),
		};
	}
	return {
    ...state,
    turnId: clock.turnId,
    turnStartedAtMs: clock.startedAtMs,
    turnDeadlineAtMs: clock.deadlineAtMs,
    turnClockOwnerId: null,
    turnTimer: getPokerTurnRemainingSeconds({ nowMs, deadlineAtMs: clock.deadlineAtMs }),
  };
}

function getActiveWagerEffects(playerType: 'player' | 'opponent'): WagerEffect[] {
	try {
		const store = (globalThis as Record<string, any>).__ragnarokGameStore;
		const gameState = store?.getState()?.gameState;
		if (!gameState) return [];
		const bf = gameState.players?.[playerType]?.battlefield || [];
		return bf
			.map((m: any) => m.card?.wagerEffect as WagerEffect | undefined)
			.filter(Boolean) as WagerEffect[];
	} catch { return []; }
}

function hasWagerEffect(playerType: 'player' | 'opponent', effectType: string): WagerEffect | undefined {
	return getActiveWagerEffects(playerType).find(w => w.type === effectType);
}

/** UI wager queries — components call these to check visual effects */
export function shouldRevealOpponentCards(): boolean {
	return !!hasWagerEffect('player', 'reveal_opponent_hole_cards');
}
export function shouldPeekNextCard(): boolean {
	return !!hasWagerEffect('player', 'peek_next_community_card');
}
export function shouldHideOpponentActions(): boolean {
	return !!hasWagerEffect('opponent', 'hide_bet_actions');
}

/**
 * Evaluate poker hand with caching for performance.
 * Delegates to HandEvaluator.ts via the cache utility.
 * 
 * Changed: Removed duplicate hand evaluation logic (was 140 lines).
 * Now uses centralized HandEvaluator.ts with caching layer.
 */
export const evaluatePokerHand = (holeCards: PokerCard[], communityCards: PokerCard[]): EvaluatedHand => {
  return getCachedHandEvaluation(holeCards, communityCards);
};

function createShuffledPokerDeck(seedKey?: string): PokerCard[] {
  const rng = seedKey ? seededRngFromString(seedKey) : cryptoRng;
  return shuffleDeck(createPokerDeck(), rng);
}

export function getShowdownCoinFlipRoll(input: {
  readonly combatId: string;
  readonly deterministicDeckSeed?: string;
  readonly side: 'player' | 'opponent';
  readonly index: number;
}): number {
  const seed = [
    input.deterministicDeckSeed ?? 'local',
    input.combatId,
    'showdown_coin_flip',
    input.side,
    input.index,
  ].join(':');
  return seededRngFromString(seed)();
}

function dealCanonicalHoleCards(
  deck: PokerCard[],
  playerRole?: PokerCombatDeterministicOptions['playerRole']
): { playerHoleCards: PokerCard[]; opponentHoleCards: PokerCard[] } {
  const firstRoleCards = [deck.pop()!, deck.pop()!];
  const secondRoleCards = [deck.pop()!, deck.pop()!];

  if (playerRole === 'defender') {
    return {
      playerHoleCards: secondRoleCards,
      opponentHoleCards: firstRoleCards,
    };
  }

  return {
    playerHoleCards: firstRoleCards,
    opponentHoleCards: secondRoleCards,
  };
}

/**
 * Compare tiebreakers between two hands.
 * Returns positive if a > b, negative if a < b, 0 if equal.
 */
function compareTieBreakers(a: number[], b: number[]): number {
  const maxLen = Math.max(a.length, b.length);
  for (let i = 0; i < maxLen; i++) {
    const aVal = a[i] || 0;
    const bVal = b[i] || 0;
    if (aVal > bVal) return 1;
    if (aVal < bVal) return -1;
  }
  return 0;
}

export const createPokerCombatSlice: StateCreator<
  UnifiedCombatStore,
  [],
  [],
  PokerCombatSlice
> = (set, get) => {
  let pendingNextHandTimeout: ReturnType<typeof setTimeout> | null = null;

  const cancelPendingPokerHandTransition = (): void => {
    if (pendingNextHandTimeout === null) return;
    clearTimeout(pendingNextHandTimeout);
    pendingNextHandTimeout = null;
  };

  return {
  pokerState: null,
  pokerCombatState: null,
  pokerDeck: [],
  pokerIsActive: false,
  mulliganComplete: false,
  isTransitioningHand: false,
  pokerHandsWonPlayer: 0,
  pokerHandsWonOpponent: 0,
  pokerSlotsSwapped: false,

  setPokerSlotsSwapped: (swapped) => set({ pokerSlotsSwapped: swapped }),

  initializePoker: () => {
    set({
      combatPhase: 'POKER_BETTING',
      pokerState: {
        phase: 'FAITH',
        pot: 0,
        playerHoleCards: [],
        opponentHoleCards: [],
        communityCards: [],
        playerBet: 0,
        opponentBet: 0,
        currentBetToMatch: 0,
        isPlayerTurn: true,
        lastAction: null,
      },
    });
  },

  setPokerPhase: (phase) => {
    const current = get().pokerState;
    if (current) {
      set({
        pokerState: { ...current, phase },
      });
    }
  },

  dealCommunityCards: (cards) => {
    const current = get().pokerState;
    if (current) {
      set({
        pokerState: {
          ...current,
          communityCards: [...current.communityCards, ...cards],
        },
      });
    }
  },

  placeBet: (player, amount) => {
    const current = get().pokerState;
    if (!current) return;

    // v1.1: Wager — Pot Raiser increases min bet for both players
    const potRaiser = hasWagerEffect('player', 'increase_min_bet') || hasWagerEffect('opponent', 'increase_min_bet');
    const minBetBonus = potRaiser?.value ?? 0;
    const effectiveAmount = Math.max(amount, minBetBonus);

    // v1.1: Wager — Reckless Bettor doubles blinds
    // (applied at blind-posting time, but noted here for visibility)

    const updates: Partial<PokerState> = {
      pot: current.pot + effectiveAmount,
      lastAction: `${player} bet ${effectiveAmount}`,
      isPlayerTurn: player === 'player' ? false : true,
    };

    if (player === 'player') {
      updates.playerBet = current.playerBet + effectiveAmount;
    } else {
      updates.opponentBet = current.opponentBet + effectiveAmount;
    }

    updates.currentBetToMatch = Math.max(
      updates.playerBet ?? current.playerBet,
      updates.opponentBet ?? current.opponentBet
    );

    set({ pokerState: { ...current, ...updates } });
  },

  fold: (player) => {
    const current = get().pokerState;
    if (current) {
      // v1.1: Wager — Cautious Dealer reduces fold penalty
      const cautious = hasWagerEffect(player, 'reduce_fold_penalty');
      const foldReduction = cautious?.value ?? 0;

      // v1.1: Wager — Norn's Witness heals opponent hero if you fold
      const opponent = player === 'player' ? 'opponent' : 'player';
      const nornWitness = hasWagerEffect(opponent, 'on_opponent_fold_heal');
      if (nornWitness) {
        debug.log(`[Wager] Norn's Witness: heal ${opponent} for ${nornWitness.value} on fold`);
        // Heal applied in showdown resolution
      }

      set({
        pokerState: {
          ...current,
          lastAction: `${player} folded${foldReduction > 0 ? ` (penalty -${foldReduction})` : ''}`,
        },
        combatPhase: 'RESOLUTION',
      });
    }
  },

  endPokerRound: (winnerId, damage) => {
    const tick = get()._nextLogTick();
    get().addLogEntry({
      id: `poker_end_${tick}`,
      timestamp: tick,
      type: 'poker',
      message: `${winnerId} wins poker round, deals ${damage} damage`,
    });
    set({
      pokerState: null,
      combatPhase: 'CHESS_MOVEMENT',
    });
  },

  initializePokerCombat: (
    playerId: string,
    playerName: string,
    playerPet: PetData,
    opponentId: string,
    opponentName: string,
    opponentPet: PetData,
    skipMulligan = false,
    playerKingId?: string,
    opponentKingId?: string,
    firstStrikeTarget?: 'player' | 'opponent',
    deterministic?: PokerCombatDeterministicOptions
  ) => {
    cancelPendingPokerHandTransition();
    clearHandCache();
    let deck = createShuffledPokerDeck(deterministic?.deckSeed);
    
    let playerHoleCards: PokerCard[] = [];
    let opponentHoleCards: PokerCard[] = [];
    
    if (skipMulligan) {
      const dealt = dealCanonicalHoleCards(deck, deterministic?.playerRole);
      playerHoleCards = dealt.playerHoleCards;
      opponentHoleCards = dealt.opponentHoleCards;
    }
    
    const playerPosition: PokerPosition = deterministic?.playerRole === 'defender'
      ? 'big_blind'
      : 'small_blind';
    const opponentPosition: PokerPosition = playerPosition === 'small_blind'
      ? 'big_blind'
      : 'small_blind';
    const openerIsPlayer = playerPosition === 'small_blind';
    const minBet = DEFAULT_BLIND_CONFIG.bigBlind;
    
    const FIRST_STRIKE_DAMAGE = 15;
	let startingPhase = skipMulligan ? PokerCombatPhase.PRE_FLOP : PokerCombatPhase.MULLIGAN;
    if (firstStrikeTarget) {
      startingPhase = PokerCombatPhase.FIRST_STRIKE;
    }
    
    const playerElement = playerPet.stats.element;
    const opponentElement = opponentPet.stats.element;
    
    const playerAdvantage = getElementAdvantage(playerElement, opponentElement);
    const opponentAdvantage = getElementAdvantage(opponentElement, playerElement);
    
    const playerElementBuff: ElementBuff = {
      hasAdvantage: playerAdvantage.hasAdvantage,
      attackBonus: playerAdvantage.attackBonus,
      healthBonus: playerAdvantage.healthBonus,
      armorBonus: playerAdvantage.armorBonus
    };
    
    const opponentElementBuff: ElementBuff = {
      hasAdvantage: opponentAdvantage.hasAdvantage,
      attackBonus: opponentAdvantage.attackBonus,
      healthBonus: opponentAdvantage.healthBonus,
      armorBonus: opponentAdvantage.armorBonus
    };
    
    const playerPetCopy = JSON.parse(JSON.stringify(playerPet));
    const opponentPetCopy = JSON.parse(JSON.stringify(opponentPet));
    
    const playerManaBoost = get().consumePendingManaBoost('player');
    const opponentManaBoost = get().consumePendingManaBoost('opponent');
    
    // Check for auto-all-in if a player cannot afford the big blind
    const bigBlind = DEFAULT_BLIND_CONFIG.bigBlind;
    const playerHealth = playerPetCopy.stats.currentHealth;
    const opponentHealth = opponentPetCopy.stats.currentHealth;
    let isAllInShowdown = false;

    if (playerHealth < bigBlind || opponentHealth < bigBlind) {
      debug.combat('[PokerCombat] Auto-all-in triggered due to low health:', { playerHealth, opponentHealth, bigBlind });
      isAllInShowdown = true;
      // Flip cards immediately
      skipMulligan = true;
	      startingPhase = PokerCombatPhase.PRE_FLOP;
    }

	    // All starting phases (MULLIGAN, PRE_FLOP, FIRST_STRIKE) begin with isReady: false.
    const playerCombatState: PlayerCombatState = {
      playerId,
      playerName,
      pet: playerPetCopy,
      holeCards: playerHoleCards,
      hpCommitted: 0,
      preBlindHealth: playerPetCopy.stats.currentHealth,
      heroArmor: playerAdvantage.hasAdvantage ? playerAdvantage.armorBonus : 0,
      statusEffects: [],
      mana: 1 + playerManaBoost,
      maxMana: 9,
      isReady: false,
      elementBuff: playerElementBuff
    };
    
    const opponentCombatState: PlayerCombatState = {
      playerId: opponentId,
      playerName: opponentName,
      pet: opponentPetCopy,
      holeCards: opponentHoleCards,
      hpCommitted: 0,
      preBlindHealth: opponentPetCopy.stats.currentHealth,
      heroArmor: opponentAdvantage.hasAdvantage ? opponentAdvantage.armorBonus : 0,
      statusEffects: [],
      mana: 1 + opponentManaBoost,
      maxMana: 9,
      isReady: false,
      elementBuff: opponentElementBuff
    };
    
    if (playerManaBoost > 0 || opponentManaBoost > 0) {
      debug.combat('[PokerCombat] Applied mana boosts from Divine Command:', { playerManaBoost, opponentManaBoost });
    }
    
    // Use centralized utility for activePlayerId initialization
    const activePlayerCtx: ActivePlayerContext = { playerPosition, playerId, opponentId };
    const initialActivePlayerId = getActivePlayerForPhase(startingPhase, activePlayerCtx);
    validateActivePlayer(startingPhase, initialActivePlayerId, 'initializePokerCombat');
    
    const combatState: PokerCombatState = applyLocalPokerTurnClock({
      combatId: deterministic?.combatId ?? `combat_${get()._nextLogTick()}`,
      handNumber: 0,
      phase: startingPhase,
      player: playerCombatState,
      opponent: opponentCombatState,
      communityCards: { faith: [] },
      currentBet: 0,
      pot: 0,
      turnTimer: 60,
      maxTurnTime: 60,
      turnId: null,
      turnStartedAtMs: null,
      turnDeadlineAtMs: null,
      actionHistory: [],
      minBet,
      openerIsPlayer,
      preflopBetMade: false,
      blindConfig: DEFAULT_BLIND_CONFIG,
      playerPosition,
      opponentPosition,
      blindsPosted: false,
      isAllInShowdown: isAllInShowdown,
      activePlayerId: initialActivePlayerId,
      actionsThisRound: 0,
      firstStrike: firstStrikeTarget ? {
        damage: FIRST_STRIKE_DAMAGE,
        target: firstStrikeTarget,
        completed: false
      } : undefined,
	      spellPetPhaseStartTime: undefined,
      deterministicDeckSeed: deterministic?.deckSeed,
      deterministicPlayerRole: deterministic?.playerRole
    });
    
    set({
      pokerCombatState: combatState,
      pokerDeck: deck,
      pokerIsActive: true,
      mulliganComplete: skipMulligan,
      isTransitioningHand: false,
      combatPhase: 'POKER_BETTING',
      pokerHandsWonPlayer: 0,
      pokerHandsWonOpponent: 0,
    });
    
    const initTick = get()._nextLogTick();
    get().addLogEntry({
      id: `poker_init_${initTick}`,
      timestamp: initTick,
      type: 'poker',
      message: `Poker combat initialized: ${playerName} vs ${opponentName}`
    });

    // Post-commit: phase drama fires for the opening phase too (legacy
    // usePokerDrama edge-detection played it on first mount).
    emitPhaseEntered({ phase: startingPhase });
  },

  completeFirstStrike: () => {
    debug.combat('[PokerCombatSlice] completeFirstStrike called');
    const state = get();
    if (!state.pokerCombatState || !state.pokerCombatState.firstStrike) {
      debug.combat('[PokerCombatSlice] No firstStrike state, returning early');
      return;
    }
    if (state.pokerCombatState.firstStrike.completed) {
      debug.combat('[PokerCombatSlice] FirstStrike already completed, returning early');
      return;
    }
    
    const { damage, target } = state.pokerCombatState.firstStrike;
    const struck = applyPokerHpDeltaOnSlot(state.pokerCombatState, target, -damage);
    const struckState = struck?.state ?? state.pokerCombatState;
    const targetAfter = target === 'player' ? struckState.player : struckState.opponent;
    const floorHealth = Math.max(1, targetAfter.pet.stats.currentHealth);
    const floored = settlePokerHp(struckState, pokerHpChannelId(struckState, target), floorHealth);
    const flooredState = floored?.state ?? struckState;
    if (struck) notifyOpponentHpDebit(state.pokerCombatState, struck, 'first-strike');

    const updatedTargetState = {
      ...(target === 'player' ? flooredState.player : flooredState.opponent),
      preBlindHealth: floorHealth
    };
    
	    const nextPhase = state.mulliganComplete ? PokerCombatPhase.PRE_FLOP : PokerCombatPhase.MULLIGAN;
    debug.combat(`[PokerCombatSlice] First strike damage ${damage} applied to ${target}, transitioning to phase: ${nextPhase}`);
    
	    // Enter next phase with isReady: false.
    const playerState = target === 'player' ? updatedTargetState : state.pokerCombatState.player;
    const opponentState = target === 'opponent' ? updatedTargetState : state.pokerCombatState.opponent;
    
    // Use centralized utility for activePlayerId
    const ctx: ActivePlayerContext = {
      playerPosition: state.pokerCombatState.playerPosition,
      playerId: state.pokerCombatState.player.playerId,
      opponentId: state.pokerCombatState.opponent.playerId
    };
    const newActivePlayerId = getActivePlayerForPhase(nextPhase, ctx);
    validateActivePlayer(nextPhase, newActivePlayerId, 'completeFirstStrike');
    
    set({
      pokerCombatState: applyLocalPokerTurnClock({
        ...state.pokerCombatState,
        phase: nextPhase,
        spellPetPhaseStartTime: undefined,
        activePlayerId: newActivePlayerId,
        actionsThisRound: 0,
        player: {
          ...playerState,
          isReady: false
        },
        opponent: {
          ...opponentState,
          isReady: false
        },
        firstStrike: {
          ...state.pokerCombatState.firstStrike,
          completed: true
        }
      })
    });
    
    const firstStrikeTick = get()._nextLogTick();
    get().addLogEntry({
      id: `first_strike_${firstStrikeTick}`,
      timestamp: firstStrikeTick,
      type: 'attack',
      message: `First strike! ${target === 'player' ? 'Player' : 'Opponent'} takes ${damage} damage`
    });

	    // Post-commit: shake on the MULLIGAN/first poker turn transition.
    emitPhaseEntered({ phase: nextPhase });
  },

  completeMulligan: () => {
    const state = get();
    if (!state.pokerCombatState || state.mulliganComplete) return;
    
    let deck = [...state.pokerDeck];
    const dealt = dealCanonicalHoleCards(deck, state.pokerCombatState.deterministicPlayerRole);
    const playerHoleCards = dealt.playerHoleCards;
    const opponentHoleCards = dealt.opponentHoleCards;
    
    // Use centralized utility for activePlayerId
    const ctx: ActivePlayerContext = {
      playerPosition: state.pokerCombatState.playerPosition,
      playerId: state.pokerCombatState.player.playerId,
      opponentId: state.pokerCombatState.opponent.playerId
    };
	    const newActivePlayerId = getActivePlayerForPhase(PokerCombatPhase.PRE_FLOP, ctx);
	    validateActivePlayer(PokerCombatPhase.PRE_FLOP, newActivePlayerId, 'completeMulligan');
    
	    // Enter the first poker turn with isReady: false.
    set({
      pokerCombatState: applyLocalPokerTurnClock({
        ...state.pokerCombatState,
	        phase: PokerCombatPhase.PRE_FLOP,
        spellPetPhaseStartTime: undefined,
        activePlayerId: newActivePlayerId,
        actionsThisRound: 0,
        player: {
          ...state.pokerCombatState.player,
          holeCards: playerHoleCards,
          isReady: false
        },
        opponent: {
          ...state.pokerCombatState.opponent,
          holeCards: opponentHoleCards,
          isReady: false
        }
      }),
      pokerDeck: deck,
      mulliganComplete: true
    });

	    // Post-commit: shake on the first poker turn transition.
	    emitPhaseEntered({ phase: PokerCombatPhase.PRE_FLOP });
  },

  performPokerAction: (
    playerId: string,
    action: CombatAction,
    hpCommitment?: number,
    origin: PokerActionOrigin = 'player',
    nowMs?: number,
  ) => {
    const state = get();
    if (!state.pokerCombatState) return;
	const beforeResourceViolation = findPokerResourceViolation(state.pokerCombatState);
	if (beforeResourceViolation) {
		debug.combat('[performPokerAction] REJECTED: resource invariant violated', beforeResourceViolation);
		return;
	}

    const validation = validatePokerActionIntent({
      combatState: state.pokerCombatState,
      playerId,
      action,
      hpCommitment,
		  nowMs: nowMs ?? Date.now(),
		  origin,
    });
    if (!validation.ok) {
      debug.combat('[performPokerAction] REJECTED:', {
        playerId,
        action,
        reason: validation.reason,
      });
      return;
    }

    let newState = { ...state.pokerCombatState, actionHistory: [...state.pokerCombatState.actionHistory] };
	let nextPokerSpellState = state.pokerSpellState;
    const permissions = validation.permissions;
    const actionHpCommitment = validation.hpCommitment ?? 0;
    const otherPlayerId = playerId === newState.player.playerId
      ? newState.opponent.playerId
      : newState.player.playerId;

    if (newState.player.playerId === newState.opponent.playerId) {
      debug.combat('[performPokerAction] REJECTED: HP channels collided');
      return;
    }

    const markAction = (combat: typeof newState): typeof newState => ({
      ...combat,
      player: combat.player.playerId === playerId
        ? { ...combat.player, currentAction: action }
        : combat.player,
      opponent: combat.opponent.playerId === playerId
        ? { ...combat.opponent, currentAction: action }
        : combat.opponent,
    });
    newState = markAction(newState);

    const actingAfter = (combat: typeof newState) => (
      combat.player.playerId === playerId ? combat.player : combat.opponent
    );
    
    switch (action) {
      case CombatAction.ATTACK:
        if (actionHpCommitment > 0) {
          const committed = commitPokerHp(newState, playerId, actionHpCommitment);
          if (!committed) return;
          newState = committed.state;
          newState.pot += -committed.transition.applied;
          newState.currentBet = Math.max(newState.currentBet, committed.transition.after.committed);
          newState.preflopBetMade = true;
          const betStaCost = Math.ceil(actionHpCommitment / 10);
          if (betStaCost > 0) {
            const actor = actingAfter(newState);
            const nextStamina = Math.max(0, actor.pet.stats.currentStamina - betStaCost);
            newState = actor.playerId === newState.player.playerId
              ? { ...newState, player: { ...actor, pet: { ...actor.pet, stats: { ...actor.pet.stats, currentStamina: nextStamina } } } }
              : { ...newState, opponent: { ...actor, pet: { ...actor.pet, stats: { ...actor.pet.stats, currentStamina: nextStamina } } } };
            debug.combat(`[STA] ${playerId} bet ${actionHpCommitment} HP: -${betStaCost} STA`);
          }
          if (!newState.blindsPosted) {
            newState.blindsPosted = true;
          }
          if (actingAfter(newState).pet.stats.currentHealth === 0) {
            newState.isAllInShowdown = true;
          }
        }
        break;

      case CombatAction.COUNTER_ATTACK:
        {
          const actualTotal = permissions.toCall + actionHpCommitment;
          const committed = commitPokerHp(newState, playerId, actualTotal);
          if (!committed) return;
          newState = committed.state;
          newState.pot += -committed.transition.applied;
          newState.currentBet = Math.max(newState.currentBet, committed.transition.after.committed);
          newState.preflopBetMade = true;
          const raiseStaCost = Math.ceil(actualTotal / 10);
          if (raiseStaCost > 0) {
            const actor = actingAfter(newState);
            const nextStamina = Math.max(0, actor.pet.stats.currentStamina - raiseStaCost);
            newState = actor.playerId === newState.player.playerId
              ? { ...newState, player: { ...actor, pet: { ...actor.pet, stats: { ...actor.pet.stats, currentStamina: nextStamina } } } }
              : { ...newState, opponent: { ...actor, pet: { ...actor.pet, stats: { ...actor.pet.stats, currentStamina: nextStamina } } } };
            debug.combat(`[STA] ${playerId} raised ${actualTotal} HP: -${raiseStaCost} STA`);
          }
          if (!newState.blindsPosted) {
            newState.blindsPosted = true;
          }
          if (actingAfter(newState).pet.stats.currentHealth === 0) {
            newState.isAllInShowdown = true;
          }
        }
        break;
        
      case CombatAction.ENGAGE:
        const toMatch = Math.min(permissions.toCall, permissions.availableHP);
        if (toMatch > 0) {
          const committed = commitPokerHp(newState, playerId, toMatch);
          if (!committed) return;
          newState = committed.state;
          newState.pot += -committed.transition.applied;
        }
        if (actingAfter(newState).hpCommitted < newState.currentBet) {
          const excess = (playerId === newState.player.playerId
            ? newState.opponent.hpCommitted
            : newState.player.hpCommitted) - actingAfter(newState).hpCommitted;
          if (excess > 0) {
            const refunded = uncommitPokerHp(newState, otherPlayerId, excess);
            if (refunded) {
              newState = refunded.state;
              newState.pot -= refunded.transition.applied;
              newState.currentBet = actingAfter(newState).hpCommitted;
            }
          }
          newState.isAllInShowdown = true;
        }
        if (newState.player.pet.stats.currentHealth === 0 || newState.opponent.pet.stats.currentHealth === 0) {
          newState.isAllInShowdown = true;
        }
        if (!newState.blindsPosted) {
          newState.blindsPosted = true;
        }
        break;
        
      case CombatAction.BRACE:
        const folderIsPlayer = playerId === newState.player.playerId;
        const folderSide: 'player' | 'opponent' = folderIsPlayer ? 'player' : 'opponent';
        
        // Force blind posting if folding before FAITH phase (e.g. during PRE_FLOP)
        // This ensures the folder always loses at least their blind HP
        if (!newState.blindsPosted) {
          const sbBlind = newState.blindConfig?.smallBlind || BLINDS.SB;
          const bbBlind = newState.blindConfig?.bigBlind || BLINDS.BB;
          const sbChannelId = newState.playerPosition === 'small_blind'
            ? newState.player.playerId
            : newState.opponent.playerId;
          const bbChannelId = newState.playerPosition === 'big_blind'
            ? newState.player.playerId
            : newState.opponent.playerId;
          const sbPosted = commitPokerHp(newState, sbChannelId, sbBlind);
          if (sbPosted) newState = sbPosted.state;
          const bbPosted = commitPokerHp(newState, bbChannelId, bbBlind);
          if (bbPosted) newState = bbPosted.state;
          const sbAmount = sbPosted ? -sbPosted.transition.applied : 0;
          const bbAmount = bbPosted ? -bbPosted.transition.applied : 0;
          newState.pot += sbAmount + bbAmount;
          newState.currentBet = bbAmount;
          newState.blindsPosted = true;
          
          debug.combat(`[BRACE] Force-posted blinds before fold: SB=${sbAmount}, BB=${bbAmount}`);
        }
        
        // Base fold STA penalty
        let foldStaPenalty = 1;
        
        // Check fold curse from spell state (extra -1 STA)
        const spellState = nextPokerSpellState;
        if (spellState) {
          foldStaPenalty += getExtraFoldPenalty(spellState, folderSide);
          
          // Apply stamina shield absorption
          const shieldResult = applyStaminaShield(spellState, folderSide, foldStaPenalty);
          foldStaPenalty = shieldResult.reducedPenalty;
          
          // Update spell state if shield was consumed
          if (shieldResult.newState !== spellState) {
            nextPokerSpellState = shieldResult.newState;
          }
        }
        
        // Deduct STA from folder
        if (foldStaPenalty > 0) {
          const actor = actingAfter(newState);
          const nextStamina = Math.max(0, actor.pet.stats.currentStamina - foldStaPenalty);
          newState = actor.playerId === newState.player.playerId
            ? { ...newState, player: { ...actor, pet: { ...actor.pet, stats: { ...actor.pet.stats, currentStamina: nextStamina } } } }
            : { ...newState, opponent: { ...actor, pet: { ...actor.pet, stats: { ...actor.pet.stats, currentStamina: nextStamina } } } };
          debug.combat(`[STA] ${folderSide} folded: -${foldStaPenalty} STA`);
        }
        
        newState.foldWinner = folderIsPlayer ? 'opponent' : 'player';
        newState.phase = PokerCombatPhase.RESOLUTION;
        newState.player = { ...newState.player, isReady: true };
        newState.opponent = { ...newState.opponent, isReady: true };
        newState.activePlayerId = null;
        break;
        
      case CombatAction.DEFEND:
        {
          const actor = actingAfter(newState);
          const nextStamina = deriveDefendStaminaAfterAction({
            action,
            origin,
            currentStamina: actor.pet.stats.currentStamina,
            maxStamina: actor.pet.stats.maxStamina,
          });
          newState = actor.playerId === newState.player.playerId
            ? { ...newState, player: { ...actor, pet: { ...actor.pet, stats: { ...actor.pet.stats, currentStamina: nextStamina } } } }
            : { ...newState, opponent: { ...actor, pet: { ...actor.pet, stats: { ...actor.pet.stats, currentStamina: nextStamina } } } };
        }
        break;
    }

    const isPlayer = playerId === newState.player.playerId;
    newState = isPlayer
      ? { ...newState, player: { ...newState.player, isReady: true } }
      : { ...newState, opponent: { ...newState.opponent, isReady: true } };
    newState.actionsThisRound++;

    if (action === CombatAction.ATTACK || action === CombatAction.COUNTER_ATTACK) {
      newState = isPlayer
        ? { ...newState, opponent: { ...newState.opponent, isReady: false } }
        : { ...newState, player: { ...newState.player, isReady: false } };
    }
    
    newState.actionHistory.push({
      action,
      origin,
      hpCommitment: actionHpCommitment,
      timestamp: get()._nextLogTick()
    });
    
    // Calculate next active player based on action and state
    // If fold, no next player (go to resolution)
    if (action === CombatAction.BRACE) {
      newState.activePlayerId = null;
    } else if (action === CombatAction.ATTACK || action === CombatAction.COUNTER_ATTACK) {
      // Raise/bet: other player must respond
      const otherPlayerId = isPlayer ? newState.opponent.playerId : newState.player.playerId;
      newState.activePlayerId = otherPlayerId;
    } else if (action === CombatAction.DEFEND || action === CombatAction.ENGAGE) {
      // Check or call: if both players have acted this round and bets match, round is over
      const bothActed = newState.player.isReady && newState.opponent.isReady;
      const betsMatch = newState.player.hpCommitted === newState.opponent.hpCommitted;
      const playerAllIn = newState.player.pet.stats.currentHealth === 0;
      const opponentAllIn = newState.opponent.pet.stats.currentHealth === 0;
      
      if (bothActed && (betsMatch || playerAllIn || opponentAllIn)) {
        // Round complete, will advance phase
        newState.activePlayerId = null;
      } else {
        // Other player needs to act
        const otherPlayerId = isPlayer ? newState.opponent.playerId : newState.player.playerId;
        newState.activePlayerId = otherPlayerId;
      }
    }
    
    debug.combat('[performPokerAction] Action completed:', {
      playerId,
      action,
      nextActivePlayerId: newState.activePlayerId,
      actionsThisRound: newState.actionsThisRound,
      playerReady: newState.player.isReady,
      opponentReady: newState.opponent.isReady
    });

	const afterResourceViolation = findPokerResourceViolation(newState);
	if (afterResourceViolation) {
		debug.combat('[performPokerAction] REJECTED: action produced invalid resources', afterResourceViolation);
		return;
	}

	const nextCombatState = applyLocalPokerTurnClock(newState);
	set({
		pokerCombatState: nextCombatState,
		...(nextPokerSpellState !== state.pokerSpellState ? { pokerSpellState: nextPokerSpellState } : {}),
	});

    // Post-commit: BRACE writes phase = RESOLUTION directly; every phase
    // writer emits phaseEntered so the phase shake fires for it too.
    if (newState.phase !== state.pokerCombatState.phase) {
      emitPhaseEntered({ phase: newState.phase });
    }
  },

  advancePokerPhase: () => {
    const state = get();
    if (!state.pokerCombatState) return;
    
    const combatState = state.pokerCombatState;
    
	    let newPhase = combatState.phase;
    let newCommunityCards = { ...combatState.communityCards };
    let deck = [...state.pokerDeck];
    
	    switch (combatState.phase) {
	      case PokerCombatPhase.MULLIGAN:
	        newPhase = PokerCombatPhase.PRE_FLOP;
	        break;
      case PokerCombatPhase.PRE_FLOP:
        newPhase = PokerCombatPhase.FAITH;
        const faithCards = [deck.pop()!, deck.pop()!, deck.pop()!];
        newCommunityCards.faith = faithCards;
        break;
      case PokerCombatPhase.FAITH:
        newPhase = PokerCombatPhase.FORESIGHT;
        const foresightCard = deck.pop()!;
        newCommunityCards.foresight = foresightCard;
        break;
      case PokerCombatPhase.FORESIGHT:
        newPhase = PokerCombatPhase.DESTINY;
        const destinyCard = deck.pop()!;
        newCommunityCards.destiny = destinyCard;
        break;
      case PokerCombatPhase.DESTINY:
        newPhase = PokerCombatPhase.RESOLUTION;
        break;
    }
    
	    // Ready state logic by phase type:
	    // - Poker decision phases: Reset to false, the active player needs to act
	    // - RESOLUTION: Set to true immediately, no actions needed
    const isResolutionPhase = newPhase === PokerCombatPhase.RESOLUTION;
    
	let phasedCombat: PokerCombatState = {
      ...combatState,
      player: {
        ...combatState.player,
        isReady: isResolutionPhase,
        currentAction: undefined,
      },
      opponent: {
        ...combatState.opponent,
        isReady: isResolutionPhase,
        currentAction: undefined,
      },
    };
    
    // Wager: betting_round_damage — deal damage to enemy hero at start of each betting round
	    if (newPhase !== PokerCombatPhase.RESOLUTION && newPhase !== PokerCombatPhase.MULLIGAN) {
      try {
        const gs = (globalThis as Record<string, any>).__ragnarokGameStore?.getState()?.gameState;
        if (gs) {
          for (const m of (gs.players?.player?.battlefield || [])) {
            const w = (m.card as any)?.wagerEffect;
            if (w?.type === 'betting_round_damage') {
              const hit = applyPokerHpDelta(phasedCombat, phasedCombat.opponent.playerId, -(w.value || 0));
              if (hit) {
                notifyOpponentHpDebit(phasedCombat, hit, 'betting_round_damage');
                phasedCombat = hit.state;
              }
				  emitWagerActivated({ wagerType: 'betting_round_damage', side: 'player' });
            }
          }
          for (const m of (gs.players?.opponent?.battlefield || [])) {
            const w = (m.card as any)?.wagerEffect;
            if (w?.type === 'betting_round_damage') {
              const hit = applyPokerHpDelta(phasedCombat, phasedCombat.player.playerId, -(w.value || 0));
              if (hit) phasedCombat = hit.state;
				  emitWagerActivated({ wagerType: 'betting_round_damage', side: 'opponent' });
            }
          }
        }
      } catch { /* safe to skip */ }
    }

    // Auto-post blinds when entering FAITH phase (NLH rules: SB=5, BB=10)
    let newPot = 0;
    let newCurrentBet = 0;
    let blindsJustPosted = false;
    let blindAllIn = false;
    
    if (newPhase === PokerCombatPhase.PRE_FLOP && !combatState.blindsPosted) {
      // Wager: double_blinds_bonus_multiplier (Reckless Bettor) — doubles blinds for the wager owner
      const recklessPlayer = hasWagerEffect('player', 'double_blinds_bonus_multiplier');
      const recklessOpponent = hasWagerEffect('opponent', 'double_blinds_bonus_multiplier');
      const blindMultiplier = (recklessPlayer || recklessOpponent) ? 2 : 1;
      const sbAmount = (combatState.blindConfig?.smallBlind || BLINDS.SB) * blindMultiplier;
      const bbAmount = (combatState.blindConfig?.bigBlind || BLINDS.BB) * blindMultiplier;
      
      const playerIsSB = combatState.playerPosition === 'small_blind';
      const sbChannelId = playerIsSB ? phasedCombat.player.playerId : phasedCombat.opponent.playerId;
      const bbChannelId = playerIsSB ? phasedCombat.opponent.playerId : phasedCombat.player.playerId;
      const sbPosted = commitPokerHp(phasedCombat, sbChannelId, sbAmount);
      if (sbPosted) phasedCombat = sbPosted.state;
      const bbPosted = commitPokerHp(phasedCombat, bbChannelId, bbAmount);
      if (bbPosted) phasedCombat = bbPosted.state;
      const sbActual = sbPosted ? -sbPosted.transition.applied : 0;
      const bbActual = bbPosted ? -bbPosted.transition.applied : 0;
      
      newPot = sbActual + bbActual;
      newCurrentBet = bbActual;
      blindsJustPosted = true;
      
      if (phasedCombat.player.pet.stats.currentHealth === 0 || phasedCombat.opponent.pet.stats.currentHealth === 0) {
        blindAllIn = true;
      }
      
      debug.combat('[advancePokerPhase] Blinds auto-posted:', {
        sbPlayer: playerIsSB ? 'player' : 'opponent',
        sbAmount: sbActual,
        bbPlayer: playerIsSB ? 'opponent' : 'player',
        bbAmount: bbActual,
        pot: newPot,
        blindAllIn
      });
    }

		// Wager effects can also debit the available HP while a phase is being
		// opened (before blinds are posted). Treat that deterministic zero-health
		// result exactly like a committed all-in; otherwise a peer can render 0 HP
		// while still waiting for a turn that no longer has a legal action.
		if (
			phasedCombat.player.pet.stats.currentHealth <= 0
			|| phasedCombat.opponent.pet.stats.currentHealth <= 0
		) {
			phasedCombat = { ...phasedCombat, isAllInShowdown: true };
		}

    // Use centralized utility for activePlayerId
    const ctx: ActivePlayerContext = {
      playerPosition: combatState.playerPosition,
      playerId: combatState.player.playerId,
      opponentId: combatState.opponent.playerId
    };
    const newActivePlayerId = getActivePlayerForPhase(newPhase, ctx);
    validateActivePlayer(newPhase, newActivePlayerId, 'advancePokerPhase');
    
    debug.combat('[advancePokerPhase] Phase transition:', {
      from: combatState.phase,
      to: newPhase,
      activePlayerId: newActivePlayerId,
      playerPosition: combatState.playerPosition
    });
    
    set({
      pokerDeck: deck,
      pokerCombatState: applyLocalPokerTurnClock({
        ...combatState,
        phase: newPhase,
        communityCards: newCommunityCards,
        player: phasedCombat.player,
        opponent: phasedCombat.opponent,
        pot: blindsJustPosted ? newPot : combatState.pot,
        currentBet: blindsJustPosted ? newCurrentBet : 0,
        blindsPosted: blindsJustPosted || combatState.blindsPosted,
        preflopBetMade: blindsJustPosted || combatState.preflopBetMade,
        isAllInShowdown: blindAllIn || combatState.isAllInShowdown || phasedCombat.isAllInShowdown,
        activePlayerId: newActivePlayerId,
        actionsThisRound: 0
      })
    });

    const phaseTick = get()._nextLogTick();
    get().addLogEntry({
      id: `phase_${phaseTick}`,
      timestamp: phaseTick,
      type: 'poker',
      message: `Poker phase advanced to ${newPhase}`
    });

    // Post-commit: phase drama shake for every FSM transition.
    emitPhaseEntered({ phase: newPhase });

    // Post-commit visual events for the cards dealt by this transition.
    if (newPhase === PokerCombatPhase.FAITH && newCommunityCards.faith) {
      newCommunityCards.faith.forEach((card, index) => {
        emitCommunityCardRevealed({ phase: newPhase, slotIndex: index, card });
      });
    } else if (newPhase === PokerCombatPhase.FORESIGHT && newCommunityCards.foresight) {
      emitCommunityCardRevealed({ phase: newPhase, slotIndex: 3, card: newCommunityCards.foresight });
    } else if (newPhase === PokerCombatPhase.DESTINY && newCommunityCards.destiny) {
      emitCommunityCardRevealed({ phase: newPhase, slotIndex: 4, card: newCommunityCards.destiny });
    }

		// In peer matches the AI-only all-in timer is intentionally disabled: a
		// signed action must be the trigger for every gameplay transition. Once a
		// player is all-in, however, there is no legal action left that could fire
		// another transition. Fast-forward the deterministic reveal sequence here
		// so both peers reach RESOLUTION from the same committed action. Emit the
		// current phase first so the presentation order remains FAITH -> FORESIGHT
		// -> DESTINY even though the reducer closes the sequence synchronously.
		if (phasedCombat.isAllInShowdown && newPhase !== PokerCombatPhase.RESOLUTION) {
			const afterPhase = get().pokerCombatState;
			if (afterPhase?.phase === newPhase && afterPhase.isAllInShowdown) {
				get().advancePokerPhase();
			}
		}
  },

  resolvePokerCombat: (): CombatResolution | null => {
    const state = get();
    const combatState = state.pokerCombatState;
    
    if (!combatState) return null;
    
    const playerMaxHP = combatState.player.pet.stats.maxHealth;
    const opponentMaxHP = combatState.opponent.pet.stats.maxHealth;
    const playerCurrentHP = combatState.player.pet.stats.currentHealth;
    const opponentCurrentHP = combatState.opponent.pet.stats.currentHealth;
    const playerCommitted = combatState.player.hpCommitted;
    const opponentCommitted = combatState.opponent.hpCommitted;
    let playerFinalArmor = combatState.player.heroArmor || 0;
    let opponentFinalArmor = combatState.opponent.heroArmor || 0;
    
    if (combatState.foldWinner) {
      const winner = combatState.foldWinner;
      const loser = winner === 'player' ? 'opponent' : 'player';
      
      let playerFinalHealth = playerCurrentHP;
      let opponentFinalHealth = opponentCurrentHP;
      
      // Winner recovers their own committed HP. Loser's stays deducted.
      if (winner === 'player') {
        playerFinalHealth = Math.min(playerCurrentHP + playerCommitted, playerMaxHP);
      } else {
        opponentFinalHealth = Math.min(opponentCurrentHP + opponentCommitted, opponentMaxHP);
      }

      // Fold-specific wager effects
      try {
        const useGameStore = (globalThis as Record<string, any>).__ragnarokGameStore;
        const gameState = useGameStore?.getState()?.gameState;
        if (gameState) {
          const winnerBf = gameState.players?.[winner]?.battlefield || [];
          const loserSide = winner === 'player' ? 'opponent' : 'player';
          const loserBf = gameState.players?.[loserSide]?.battlefield || [];
          // on_opponent_fold_heal: winner's minion heals winner when opponent folds
          for (const m of winnerBf) {
            const w = (m.card as any)?.wagerEffect;
            if (w?.type === 'on_opponent_fold_heal') {
              if (winner === 'player') playerFinalHealth = Math.min(playerFinalHealth + (w.value || 0), playerMaxHP);
              else opponentFinalHealth = Math.min(opponentFinalHealth + (w.value || 0), opponentMaxHP);
			      emitWagerActivated({ wagerType: 'on_opponent_fold_heal', side: winner });
            }
          }
          // fold_penalty_to_healing: loser's minion converts fold HP loss into healing
          for (const m of loserBf) {
            const w = (m.card as any)?.wagerEffect;
            if (w?.type === 'fold_penalty_to_healing') {
              const loserCommittedHP = winner === 'player' ? opponentCommitted : playerCommitted;
              if (winner === 'player') opponentFinalHealth = Math.min(opponentCurrentHP + loserCommittedHP, opponentMaxHP);
              else playerFinalHealth = Math.min(playerCurrentHP + loserCommittedHP, playerMaxHP);
			      emitWagerActivated({ wagerType: 'fold_penalty_to_healing', side: loserSide });
            }
          }
        }
      } catch { /* safe to skip */ }

      const loserCommitted = winner === 'player' ? opponentCommitted : playerCommitted;
      
      const emptyHand: EvaluatedHand = {
        rank: PokerHandRank.HIGH_CARD,
        cards: [],
        highCard: { suit: 'spades', value: 'A', numericValue: 14 },
        multiplier: 1,
        displayName: 'Fold',
        tieBreakers: []
      };
      
      const resolution: CombatResolution = {
        winner,
        resolutionType: 'fold',
        playerHand: emptyHand,
        opponentHand: emptyHand,
        playerDamage: 0,
        opponentDamage: 0,
        playerFinalHealth: Math.max(0, playerFinalHealth),
        opponentFinalHealth: Math.max(0, opponentFinalHealth),
        foldPenalty: loserCommitted,
        whoFolded: loser
      };

      const currentState = get();
      if (!currentState.pokerCombatState) return resolution;
      const settled = settleResolvedPokerHp(
        currentState.pokerCombatState,
        resolution.playerFinalHealth,
        resolution.opponentFinalHealth,
      );

      set({
        pokerCombatState: {
          ...settled,
          pot: 0,
          currentBet: 0,
          player: {
            ...settled.player,
            isReady: false,
            currentAction: undefined,
          },
          opponent: {
            ...settled.opponent,
            isReady: false,
            currentAction: undefined,
          }
        },
        pokerHandsWonPlayer: winner === 'player' ? currentState.pokerHandsWonPlayer + 1 : currentState.pokerHandsWonPlayer,
        pokerHandsWonOpponent: winner === 'opponent' ? currentState.pokerHandsWonOpponent + 1 : currentState.pokerHandsWonOpponent,
      });
      
      const foldTick = get()._nextLogTick();
      get().addLogEntry({
        id: `poker_fold_${foldTick}`,
        timestamp: foldTick,
        type: 'poker',
        message: `${loser} folded - ${winner} recovers HP (${loserCommitted} HP lost by ${loser})`
      });
      
      return resolution;
    }
    
    const communityCards: PokerCard[] = [
      ...(combatState.communityCards.faith || []),
      ...(combatState.communityCards.foresight ? [combatState.communityCards.foresight] : []),
      ...(combatState.communityCards.destiny ? [combatState.communityCards.destiny] : [])
    ];
    
    const playerHand = evaluatePokerHand(combatState.player.holeCards, communityCards);
    const opponentHand = evaluatePokerHand(combatState.opponent.holeCards, communityCards);

    // Wager: hand_rank_upgrade (Loki's Loaded Dice) — boost rank before winner determination
    try {
      const gs = (globalThis as Record<string, any>).__ragnarokGameStore?.getState()?.gameState;
      if (gs) {
        for (const m of (gs.players?.player?.battlefield || [])) {
          const w = (m.card as any)?.wagerEffect;
          if (w?.type === 'hand_rank_upgrade') playerHand.rank = Math.min(10, playerHand.rank + (w.ranks || 1));
        }
        for (const m of (gs.players?.opponent?.battlefield || [])) {
          const w = (m.card as any)?.wagerEffect;
          if (w?.type === 'hand_rank_upgrade') opponentHand.rank = Math.min(10, opponentHand.rank + (w.ranks || 1));
        }
      }
    } catch { /* safe to skip */ }

    let winner: 'player' | 'opponent' | 'draw';
    if (playerHand.rank > opponentHand.rank) {
      winner = 'player';
    } else if (opponentHand.rank > playerHand.rank) {
      winner = 'opponent';
    } else {
      const tieResult = compareTieBreakers(playerHand.tieBreakers, opponentHand.tieBreakers);
      if (tieResult > 0) {
        winner = 'player';
      } else if (tieResult < 0) {
        winner = 'opponent';
      } else {
        winner = 'draw';
      }
    }
    
    // ── v1.1: Apply Wager effects from battlefield minions ──
    let wagerBonusDamagePlayer = 0;
    let wagerBonusDamageOpponent = 0;
    let wagerHealPlayer = 0;
    let wagerHealOpponent = 0;
    let wagerDrawPlayer = 0;
    let wagerDrawOpponent = 0;
    let wagerAoeDamagePlayer = 0;
    let wagerAoeDamageOpponent = 0;
    let showdownMultiplier = 1;
    let playerCoinFlipIndex = 0;
    let opponentCoinFlipIndex = 0;
    try {
      const useGameStore = (globalThis as Record<string, any>).__ragnarokGameStore;
      const gameState = useGameStore?.getState()?.gameState;
      if (gameState) {
        const playerBf = gameState.players?.player?.battlefield || [];
        const opponentBf = gameState.players?.opponent?.battlefield || [];

        const applyShowdownWager = (wager: any, side: 'player' | 'opponent', hand: EvaluatedHand) => {
          const isWinner = winner === side;
          const isAllIn = side === 'player'
            ? combatState.player.pet.stats.currentHealth === 0
            : combatState.opponent.pet.stats.currentHealth === 0;

          switch (wager.type) {
            case 'showdown_win_armor':
              if (isWinner) { if (side === 'player') wagerHealPlayer += (wager.value || 0); else wagerHealOpponent += (wager.value || 0); }
              break;
            case 'showdown_coin_flip':
              {
                const flipIndex = side === 'player' ? playerCoinFlipIndex++ : opponentCoinFlipIndex++;
                const roll = getShowdownCoinFlipRoll({
                  combatId: combatState.combatId,
                  deterministicDeckSeed: combatState.deterministicDeckSeed,
                  side,
                  index: flipIndex,
                });
                if (roll < (wager.chance || 0.5)) {
                  if (side === 'player') wagerBonusDamagePlayer += (wager.damage || 0);
                  else wagerBonusDamageOpponent += (wager.damage || 0);
                }
              }
              break;
            case 'showdown_win_rank_damage':
              if (isWinner) { if (side === 'player') wagerBonusDamagePlayer += hand.rank; else wagerBonusDamageOpponent += hand.rank; }
              break;
            case 'showdown_aoe_damage':
              if (side === 'player') wagerAoeDamagePlayer += (wager.value || 0); else wagerAoeDamageOpponent += (wager.value || 0);
              break;
            case 'showdown_hand_rank_draw':
              if (isWinner && hand.rank >= (wager.minRank || 0)) { if (side === 'player') wagerDrawPlayer += (wager.drawCount || 0); else wagerDrawOpponent += (wager.drawCount || 0); }
              break;
            case 'showdown_win_draw_and_damage':
              if (isWinner) {
                if (side === 'player') { wagerDrawPlayer += (wager.drawCount || 0); wagerBonusDamagePlayer += (wager.damage || 0); }
                else { wagerDrawOpponent += (wager.drawCount || 0); wagerBonusDamageOpponent += (wager.damage || 0); }
              }
              break;
            case 'double_showdown_multiplier':
              showdownMultiplier *= 2;
              break;
            case 'all_in_bonus_with_cost':
              if (isAllIn) {
                if (side === 'player') { wagerBonusDamagePlayer += (wager.bonusDamage || 0); wagerHealPlayer -= (wager.selfDamage || 0); }
                else { wagerBonusDamageOpponent += (wager.bonusDamage || 0); wagerHealOpponent -= (wager.selfDamage || 0); }
              }
              break;
            // Betting-phase/UI effects — not resolved at showdown
            case 'on_opponent_fold_heal':
            case 'fold_penalty_to_healing':
            case 'all_in_buff_minions':
            case 'reveal_opponent_hole_cards':
            case 'peek_next_community_card':
            case 'hide_bet_actions':
            case 'increase_min_bet':
            case 'reduce_fold_penalty':
            case 'double_blinds_bonus_multiplier':
            case 'betting_round_damage':
            case 'hand_rank_upgrade':
              break;
          }

		  // 3-family separation: emit the typed presentation event for
		  // Family 3 (nft) wager-bearing frames. Gameplay remains local here.
		  if (isWagerType(wager.type)) {
		    emitWagerActivated({ wagerType: wager.type, side });
		  }
        };

        for (const m of playerBf) {
          const wager = (m.card as any)?.wagerEffect;
          if (wager) applyShowdownWager(wager, 'player', playerHand);
        }
        for (const m of opponentBf) {
          const wager = (m.card as any)?.wagerEffect;
          if (wager) applyShowdownWager(wager, 'opponent', opponentHand);
        }
      }
    } catch { /* game state unavailable during pure poker — safe to skip */ }

    const playerDamage = (playerCommitted + wagerBonusDamagePlayer) * showdownMultiplier;
    const opponentDamage = (opponentCommitted + wagerBonusDamageOpponent) * showdownMultiplier;

    let playerFinalHealth = playerCurrentHP;
    let opponentFinalHealth = opponentCurrentHP;
    
    debug.combat('[UNIFIED HP RESOLUTION] Before calculation:', {
      winner,
      playerCurrentHP,
      opponentCurrentHP,
      playerCommitted,
      opponentCommitted,
      playerArmor: playerFinalArmor,
      opponentArmor: opponentFinalArmor,
      pot: combatState.pot,
      playerHandRank: playerHand.displayName,
      opponentHandRank: opponentHand.displayName
    });
    
    if (winner === 'player') {
      // Winner recovers committed HP + wager heals
      playerFinalHealth = Math.min(playerCurrentHP + playerCommitted + wagerHealPlayer, playerMaxHP);
      opponentFinalHealth = opponentCurrentHP + wagerHealOpponent;
    } else if (winner === 'opponent') {
      // Winner recovers committed HP + wager heals
      opponentFinalHealth = Math.min(opponentCurrentHP + opponentCommitted + wagerHealOpponent, opponentMaxHP);
      playerFinalHealth = playerCurrentHP + wagerHealPlayer;
    } else {
      // Draw: both recover committed HP + keep wager heals
      playerFinalHealth = Math.min(playerCurrentHP + playerCommitted + wagerHealPlayer, playerMaxHP);
      opponentFinalHealth = Math.min(opponentCurrentHP + opponentCommitted + wagerHealOpponent, opponentMaxHP);
    }
    
    debug.combat('[UNIFIED HP RESOLUTION] After calculation:', {
      winner,
      playerFinalHealth,
      opponentFinalHealth,
      playerDamage,
      opponentDamage,
      playerFinalArmor,
      opponentFinalArmor,
      winnerRecovered: winner === 'player' ? playerCommitted : winner === 'opponent' ? opponentCommitted : 0,
      loserLostPermanently: winner === 'player' ? opponentCommitted : winner === 'opponent' ? playerCommitted : 0
    });
    
    const resolution: CombatResolution = {
      winner,
      resolutionType: 'showdown',
      playerHand,
      opponentHand,
      playerDamage: winner === 'player' ? 0 : playerDamage,
      opponentDamage: winner === 'opponent' ? 0 : opponentDamage,
      playerFinalHealth: Math.max(0, playerFinalHealth),
      opponentFinalHealth: Math.max(0, opponentFinalHealth),
      wagerDrawPlayer: wagerDrawPlayer || undefined,
      wagerDrawOpponent: wagerDrawOpponent || undefined,
      wagerAoeDamagePlayer: wagerAoeDamagePlayer || undefined,
      wagerAoeDamageOpponent: wagerAoeDamageOpponent || undefined,
    };

    const stateForUpdate = get();
    if (stateForUpdate.pokerCombatState) {
      const settled = settleResolvedPokerHp(
        stateForUpdate.pokerCombatState,
        resolution.playerFinalHealth,
        resolution.opponentFinalHealth,
      );
      set({
        pokerCombatState: {
          ...settled,
          winner,
          pot: 0,
          currentBet: 0,
          player: {
            ...settled.player,
            isReady: false,
            currentAction: undefined,
            heroArmor: playerFinalArmor,
          },
          opponent: {
            ...settled.opponent,
            isReady: false,
            currentAction: undefined,
            heroArmor: opponentFinalArmor,
          }
        },
        pokerHandsWonPlayer: winner === 'player' ? stateForUpdate.pokerHandsWonPlayer + 1 : stateForUpdate.pokerHandsWonPlayer,
        pokerHandsWonOpponent: winner === 'opponent' ? stateForUpdate.pokerHandsWonOpponent + 1 : stateForUpdate.pokerHandsWonOpponent,
      });
    }
    
    const showdownTick = get()._nextLogTick();
    get().addLogEntry({
      id: `poker_showdown_${showdownTick}`,
      timestamp: showdownTick,
      type: 'poker',
      message: `Showdown: ${winner === 'draw' ? 'Draw' : winner + ' wins'} - Player: ${playerHand.displayName}, Opponent: ${opponentHand.displayName}`
    });
    
    return resolution;
  },

  endPokerCombat: () => {
    cancelPendingPokerHandTransition();
    set({
      pokerCombatState: null,
      pokerDeck: [],
      pokerIsActive: false,
      mulliganComplete: false,
      isTransitioningHand: false,
      combatPhase: 'CHESS_MOVEMENT'
    });
    
    const endTick = get()._nextLogTick();
    get().addLogEntry({
      id: `poker_end_${endTick}`,
      timestamp: endTick,
      type: 'poker',
      message: 'Poker combat ended'
    });
  },

  drawPokerCards: (count: number): PokerCard[] => {
    const state = get();
    let deck = [...state.pokerDeck];
    
    if (deck.length < count) {
      const seed = state.pokerCombatState?.deterministicDeckSeed;
      const drawIndex = state.pokerCombatState?.actionHistory.length ?? 0;
      deck = createShuffledPokerDeck(seed ? `${seed}:draw:${drawIndex}` : undefined);
    }
    
    const drawnCards: PokerCard[] = [];
    for (let i = 0; i < count; i++) {
      const card = deck.pop();
      if (card) drawnCards.push(card);
    }
    
    set({ pokerDeck: deck });
    return drawnCards;
  },

  updatePokerTimer: (newTime: number) => {
    const state = get();
    if (!state.pokerCombatState) return;
    
    set({
      pokerCombatState: {
        ...state.pokerCombatState,
        turnTimer: newTime
      }
    });
  },

  syncPokerTurnClock: (input) => {
    const state = get();
    const combatState = state.pokerCombatState;
    if (!combatState) return;
    if (combatState.combatId !== input.combatId) return;
	    if (combatState.phase !== input.phase) return;
	    if (combatState.activePlayerId !== input.activePlayerId) return;
	    if (input.activePlayerId !== combatState.opponent.playerId) return;
	    if (combatState.actionsThisRound !== input.actionsThisRound) return;
	    if (!isTimedPokerDecisionPhase(input.phase)) return;
	    if (input.durationMs !== UNIVERSAL_POKER_TURN_CLOCK_POLICY.durationMs) return;
	    if (combatState.turnClockOwnerId === input.activePlayerId) return;

    const clock = createReceivedPokerTurnClock(input);
    if (!clock || clock.turnId !== input.turnId) return;

    set({
      pokerCombatState: {
        ...combatState,
        turnId: clock.turnId,
        turnStartedAtMs: clock.startedAtMs,
        turnDeadlineAtMs: clock.deadlineAtMs,
        turnClockOwnerId: input.activePlayerId,
        turnTimer: getPokerTurnRemainingSeconds({
          nowMs: input.receivedAtMs,
          deadlineAtMs: clock.deadlineAtMs,
        }),
      },
    });
  },

  applyNotarizedPokerTurnClock: (input) => {
    const state = get();
    const combatState = state.pokerCombatState;
    if (!combatState) return;
    if (combatState.combatId !== input.combatId) return;
    if (combatState.phase !== input.phase) return;
    if (combatState.activePlayerId !== input.activePlayerId) return;
    if (combatState.actionsThisRound !== input.actionsThisRound) return;
    if (!isTimedPokerDecisionPhase(input.phase)) return;

    const clock = createNotarizedPokerTurnClock(input);
    if (!clock || clock.turnId !== input.turnId) return;
    if (
      combatState.turnClockOwnerId === POKER_TURN_CLOCK_NOTARY_OWNER_ID
      && combatState.turnId === clock.turnId
    ) {
      return;
    }

    set({
      pokerCombatState: {
        ...combatState,
        turnId: clock.turnId,
        turnStartedAtMs: clock.startedAtMs,
        turnDeadlineAtMs: clock.deadlineAtMs,
        turnClockOwnerId: POKER_TURN_CLOCK_NOTARY_OWNER_ID,
        turnTimer: getPokerTurnRemainingSeconds({
          nowMs: input.receivedAtMs,
          deadlineAtMs: clock.deadlineAtMs,
        }),
      },
    });
  },

  setPlayerReady: (playerId: string) => {
    const state = get();
    if (!state.pokerCombatState) return;
    
    const newState = { ...state.pokerCombatState };
    const isPlayer = playerId === newState.player.playerId;
    
    if (isPlayer) {
      newState.player.isReady = true;
    } else {
      newState.opponent.isReady = true;
    }
    
    set({ pokerCombatState: newState });
  },

  healPlayerHero: (amount: number) => {
    const state = get();
    if (!state.pokerCombatState) return;
    const healed = applyPokerHpDeltaOnSlot(state.pokerCombatState, 'player', amount);
    if (healed) set({ pokerCombatState: healed.state });
  },

  healOpponentHero: (amount: number) => {
    const state = get();
    if (!state.pokerCombatState) return;
    const healed = applyPokerHpDeltaOnSlot(state.pokerCombatState, 'opponent', amount);
    if (healed) set({ pokerCombatState: healed.state });
  },

  setPlayerHeroBuffs: (buffs: { attack?: number; health?: number; armor?: number }) => {
    const state = get();
    if (!state.pokerCombatState) return;
    
    const playerPet = state.pokerCombatState.player.pet;
    const newStats = { ...playerPet.stats };
    const currentArmor = state.pokerCombatState.player.heroArmor || 0;
    
    if (buffs.attack !== undefined) {
      newStats.attack += buffs.attack;
    }

    let combat = state.pokerCombatState;
    if (buffs.health !== undefined) {
      const grown = growPokerHpMax(combat, combat.player.playerId, buffs.health);
      if (grown) {
        combat = grown.state;
      }
    }
    
    const newArmor = buffs.armor !== undefined ? currentArmor + buffs.armor : currentArmor;
    
    set({
      pokerCombatState: {
        ...combat,
        player: {
          ...combat.player,
          heroArmor: newArmor,
          pet: {
            ...combat.player.pet,
            stats: {
              ...combat.player.pet.stats,
              attack: newStats.attack,
            }
          }
        }
      }
    });
  },

  setOpponentHeroBuffs: (buffs: { attack?: number; health?: number; armor?: number }) => {
    const state = get();
    if (!state.pokerCombatState) return;

    const currentArmor = state.pokerCombatState.opponent.heroArmor || 0;
    let combat = state.pokerCombatState;
    if (buffs.health !== undefined) {
      const grown = growPokerHpMax(combat, combat.opponent.playerId, buffs.health);
      if (grown) {
        combat = grown.state;
      }
    }
    const newArmor = buffs.armor !== undefined ? currentArmor + buffs.armor : currentArmor;
    const newAttack = buffs.attack !== undefined
      ? combat.opponent.pet.stats.attack + buffs.attack
      : combat.opponent.pet.stats.attack;

    set({
      pokerCombatState: {
        ...combat,
        opponent: {
          ...combat.opponent,
          heroArmor: newArmor,
          pet: {
            ...combat.opponent.pet,
            stats: { ...combat.opponent.pet.stats, attack: newAttack },
          },
        },
      },
    });
  },

  addPlayerArmor: (amount: number) => {
    const state = get();
    if (!state.pokerCombatState) return;

    const currentArmor = state.pokerCombatState.player.heroArmor || 0;

    set({
      pokerCombatState: {
        ...state.pokerCombatState,
        player: {
          ...state.pokerCombatState.player,
          heroArmor: currentArmor + amount
        }
      }
    });
  },

  /*
    Mirror of addPlayerArmor for the opponent side. Wired specifically
    for boss-phase `add_armor` effects — bosses harden mid-fight as a
    desperation move or signature mechanic. Negative values clamp at
    zero so callers can also use this to strip armor (Ragnarok-tier
    spells, divine intervention, etc.).
  */
  addOpponentArmor: (amount: number) => {
    const state = get();
    if (!state.pokerCombatState) return;
    const currentArmor = state.pokerCombatState.opponent.heroArmor || 0;
    set({
      pokerCombatState: {
        ...state.pokerCombatState,
        opponent: {
          ...state.pokerCombatState.opponent,
          heroArmor: Math.max(0, currentArmor + amount),
        },
      },
    });
  },

  markBothPlayersReady: () => {
    const state = get();
    if (!state.pokerCombatState) return;
    
    set({
      pokerCombatState: {
        ...state.pokerCombatState,
        player: {
          ...state.pokerCombatState.player,
          isReady: true
        },
        opponent: {
          ...state.pokerCombatState.opponent,
          isReady: true
        }
      }
    });
  },

  startNextHand: (resolution?: CombatResolution) => {
    const state = get();
    if (!state.pokerCombatState) {
      set({ isTransitioningHand: false });
      return;
    }

    const playerFinalHP = resolution?.playerFinalHealth ?? state.pokerCombatState.player.pet.stats.currentHealth;
    const opponentFinalHP = resolution?.opponentFinalHealth ?? state.pokerCombatState.opponent.pet.stats.currentHealth;
    const settledHand = settleResolvedPokerHp(state.pokerCombatState, playerFinalHP, opponentFinalHP);

    if (playerFinalHP <= 0 || opponentFinalHP <= 0) {
      set({ isTransitioningHand: false });
      return;
    }
    
    let newDeck = [...state.pokerDeck];
    if (newDeck.length < 15) {
      const seed = state.pokerCombatState.deterministicDeckSeed;
      newDeck = createShuffledPokerDeck(seed ? `${seed}:next-hand:${state.pokerCombatState.actionHistory.length}` : undefined);
    }
    
    const dealt = dealCanonicalHoleCards(newDeck, state.pokerCombatState.deterministicPlayerRole);
    const playerHoleCards = dealt.playerHoleCards;
    const opponentHoleCards = dealt.opponentHoleCards;
    
    const STAMINA_REGEN_PER_HAND = 1;
    const playerNewStamina = Math.min(
      state.pokerCombatState.player.pet.stats.maxStamina,
      state.pokerCombatState.player.pet.stats.currentStamina + STAMINA_REGEN_PER_HAND
    );
    const opponentNewStamina = Math.min(
      state.pokerCombatState.opponent.pet.stats.maxStamina,
      state.pokerCombatState.opponent.pet.stats.currentStamina + STAMINA_REGEN_PER_HAND
    );
    
    const newPlayerPosition: PokerPosition = state.pokerCombatState.playerPosition === 'small_blind' ? 'big_blind' : 'small_blind';
    const newOpponentPosition: PokerPosition = state.pokerCombatState.opponentPosition === 'small_blind' ? 'big_blind' : 'small_blind';
    const newOpenerIsPlayer = newPlayerPosition === 'small_blind';
    
    // Use centralized utility for activePlayerId with NEW positions
    const ctx: ActivePlayerContext = {
      playerPosition: newPlayerPosition,
      playerId: state.pokerCombatState.player.playerId,
      opponentId: state.pokerCombatState.opponent.playerId
    };
	    const newActivePlayerId = getActivePlayerForPhase(PokerCombatPhase.PRE_FLOP, ctx);
	    validateActivePlayer(PokerCombatPhase.PRE_FLOP, newActivePlayerId, 'startNextHand');
    
    set({
      pokerDeck: newDeck,
      isTransitioningHand: false,
      pokerCombatState: applyLocalPokerTurnClock({
        ...state.pokerCombatState,
        handNumber: state.pokerCombatState.handNumber + 1,
	        phase: PokerCombatPhase.PRE_FLOP,
	        spellPetPhaseStartTime: undefined,
        pot: 0,
        currentBet: 0,
        turnTimer: state.pokerCombatState.maxTurnTime,
        actionHistory: [],
        foldWinner: undefined,
        winner: undefined,
        preflopBetMade: false,
        blindsPosted: false,
        isAllInShowdown: false,
        communityCards: { faith: [] },
        playerPosition: newPlayerPosition,
        opponentPosition: newOpponentPosition,
        openerIsPlayer: newOpenerIsPlayer,
        activePlayerId: newActivePlayerId,
        actionsThisRound: 0,
        player: {
          ...settledHand.player,
          holeCards: playerHoleCards,
          preBlindHealth: playerFinalHP,
          isReady: false,
          currentAction: undefined,
          pet: {
            ...settledHand.player.pet,
            stats: {
              ...settledHand.player.pet.stats,
              currentStamina: playerNewStamina
            }
          }
        },
        opponent: {
          ...settledHand.opponent,
          holeCards: opponentHoleCards,
          preBlindHealth: opponentFinalHP,
          isReady: false,
          currentAction: undefined,
          pet: {
            ...settledHand.opponent.pet,
            stats: {
              ...settledHand.opponent.pet.stats,
              currentStamina: opponentNewStamina
            }
          }
        }
      })
    });

	    // Post-commit: shake on the new-hand first poker turn transition.
	    emitPhaseEntered({ phase: PokerCombatPhase.PRE_FLOP });
  },

  startNextHandDelayed: (resolution: CombatResolution) => {
    const state = get();
    const scheduledCombatId = state.pokerCombatState?.combatId;
    if (!scheduledCombatId) {
      debug.combat('[startNextHandDelayed] Skipped: no active poker combat');
      return;
    }
    if (state.isTransitioningHand) {
      debug.combat('[startNextHandDelayed] Skipped: already transitioning');
      return;
    }

    cancelPendingPokerHandTransition();
    set({ isTransitioningHand: true });

    pendingNextHandTimeout = setTimeout(() => {
      pendingNextHandTimeout = null;
      const currentState = get();
      if (
        !currentState.pokerIsActive
        || currentState.pokerCombatState?.combatId !== scheduledCombatId
      ) {
        return;
      }
      try {
        currentState.startNextHand(resolution);
      } catch (err) {
        debug.error('[startNextHandDelayed] startNextHand threw:', err);
        set({ isTransitioningHand: false });
      }
    }, 2000);
  },

  cancelPendingPokerHandTransition,

  maybeCloseBettingRound: () => {
    const state = get();
    if (!state.pokerCombatState) return;
    
    const combatState = state.pokerCombatState;
    
    if (combatState.phase === PokerCombatPhase.RESOLUTION) {
      return;
    }

    if (!isTimedPokerDecisionPhase(combatState.phase)) {
      return;
    }
    
    // Auto-advance if fold occurred
    if (combatState.foldWinner) {
      state.advancePokerPhase();
      return;
    }
    
    const playerAvailableHP = combatState.player.pet.stats.currentHealth;
    const opponentAvailableHP = combatState.opponent.pet.stats.currentHealth;
    const playerAllIn = playerAvailableHP <= 0;
    const opponentAllIn = opponentAvailableHP <= 0;

    // An all-in action is terminal for betting: the other peer must not be
    // asked to author another action because the action validator correctly
    // rejects every intent once showdown mode is active. Promote both sides
    // to the phase barrier before the normal readiness/bet checks so an actor
    // reaching zero HP cannot leave the hand parked with the opponent waiting.
    if (combatState.isAllInShowdown || playerAllIn || opponentAllIn) {
      const allInState = combatState.isAllInShowdown
        && combatState.activePlayerId === null
        && combatState.player.isReady
        && combatState.opponent.isReady
        ? combatState
        : {
            ...combatState,
            isAllInShowdown: true,
            activePlayerId: null,
            player: { ...combatState.player, isReady: true },
            opponent: { ...combatState.opponent, isReady: true },
          };
      if (allInState !== combatState) {
        set({ pokerCombatState: allInState });
      }
      get().advancePokerPhase();
      return;
    }

    if (!combatState.player.isReady || !combatState.opponent.isReady) {
      return;
    }

    const currentBet = combatState.currentBet;
    const playerHP = combatState.player.hpCommitted;
    const opponentHP = combatState.opponent.hpCommitted;

    const bothCheckedThisRound = currentBet === 0;
    
    const betsMatched = currentBet > 0 
      ? (playerHP >= currentBet || playerAllIn) && (opponentHP >= currentBet || opponentAllIn)
      : true;
    
    const betsSettled = bothCheckedThisRound || betsMatched;
    
    if (!betsSettled) {
      return;
    }
    
		// An all-in hand has no next betting action. `advancePokerPhase` consumes
		// the remaining community-card phases recursively (with the guard above)
		// and lands on RESOLUTION immediately on both peers.
		get().advancePokerPhase();
  },

  applyDirectDamage: (targetPlayerId: 'player' | 'opponent', damage: number, sourceDescription?: string) => {
    const state = get();
    if (!state.pokerCombatState) return;

    const struck = applyPokerHpDeltaOnSlot(state.pokerCombatState, targetPlayerId, -damage);
    if (!struck) return;
    notifyOpponentHpDebit(state.pokerCombatState, struck, sourceDescription || 'direct-damage');

    const target = targetPlayerId === 'player' ? struck.state.player : struck.state.opponent;
    const damageTick = get()._nextLogTick();
    get().addLogEntry({
      id: `damage_${damageTick}`,
      timestamp: damageTick,
      type: 'damage',
      message: `${sourceDescription || 'Attack'} dealt ${damage} damage to ${target.playerName}`
    });

    const targetIsLethal = target.pet.stats.currentHealth <= 0;
    const nextState = targetIsLethal && isTimedPokerDecisionPhase(struck.state.phase)
      ? {
          ...struck.state,
          isAllInShowdown: true,
          activePlayerId: null,
          player: { ...struck.state.player, isReady: true },
          opponent: { ...struck.state.opponent, isReady: true },
        }
      : struck.state;
    set({ pokerCombatState: nextState });

    // Auxiliary damage is itself a committed command in P2P. Once it makes a
    // hero lethal, close the same deterministic showdown barrier used by a
    // wager action instead of waiting for a now-impossible betting response.
    if (targetIsLethal && isTimedPokerDecisionPhase(nextState.phase)) {
      get().advancePokerPhase();
    }
  },
  };
};
