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
  ElementBuff
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
import { getCachedHandEvaluation, clearHandCache } from '../../utils/poker/handCache';
import { compareHands } from '../../combat/modules/HandEvaluator';
import { debug } from '../../config/debugConfig';
import { applyStaminaShield, getExtraFoldPenalty } from '../../utils/poker/pokerSpellUtils';

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
> = (set, get) => ({
  pokerState: null,
  pokerCombatState: null,
  pokerDeck: [],
  pokerIsActive: false,
  mulliganComplete: false,
  isTransitioningHand: false,
  pokerHandsWonPlayer: 0,
  pokerHandsWonOpponent: 0,

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
    get().addLogEntry({
      id: `poker_end_${Date.now()}`,
      timestamp: Date.now(),
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
    firstStrikeTarget?: 'player' | 'opponent'
  ) => {
    clearHandCache();
    let deck = shuffleDeck(createPokerDeck());
    
    let playerHoleCards: PokerCard[] = [];
    let opponentHoleCards: PokerCard[] = [];
    
    if (skipMulligan) {
      playerHoleCards = [deck.pop()!, deck.pop()!];
      opponentHoleCards = [deck.pop()!, deck.pop()!];
    }
    
    const playerPosition: PokerPosition = 'small_blind';
    const opponentPosition: PokerPosition = 'big_blind';
    const openerIsPlayer = playerPosition === 'small_blind';
    const minBet = DEFAULT_BLIND_CONFIG.bigBlind;
    
    const FIRST_STRIKE_DAMAGE = 15;
    let startingPhase = skipMulligan ? PokerCombatPhase.SPELL_PET : PokerCombatPhase.MULLIGAN;
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
      startingPhase = PokerCombatPhase.SPELL_PET;
    }

    // All starting phases (MULLIGAN, SPELL_PET, FIRST_STRIKE) begin with isReady: false
    // SPELL_PET has a timing window managed by usePokerPhases, not immediate advancement
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
    
    const combatState: PokerCombatState = {
      combatId: `combat_${Date.now()}`,
      phase: startingPhase,
      player: playerCombatState,
      opponent: opponentCombatState,
      communityCards: { faith: [] },
      currentBet: 0,
      pot: 0,
      turnTimer: 60,
      maxTurnTime: 60,
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
      // Set SPELL_PET timing if starting in that phase (skipMulligan + no firstStrike)
      spellPetPhaseStartTime: startingPhase === PokerCombatPhase.SPELL_PET ? Date.now() : undefined
    };
    
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
    
    get().addLogEntry({
      id: `poker_init_${Date.now()}`,
      timestamp: Date.now(),
      type: 'poker',
      message: `Poker combat initialized: ${playerName} vs ${opponentName}`
    });
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
    const targetState = target === 'player' ? state.pokerCombatState.player : state.pokerCombatState.opponent;
    
    const newHealth = Math.max(1, targetState.pet.stats.currentHealth - damage);
    
    const updatedTargetState = {
      ...targetState,
      pet: {
        ...targetState.pet,
        stats: {
          ...targetState.pet.stats,
          currentHealth: newHealth
        }
      },
      preBlindHealth: newHealth
    };
    
    const nextPhase = state.mulliganComplete ? PokerCombatPhase.SPELL_PET : PokerCombatPhase.MULLIGAN;
    debug.combat(`[PokerCombatSlice] First strike damage ${damage} applied to ${target}, transitioning to phase: ${nextPhase}`);
    
    // Enter next phase with isReady: false
    // If going to SPELL_PET, it's a timed phase for card playing
    // usePokerPhases will handle the timing window and auto-advance
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
      pokerCombatState: {
        ...state.pokerCombatState,
        phase: nextPhase,
        spellPetPhaseStartTime: nextPhase === PokerCombatPhase.SPELL_PET ? Date.now() : undefined,
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
      }
    });
    
    get().addLogEntry({
      id: `first_strike_${Date.now()}`,
      timestamp: Date.now(),
      type: 'attack',
      message: `First strike! ${target === 'player' ? 'Player' : 'Opponent'} takes ${damage} damage`
    });
  },

  completeMulligan: () => {
    const state = get();
    if (!state.pokerCombatState || state.mulliganComplete) return;
    
    let deck = [...state.pokerDeck];
    const playerHoleCards = [deck.pop()!, deck.pop()!];
    const opponentHoleCards = [deck.pop()!, deck.pop()!];
    
    // Use centralized utility for activePlayerId
    const ctx: ActivePlayerContext = {
      playerPosition: state.pokerCombatState.playerPosition,
      playerId: state.pokerCombatState.player.playerId,
      opponentId: state.pokerCombatState.opponent.playerId
    };
    const newActivePlayerId = getActivePlayerForPhase(PokerCombatPhase.SPELL_PET, ctx);
    validateActivePlayer(PokerCombatPhase.SPELL_PET, newActivePlayerId, 'completeMulligan');
    
    // Enter SPELL_PET phase with isReady: false
    // SPELL_PET is a timed phase where players can play cards/spells
    // usePokerPhases will auto-advance to FAITH after the timing window
    set({
      pokerCombatState: {
        ...state.pokerCombatState,
        phase: PokerCombatPhase.SPELL_PET,
        spellPetPhaseStartTime: Date.now(),
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
      },
      pokerDeck: deck,
      mulliganComplete: true
    });
  },

  performPokerAction: (playerId: string, action: CombatAction, hpCommitment?: number) => {
    const state = get();
    if (!state.pokerCombatState) return;
    
    const newState = { ...state.pokerCombatState };

    // Store-level turn validation: reject out-of-turn actions
    // (SPELL_PET allows both players to act freely)
    if (newState.activePlayerId !== null &&
        newState.activePlayerId !== playerId &&
        newState.phase !== PokerCombatPhase.SPELL_PET) {
      debug.combat('[performPokerAction] REJECTED: not this player turn', { playerId, activePlayerId: newState.activePlayerId });
      return;
    }

    const isPlayer = playerId === newState.player.playerId;
    const playerState = isPlayer ? newState.player : newState.opponent;

    playerState.currentAction = action;
    
    switch (action) {
      case CombatAction.ATTACK:
        if (hpCommitment && hpCommitment > 0) {
          const availableHP = playerState.pet.stats.currentHealth;
          const actualBet = Math.min(hpCommitment, availableHP);
          playerState.hpCommitted += actualBet;
          playerState.pet.stats.currentHealth = Math.max(0, playerState.pet.stats.currentHealth - actualBet);
          newState.pot += actualBet;
          newState.currentBet = Math.max(newState.currentBet, playerState.hpCommitted);
          newState.preflopBetMade = true;
          // Deduct STA for betting (1 STA per 10 HP committed)
          const betStaCost = Math.ceil(actualBet / 10);
          if (betStaCost > 0) {
            playerState.pet.stats.currentStamina = Math.max(0, playerState.pet.stats.currentStamina - betStaCost);
            debug.combat(`[STA] ${isPlayer ? 'Player' : 'Opponent'} bet ${actualBet} HP: -${betStaCost} STA (now ${playerState.pet.stats.currentStamina}/${playerState.pet.stats.maxStamina})`);
          }
          if (!newState.blindsPosted) {
            newState.blindsPosted = true;
          }
          if (playerState.pet.stats.currentHealth === 0) {
            newState.isAllInShowdown = true;
          }
        }
        break;

      case CombatAction.COUNTER_ATTACK:
        {
          const callAmount = Math.max(0, newState.currentBet - playerState.hpCommitted);
          const raiseAmount = hpCommitment || 0;
          const totalNeeded = callAmount + raiseAmount;
          const availableHP = playerState.pet.stats.currentHealth;
          const actualTotal = Math.min(totalNeeded, availableHP);
          playerState.hpCommitted += actualTotal;
          playerState.pet.stats.currentHealth = Math.max(0, playerState.pet.stats.currentHealth - actualTotal);
          newState.pot += actualTotal;
          newState.currentBet = Math.max(newState.currentBet, playerState.hpCommitted);
          newState.preflopBetMade = true;
          // Deduct STA for raising (1 STA per 10 HP committed)
          const raiseStaCost = Math.ceil(actualTotal / 10);
          if (raiseStaCost > 0) {
            playerState.pet.stats.currentStamina = Math.max(0, playerState.pet.stats.currentStamina - raiseStaCost);
            debug.combat(`[STA] ${isPlayer ? 'Player' : 'Opponent'} raised ${actualTotal} HP: -${raiseStaCost} STA (now ${playerState.pet.stats.currentStamina}/${playerState.pet.stats.maxStamina})`);
          }
          if (!newState.blindsPosted) {
            newState.blindsPosted = true;
          }
          if (playerState.pet.stats.currentHealth === 0) {
            newState.isAllInShowdown = true;
          }
        }
        break;
        
      case CombatAction.ENGAGE:
        const toMatch = Math.min(newState.currentBet - playerState.hpCommitted, playerState.pet.stats.currentHealth);
        if (toMatch > 0) {
          playerState.hpCommitted += toMatch;
          playerState.pet.stats.currentHealth = Math.max(0, playerState.pet.stats.currentHealth - toMatch);
          newState.pot += toMatch;
        }
        if (playerState.pet.stats.currentHealth === 0 && playerState.hpCommitted < newState.currentBet) {
          const otherPlayer = isPlayer ? newState.opponent : newState.player;
          const excess = otherPlayer.hpCommitted - playerState.hpCommitted;
          if (excess > 0) {
            otherPlayer.hpCommitted -= excess;
            otherPlayer.pet.stats.currentHealth += excess;
            newState.pot -= excess;
            newState.currentBet = playerState.hpCommitted;
          }
        }
        if (playerState.pet.stats.currentHealth === 0 || 
            (isPlayer ? newState.opponent : newState.player).pet.stats.currentHealth === 0) {
          newState.isAllInShowdown = true;
        }
        if (!newState.blindsPosted) {
          newState.blindsPosted = true;
        }
        break;
        
      case CombatAction.BRACE:
        const folderIsPlayer = playerId === newState.player.playerId;
        const folderSide: 'player' | 'opponent' = folderIsPlayer ? 'player' : 'opponent';
        
        // Force blind posting if folding before FAITH phase (e.g. during SPELL_PET)
        // This ensures the folder always loses at least their blind HP
        if (!newState.blindsPosted) {
          const sbBlind = newState.blindConfig?.smallBlind || BLINDS.SB;
          const bbBlind = newState.blindConfig?.bigBlind || BLINDS.BB;
          const sbPlayer = newState.playerPosition === 'small_blind' ? newState.player : newState.opponent;
          const bbPlayer = newState.playerPosition === 'big_blind' ? newState.player : newState.opponent;
          
          const sbAmount = Math.min(sbBlind, sbPlayer.pet.stats.currentHealth);
          const bbAmount = Math.min(bbBlind, bbPlayer.pet.stats.currentHealth);
          
          sbPlayer.pet.stats.currentHealth -= sbAmount;
          sbPlayer.hpCommitted += sbAmount;
          bbPlayer.pet.stats.currentHealth -= bbAmount;
          bbPlayer.hpCommitted += bbAmount;
          newState.pot += sbAmount + bbAmount;
          newState.currentBet = bbAmount;
          newState.blindsPosted = true;
          
          debug.combat(`[BRACE] Force-posted blinds before fold: SB=${sbAmount}, BB=${bbAmount}`);
        }
        
        // Base fold STA penalty
        let foldStaPenalty = 1;
        
        // Check fold curse from spell state (extra -1 STA)
        const spellState = get().pokerSpellState;
        if (spellState) {
          foldStaPenalty += getExtraFoldPenalty(spellState, folderSide);
          
          // Apply stamina shield absorption
          const shieldResult = applyStaminaShield(spellState, folderSide, foldStaPenalty);
          foldStaPenalty = shieldResult.reducedPenalty;
          
          // Update spell state if shield was consumed
          if (shieldResult.newState !== spellState) {
            set({ pokerSpellState: shieldResult.newState });
          }
        }
        
        // Deduct STA from folder
        if (foldStaPenalty > 0) {
          playerState.pet.stats.currentStamina = Math.max(0, playerState.pet.stats.currentStamina - foldStaPenalty);
          debug.combat(`[STA] ${folderSide} folded: -${foldStaPenalty} STA (now ${playerState.pet.stats.currentStamina}/${playerState.pet.stats.maxStamina})`);
        }
        
        newState.foldWinner = folderIsPlayer ? 'opponent' : 'player';
        newState.phase = PokerCombatPhase.RESOLUTION;
        newState.player.isReady = true;
        newState.opponent.isReady = true;
        newState.activePlayerId = null;
        break;
        
      case CombatAction.DEFEND:
        playerState.pet.stats.currentStamina = Math.min(
          playerState.pet.stats.maxStamina,
          playerState.pet.stats.currentStamina + 1
        );
        break;
    }
    
    playerState.isReady = true;
    newState.actionsThisRound++;

    if (action === CombatAction.ATTACK || action === CombatAction.COUNTER_ATTACK) {
      const otherPlayer = isPlayer ? newState.opponent : newState.player;
      otherPlayer.isReady = false;
    }
    
    newState.actionHistory.push({
      action,
      hpCommitment: hpCommitment || 0,
      timestamp: Date.now()
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
    
    set({ pokerCombatState: newState });
  },

  advancePokerPhase: () => {
    const state = get();
    if (!state.pokerCombatState) return;
    
    const combatState = state.pokerCombatState;
    
    // Prevent advancement from SPELL_PET to FAITH if a player is currently acting
    // UNLESS both players are ready (timer expired or both clicked Ready)
    // This allows the 2.5s timer to advance the phase even if no actions were taken
    if (combatState.phase === PokerCombatPhase.SPELL_PET && 
        combatState.activePlayerId !== null && 
        combatState.actionsThisRound === 0 &&
        !(combatState.player.isReady && combatState.opponent.isReady)) {
      debug.combat('[advancePokerPhase] Blocking auto-advance: waiting for first action or Ready click');
      return;
    }

    let newPhase = combatState.phase;
    let newCommunityCards = { ...combatState.communityCards };
    let deck = [...state.pokerDeck];
    
    switch (combatState.phase) {
      case PokerCombatPhase.MULLIGAN:
        newPhase = PokerCombatPhase.SPELL_PET;
        break;
      case PokerCombatPhase.SPELL_PET:
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
    // - SPELL_PET: Reset to false, phase has timing window for card playing
    // - FAITH/FORESIGHT/DESTINY: Reset to false, players need to bet
    // - RESOLUTION: Set to true immediately, no actions needed
    const isResolutionPhase = newPhase === PokerCombatPhase.RESOLUTION;
    
    const newPlayer = { 
      ...combatState.player, 
      isReady: isResolutionPhase,
      currentAction: undefined 
    };
    const newOpponent = { 
      ...combatState.opponent, 
      isReady: isResolutionPhase,
      currentAction: undefined 
    };
    
    // Wager: betting_round_damage — deal damage to enemy hero at start of each betting round
    if (newPhase !== PokerCombatPhase.RESOLUTION && newPhase !== PokerCombatPhase.SPELL_PET && newPhase !== PokerCombatPhase.MULLIGAN) {
      try {
        const gs = (globalThis as Record<string, any>).__ragnarokGameStore?.getState()?.gameState;
        if (gs) {
          for (const m of (gs.players?.player?.battlefield || [])) {
            const w = (m.card as any)?.wagerEffect;
            if (w?.type === 'betting_round_damage') newOpponent.pet.stats.currentHealth = Math.max(0, newOpponent.pet.stats.currentHealth - (w.value || 0));
          }
          for (const m of (gs.players?.opponent?.battlefield || [])) {
            const w = (m.card as any)?.wagerEffect;
            if (w?.type === 'betting_round_damage') newPlayer.pet.stats.currentHealth = Math.max(0, newPlayer.pet.stats.currentHealth - (w.value || 0));
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
      const sbPlayer = playerIsSB ? newPlayer : newOpponent;
      const bbPlayer = playerIsSB ? newOpponent : newPlayer;
      
      const sbActual = Math.min(sbAmount, sbPlayer.pet.stats.currentHealth);
      const bbActual = Math.min(bbAmount, bbPlayer.pet.stats.currentHealth);
      
      sbPlayer.pet = { ...sbPlayer.pet, stats: { ...sbPlayer.pet.stats, currentHealth: sbPlayer.pet.stats.currentHealth - sbActual } };
      bbPlayer.pet = { ...bbPlayer.pet, stats: { ...bbPlayer.pet.stats, currentHealth: bbPlayer.pet.stats.currentHealth - bbActual } };
      sbPlayer.hpCommitted = sbActual;
      bbPlayer.hpCommitted = bbActual;
      
      newPot = sbActual + bbActual;
      newCurrentBet = bbActual;
      blindsJustPosted = true;
      
      if (sbPlayer.pet.stats.currentHealth === 0 || bbPlayer.pet.stats.currentHealth === 0) {
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
      pokerCombatState: {
        ...combatState,
        phase: newPhase,
        communityCards: newCommunityCards,
        player: newPlayer,
        opponent: newOpponent,
        pot: blindsJustPosted ? newPot : combatState.pot,
        currentBet: blindsJustPosted ? newCurrentBet : 0,
        blindsPosted: blindsJustPosted || combatState.blindsPosted,
        preflopBetMade: blindsJustPosted || combatState.preflopBetMade,
        isAllInShowdown: blindAllIn || combatState.isAllInShowdown,
        activePlayerId: newActivePlayerId,
        actionsThisRound: 0
      }
    });
    
    get().addLogEntry({
      id: `phase_${Date.now()}`,
      timestamp: Date.now(),
      type: 'poker',
      message: `Poker phase advanced to ${newPhase}`
    });
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
            }
          }
          // fold_penalty_to_healing: loser's minion converts fold HP loss into healing
          for (const m of loserBf) {
            const w = (m.card as any)?.wagerEffect;
            if (w?.type === 'fold_penalty_to_healing') {
              const loserCommittedHP = winner === 'player' ? opponentCommitted : playerCommitted;
              if (winner === 'player') opponentFinalHealth = Math.min(opponentCurrentHP + loserCommittedHP, opponentMaxHP);
              else playerFinalHealth = Math.min(playerCurrentHP + loserCommittedHP, playerMaxHP);
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

      set({
        pokerCombatState: {
          ...currentState.pokerCombatState,
          pot: 0,
          currentBet: 0,
          player: {
            ...currentState.pokerCombatState.player,
            hpCommitted: 0,
            isReady: false,
            currentAction: undefined,
            pet: {
              ...currentState.pokerCombatState.player.pet,
              stats: {
                ...currentState.pokerCombatState.player.pet.stats,
                currentHealth: resolution.playerFinalHealth
              }
            }
          },
          opponent: {
            ...currentState.pokerCombatState.opponent,
            hpCommitted: 0,
            isReady: false,
            currentAction: undefined,
            pet: {
              ...currentState.pokerCombatState.opponent.pet,
              stats: {
                ...currentState.pokerCombatState.opponent.pet.stats,
                currentHealth: resolution.opponentFinalHealth
              }
            }
          }
        },
        pokerHandsWonPlayer: winner === 'player' ? currentState.pokerHandsWonPlayer + 1 : currentState.pokerHandsWonPlayer,
        pokerHandsWonOpponent: winner === 'opponent' ? currentState.pokerHandsWonOpponent + 1 : currentState.pokerHandsWonOpponent,
      });
      
      get().addLogEntry({
        id: `poker_fold_${Date.now()}`,
        timestamp: Date.now(),
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
              if (Math.random() < (wager.chance || 0.5)) { if (side === 'player') wagerBonusDamagePlayer += (wager.damage || 0); else wagerBonusDamageOpponent += (wager.damage || 0); }
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
      set({
        pokerCombatState: {
          ...stateForUpdate.pokerCombatState,
          winner,
          pot: 0,
          currentBet: 0,
          player: {
            ...stateForUpdate.pokerCombatState.player,
            hpCommitted: 0,
            isReady: false,
            currentAction: undefined,
            heroArmor: playerFinalArmor,
            pet: {
              ...stateForUpdate.pokerCombatState.player.pet,
              stats: {
                ...stateForUpdate.pokerCombatState.player.pet.stats,
                currentHealth: resolution.playerFinalHealth
              }
            }
          },
          opponent: {
            ...stateForUpdate.pokerCombatState.opponent,
            hpCommitted: 0,
            isReady: false,
            currentAction: undefined,
            heroArmor: opponentFinalArmor,
            pet: {
              ...stateForUpdate.pokerCombatState.opponent.pet,
              stats: {
                ...stateForUpdate.pokerCombatState.opponent.pet.stats,
                currentHealth: resolution.opponentFinalHealth
              }
            }
          }
        },
        pokerHandsWonPlayer: winner === 'player' ? stateForUpdate.pokerHandsWonPlayer + 1 : stateForUpdate.pokerHandsWonPlayer,
        pokerHandsWonOpponent: winner === 'opponent' ? stateForUpdate.pokerHandsWonOpponent + 1 : stateForUpdate.pokerHandsWonOpponent,
      });
    }
    
    get().addLogEntry({
      id: `poker_showdown_${Date.now()}`,
      timestamp: Date.now(),
      type: 'poker',
      message: `Showdown: ${winner === 'draw' ? 'Draw' : winner + ' wins'} - Player: ${playerHand.displayName}, Opponent: ${opponentHand.displayName}`
    });
    
    return resolution;
  },

  endPokerCombat: () => {
    set({
      pokerCombatState: null,
      pokerDeck: [],
      pokerIsActive: false,
      mulliganComplete: false,
      isTransitioningHand: false,
      combatPhase: 'CHESS_MOVEMENT'
    });
    
    get().addLogEntry({
      id: `poker_end_${Date.now()}`,
      timestamp: Date.now(),
      type: 'poker',
      message: 'Poker combat ended'
    });
  },

  drawPokerCards: (count: number): PokerCard[] => {
    const state = get();
    let deck = [...state.pokerDeck];
    
    if (deck.length < count) {
      deck = shuffleDeck(createPokerDeck());
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
    
    const currentHealth = state.pokerCombatState.player.pet.stats.currentHealth;
    const maxHealth = state.pokerCombatState.player.pet.stats.maxHealth;
    const newHealth = Math.min(currentHealth + amount, maxHealth);
    
    set({
      pokerCombatState: {
        ...state.pokerCombatState,
        player: {
          ...state.pokerCombatState.player,
          pet: {
            ...state.pokerCombatState.player.pet,
            stats: {
              ...state.pokerCombatState.player.pet.stats,
              currentHealth: newHealth
            }
          }
        }
      }
    });
  },

  healOpponentHero: (amount: number) => {
    const state = get();
    if (!state.pokerCombatState) return;
    
    const currentHealth = state.pokerCombatState.opponent.pet.stats.currentHealth;
    const maxHealth = state.pokerCombatState.opponent.pet.stats.maxHealth;
    const newHealth = Math.min(currentHealth + amount, maxHealth);
    
    set({
      pokerCombatState: {
        ...state.pokerCombatState,
        opponent: {
          ...state.pokerCombatState.opponent,
          pet: {
            ...state.pokerCombatState.opponent.pet,
            stats: {
              ...state.pokerCombatState.opponent.pet.stats,
              currentHealth: newHealth
            }
          }
        }
      }
    });
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
    if (buffs.health !== undefined) {
      newStats.maxHealth += buffs.health;
      newStats.currentHealth += buffs.health;
    }
    
    const newArmor = buffs.armor !== undefined ? currentArmor + buffs.armor : currentArmor;
    
    set({
      pokerCombatState: {
        ...state.pokerCombatState,
        player: {
          ...state.pokerCombatState.player,
          heroArmor: newArmor,
          pet: {
            ...playerPet,
            stats: newStats
          }
        }
      }
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

    if (playerFinalHP <= 0 || opponentFinalHP <= 0) {
      set({ isTransitioningHand: false });
      return;
    }
    
    let newDeck = [...state.pokerDeck];
    if (newDeck.length < 15) {
      newDeck = shuffleDeck(createPokerDeck());
    }
    
    const playerHoleCards = [newDeck.pop()!, newDeck.pop()!];
    const opponentHoleCards = [newDeck.pop()!, newDeck.pop()!];
    
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
    const newActivePlayerId = getActivePlayerForPhase(PokerCombatPhase.SPELL_PET, ctx);
    validateActivePlayer(PokerCombatPhase.SPELL_PET, newActivePlayerId, 'startNextHand');
    
    set({
      pokerDeck: newDeck,
      isTransitioningHand: false,
      pokerCombatState: {
        ...state.pokerCombatState,
        phase: PokerCombatPhase.SPELL_PET,
        spellPetPhaseStartTime: Date.now(),
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
          ...state.pokerCombatState.player,
          holeCards: playerHoleCards,
          hpCommitted: 0,
          preBlindHealth: playerFinalHP,
          isReady: false,
          currentAction: undefined,
          pet: {
            ...state.pokerCombatState.player.pet,
            stats: {
              ...state.pokerCombatState.player.pet.stats,
              currentHealth: playerFinalHP,
              currentStamina: playerNewStamina
            }
          }
        },
        opponent: {
          ...state.pokerCombatState.opponent,
          holeCards: opponentHoleCards,
          hpCommitted: 0,
          preBlindHealth: opponentFinalHP,
          isReady: false,
          currentAction: undefined,
          pet: {
            ...state.pokerCombatState.opponent.pet,
            stats: {
              ...state.pokerCombatState.opponent.pet.stats,
              currentHealth: opponentFinalHP,
              currentStamina: opponentNewStamina
            }
          }
        }
      }
    });
  },

  startNextHandDelayed: (resolution: CombatResolution) => {
    const state = get();
    if (state.isTransitioningHand) {
      debug.combat('[startNextHandDelayed] Skipped: already transitioning');
      return;
    }

    set({ isTransitioningHand: true });

    setTimeout(() => {
      try {
        get().startNextHand(resolution);
      } catch (err) {
        debug.error('[startNextHandDelayed] startNextHand threw:', err);
        set({ isTransitioningHand: false });
      }
    }, 2000);
  },

  maybeCloseBettingRound: () => {
    const state = get();
    if (!state.pokerCombatState) return;
    
    const combatState = state.pokerCombatState;
    
    if (combatState.phase === PokerCombatPhase.RESOLUTION) {
      return;
    }
    
    // Auto-advance if fold occurred
    if (combatState.foldWinner) {
      state.advancePokerPhase();
      return;
    }
    
    if (!combatState.player.isReady || !combatState.opponent.isReady) {
      return;
    }
    
    if (combatState.phase === PokerCombatPhase.SPELL_PET) {
      get().advancePokerPhase();
      return;
    }
    
    const currentBet = combatState.currentBet;
    const playerHP = combatState.player.hpCommitted;
    const opponentHP = combatState.opponent.hpCommitted;
    const playerAvailableHP = combatState.player.pet.stats.currentHealth;
    const opponentAvailableHP = combatState.opponent.pet.stats.currentHealth;
    const playerAllIn = playerAvailableHP <= 0;
    const opponentAllIn = opponentAvailableHP <= 0;
    
    const bothCheckedThisRound = currentBet === 0;
    
    const playerMatchedBet = playerHP >= currentBet || playerAllIn;
    const opponentMatchedBet = opponentHP >= currentBet || opponentAllIn;
    
    const betsMatched = currentBet > 0 
      ? (playerHP >= currentBet || playerAllIn) && (opponentHP >= currentBet || opponentAllIn)
      : true;
    
    const betsSettled = bothCheckedThisRound || betsMatched;
    
    if (!betsSettled) {
      return;
    }
    
    const eitherAllIn = playerAllIn || opponentAllIn;
    if (eitherAllIn && !combatState.isAllInShowdown) {
      debug.combat('[maybeCloseBettingRound] All-in detected, enabling showdown mode');
      set({
        pokerCombatState: {
          ...combatState,
          isAllInShowdown: true
        }
      });
    }
    
    get().advancePokerPhase();
  },

  applyDirectDamage: (targetPlayerId: 'player' | 'opponent', damage: number, sourceDescription?: string) => {
    const state = get();
    if (!state.pokerCombatState) return;
    
    const isPlayer = targetPlayerId === 'player';
    const target = isPlayer ? state.pokerCombatState.player : state.pokerCombatState.opponent;
    
    const newHealth = Math.max(0, target.pet.stats.currentHealth - damage);
    
    get().addLogEntry({
      id: `damage_${Date.now()}`,
      timestamp: Date.now(),
      type: 'damage',
      message: `${sourceDescription || 'Attack'} dealt ${damage} damage to ${target.playerName}`
    });
    
    if (isPlayer) {
      set({
        pokerCombatState: {
          ...state.pokerCombatState,
          player: {
            ...state.pokerCombatState.player,
            pet: {
              ...state.pokerCombatState.player.pet,
              stats: {
                ...state.pokerCombatState.player.pet.stats,
                currentHealth: newHealth
              }
            }
          }
        }
      });
    } else {
      set({
        pokerCombatState: {
          ...state.pokerCombatState,
          opponent: {
            ...state.pokerCombatState.opponent,
            pet: {
              ...state.pokerCombatState.opponent.pet,
              stats: {
                ...state.pokerCombatState.opponent.pet.stats,
                currentHealth: newHealth
              }
            }
          }
        }
      });
    }
  },
});
