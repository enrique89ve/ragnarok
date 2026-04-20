/**
 * SmartAI.ts
 * 
 * Intelligent AI decision-making for poker combat.
 * Uses hand strength, pot odds, and position to make strategic decisions.
 */

import {
  CombatAction,
  CombatPhase,
  PokerCombatState,
  PlayerCombatState,
  PokerCard
} from '../../types/PokerCombatTypes';
import { calculateHandStrength, findBestHand } from './HandEvaluator';
import { COMBAT_DEBUG } from '../debugConfig';
import { debug } from '../../config/debugConfig';

export interface AIDecision {
  action: CombatAction;
  betAmount: number;
  reasoning: string;
}

export interface AIConfig {
  aggressiveness: number;
  bluffFrequency: number;
  tightness: number;
}

const DEFAULT_AI_CONFIG: AIConfig = {
  aggressiveness: 0.5,
  bluffFrequency: 0.15,
  tightness: 0.6
};

/**
 * Calculate pot odds as a ratio
 */
function calculatePotOdds(toCall: number, potSize: number): number {
  if (toCall <= 0) return 1;
  return potSize / (potSize + toCall);
}

/**
 * Determine if we should bluff based on config and randomness
 */
function shouldBluff(config: AIConfig, handStrength: number): boolean {
  if (handStrength > 0.3) return false;
  return Math.random() < config.bluffFrequency * (1 - handStrength);
}

/**
 * Get AI's best action based on current game state
 * Uses Ragnarok betting rules: min bet 5 HP, no preflop checks
 */
export function getSmartAIAction(
  combatState: PokerCombatState,
  isPlayer: boolean = false,
  config: AIConfig = DEFAULT_AI_CONFIG
): AIDecision {
  const actor = isPlayer ? combatState.player : combatState.opponent;
  
  const availableHP = actor.pet.stats.currentHealth;
  const toCall = Math.max(0, combatState.currentBet - actor.hpCommitted);
  const hasBetToCall = toCall > 0;
  const minBet = combatState.minBet; // 5 HP minimum in Ragnarok
  
  // Ragnarok "preflop" = first betting round (SPELL_PET or FAITH phase)
  // NO checking allowed - must bet or fold (opener) or call/raise/fold (after bet)
  const isFirstBettingRound = combatState.phase === CombatPhase.SPELL_PET || combatState.phase === CombatPhase.PRE_FLOP || combatState.phase === CombatPhase.FAITH;
  const mustBetOrFold = isFirstBettingRound && !hasBetToCall; // Must bet if no current bet in first round
  
  const communityCards = getCommunityCards(combatState);
  const handStrength = calculateHandStrength(actor.holeCards, communityCards);
  const potOdds = calculatePotOdds(toCall, combatState.pot);
  
  // Use actual position from combatState (SB = early/button, BB = late/out of position)
  // In standard poker, SB acts first preflop (early position)
  const actorPosition = isPlayer ? combatState.playerPosition : combatState.opponentPosition;
  const position = actorPosition === 'small_blind' ? 'early' : 'late';
  
  debug.ai(`[SmartAI] Phase: ${combatState.phase}, Hand strength: ${(handStrength * 100).toFixed(1)}%, Pot odds: ${(potOdds * 100).toFixed(1)}%`);
  debug.ai(`[SmartAI] Position: ${actorPosition}, firstBettingRound: ${isFirstBettingRound}, hasBetToCall: ${hasBetToCall}, toCall: ${toCall}`);
  debug.ai(`[SmartAI] availableHP: ${availableHP}, currentBet: ${combatState.currentBet}, actorHpCommitted: ${actor.hpCommitted}`);
  
  if (availableHP <= 0) {
    if (hasBetToCall) {
      debug.ai(`[SmartAI] DECISION: ENGAGE (All-in call)`);
      return {
        action: CombatAction.ENGAGE,
        betAmount: 0,
        reasoning: 'Already all-in, must call to see cards'
      };
    }
    debug.ai(`[SmartAI] DECISION: DEFEND (All-in check)`);
    return {
      action: CombatAction.DEFEND,
      betAmount: 0,
      reasoning: 'Already all-in, checking'
    };
  }
  
  const adjustedStrength = handStrength + (position === 'late' ? 0.05 : 0);

  // Apply tightness: tight AI requires stronger hand to stay in.
  // At tightness=0.9 (Odin), a 0.5 hand feels like 0.43 — borderline.
  // At tightness=0.2 (Ymir), a 0.5 hand feels like 0.58 — playable.
  const tightnessAdjusted = adjustedStrength + (1 - config.tightness) * 0.12 - config.tightness * 0.08;

  if (hasBetToCall) {
    return decideWithBetToCall(
      tightnessAdjusted, potOdds, toCall, availableHP, config, minBet
    );
  } else {
    return decideWithoutBet(
      tightnessAdjusted, availableHP, config, actor.pet.stats.maxHealth, minBet, mustBetOrFold
    );
  }
}

function decideWithBetToCall(
  handStrength: number,
  potOdds: number,
  toCall: number,
  availableHP: number,
  config: AIConfig,
  minBet: number = 5
): AIDecision {
  const canCall = availableHP >= toCall;
  const canRaise = availableHP >= toCall + minBet; // Ragnarok: must raise by at least minBet
  
  // Aggressiveness scales the raise threshold DOWN and bet size UP.
  // At aggressiveness=0.9 (Ymir), raise threshold drops to 0.55 and
  // bet sizing is 55% of HP. At 0.3 (Maat), threshold stays at 0.68
  // and sizing is 33%. This creates real personality differences.
  const raiseThreshold = 0.7 - config.aggressiveness * 0.18;
  const raiseSizePct = 0.25 + config.aggressiveness * 0.3;

  if (handStrength >= raiseThreshold && canRaise) {
    const raiseAmount = Math.min(
      Math.floor(availableHP * raiseSizePct),
      availableHP - toCall
    );
    return {
      action: CombatAction.COUNTER_ATTACK,
      betAmount: Math.max(minBet, raiseAmount),
      reasoning: `Strong hand (${(handStrength * 100).toFixed(0)}%), raising for value`
    };
  }
  
  if (handStrength >= potOdds * 0.8 && canCall) {
    if (shouldBluff({ ...config, bluffFrequency: 0.1 }, handStrength) && canRaise) {
      const raiseAmount = Math.min(minBet * 2, availableHP - toCall);
      return {
        action: CombatAction.COUNTER_ATTACK,
        betAmount: Math.max(minBet, raiseAmount),
        reasoning: 'Semi-bluff raise'
      };
    }
    
    return {
      action: CombatAction.ENGAGE,
      betAmount: 0,
      reasoning: `Pot odds favorable (${(handStrength * 100).toFixed(0)}% > ${(potOdds * 80).toFixed(0)}%), calling`
    };
  }
  
  if (handStrength < 0.2 && shouldBluff(config, handStrength) && canRaise) {
    const bluffAmount = Math.min(
      Math.floor(availableHP * 0.3),
      availableHP - toCall
    );
    if (bluffAmount >= minBet) {
      return {
        action: CombatAction.COUNTER_ATTACK,
        betAmount: bluffAmount,
        reasoning: 'Bluff raise with weak hand'
      };
    }
  }
  
  if (handStrength < potOdds * 0.5) {
    return {
      action: CombatAction.BRACE,
      betAmount: 0,
      reasoning: `Hand too weak (${(handStrength * 100).toFixed(0)}% < ${(potOdds * 50).toFixed(0)}%), folding`
    };
  }
  
  if (canCall) {
    return {
      action: CombatAction.ENGAGE,
      betAmount: 0,
      reasoning: 'Marginal hand, calling to see more cards'
    };
  }
  
  return {
    action: CombatAction.BRACE,
    betAmount: 0,
    reasoning: 'Cannot afford to call'
  };
}

function decideWithoutBet(
  handStrength: number,
  availableHP: number,
  config: AIConfig,
  maxHealth: number,
  minBet: number = 5,
  mustBetOrFold: boolean = false
): AIDecision {
  // Ragnarok: If preflop opener, MUST bet at least minBet or fold - NO checking
  if (mustBetOrFold) {
    if (availableHP < minBet) {
      return {
        action: CombatAction.BRACE,
        betAmount: 0,
        reasoning: 'Not enough HP to make minimum bet, must fold'
      };
    }
    
    // Decide bet size based on hand strength - but MUST bet
    if (handStrength >= 0.6) {
      const betSize = Math.min(
        Math.floor(maxHealth * 0.15 * (handStrength + 0.5)),
        availableHP
      );
      return {
        action: CombatAction.ATTACK,
        betAmount: Math.max(minBet, betSize),
        reasoning: `Strong hand (${(handStrength * 100).toFixed(0)}%), opening bet for value`
      };
    }
    
    if (handStrength >= 0.3) {
      return {
        action: CombatAction.ATTACK,
        betAmount: minBet,
        reasoning: `Medium hand (${(handStrength * 100).toFixed(0)}%), minimum opening bet`
      };
    }
    
    // Weak hand - bluff or fold
    if (shouldBluff(config, handStrength)) {
      const bluffSize = Math.min(
        Math.floor(maxHealth * 0.1),
        availableHP
      );
      return {
        action: CombatAction.ATTACK,
        betAmount: Math.max(minBet, bluffSize),
        reasoning: 'Preflop bluff bet'
      };
    }
    
    // Very weak hand - fold instead of wasting HP
    if (handStrength < 0.15) {
      return {
        action: CombatAction.BRACE,
        betAmount: 0,
        reasoning: `Very weak hand (${(handStrength * 100).toFixed(0)}%), folding preflop`
      };
    }
    
    // Default: minimum bet
    return {
      action: CombatAction.ATTACK,
      betAmount: minBet,
      reasoning: `Must open betting - minimum bet`
    };
  }
  
  // Post-flop with no bet: can check or bet.
  // Aggressiveness lowers the betting threshold and scales bet size.
  const postFlopBetThreshold = 0.6 - config.aggressiveness * 0.15;
  const postFlopBetScale = 0.10 + config.aggressiveness * 0.12;

  if (handStrength >= postFlopBetThreshold && availableHP >= minBet) {
    const betSize = Math.min(
      Math.floor(maxHealth * postFlopBetScale * (handStrength + 0.5)),
      availableHP
    );
    return {
      action: CombatAction.ATTACK,
      betAmount: Math.max(minBet, betSize),
      reasoning: `Strong hand (${(handStrength * 100).toFixed(0)}%), betting for value`
    };
  }
  
  if (handStrength < 0.2 && shouldBluff(config, handStrength) && availableHP >= minBet) {
    const bluffSize = Math.min(
      Math.floor(maxHealth * 0.1),
      availableHP
    );
    return {
      action: CombatAction.ATTACK,
      betAmount: Math.max(minBet, bluffSize),
      reasoning: 'Bluff bet with weak hand'
    };
  }
  
  if (handStrength >= 0.35 && availableHP >= minBet) {
    const betSize = Math.min(
      Math.floor(maxHealth * 0.08),
      availableHP
    );
    return {
      action: CombatAction.ATTACK,
      betAmount: Math.max(minBet, betSize),
      reasoning: `Medium hand (${(handStrength * 100).toFixed(0)}%), small bet`
    };
  }
  
  // Post-flop: can check with weak hand
  return {
    action: CombatAction.DEFEND,
    betAmount: 0,
    reasoning: `Weak hand (${(handStrength * 100).toFixed(0)}%), checking`
  };
}

function getCommunityCards(state: PokerCombatState): PokerCard[] {
  const cards: PokerCard[] = [...(state.communityCards.faith ?? [])];
  if (state.communityCards.foresight) cards.push(state.communityCards.foresight);
  if (state.communityCards.destiny) cards.push(state.communityCards.destiny);
  return cards;
}

/**
 * Create an AI config based on difficulty level
 */
export function createAIConfig(difficulty: 'easy' | 'medium' | 'hard'): AIConfig {
  switch (difficulty) {
    case 'easy':
      return {
        aggressiveness: 0.3,
        bluffFrequency: 0.05,
        tightness: 0.7
      };
    case 'hard':
      return {
        aggressiveness: 0.7,
        bluffFrequency: 0.2,
        tightness: 0.5
      };
    default:
      return DEFAULT_AI_CONFIG;
  }
}
