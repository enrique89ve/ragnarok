/**
 * Poker Spell Utilities
 * 
 * Pure functions for resolving Poker Spell effects during the Spell/Pet phase.
 * These utilities handle spell validation, effect resolution, and state mutations.
 * 
 * Architecture: This is the UTILS layer - pure functions only, no React or Zustand.
 */

import { PokerSpellCard, PokerSpellEffectType, PokerSpellTiming } from '../../types/CardTypes';
import { PokerCard } from '../../types/PokerCombatTypes';

// ==================== TYPES ====================

export interface PokerSpellState {
  activeSpells: ActivePokerSpell[];
  playerBluffTokens: number;
  opponentBluffTokens: number;
  playerStaminaShield: number;
  opponentStaminaShield: number;
  playerEchoBetReady: boolean;
  opponentEchoBetReady: boolean;
  playerShadowFoldActive: boolean;
  opponentShadowFoldActive: boolean;
  playerFoldCurseActive: boolean;
  opponentFoldCurseActive: boolean;
  playerVoidStareActive: boolean;
  opponentVoidStareActive: boolean;
  runTwiceActive: boolean;
  playerNornsGlimpseActive: boolean;
  opponentNornsGlimpseActive: boolean;
  playerAllInAura: number;
  opponentAllInAura: number;
  ragnarokGambitActive: boolean;
  playerDestinyOverrideReady: boolean;
  opponentDestinyOverrideReady: boolean;
  revealedPlayerCards: number[];
  revealedOpponentCards: number[];
}

export interface ActivePokerSpell {
  id: string;
  cardId: number;
  effectType: PokerSpellEffectType;
  timing: PokerSpellTiming;
  owner: 'player' | 'opponent';
  expiresAtPhase?: string;
  usesRemaining?: number;
}

export interface SpellCastResult {
  success: boolean;
  message: string;
  stateChanges: Partial<PokerSpellState>;
  immediateEffects?: ImmediateSpellEffect[];
}

export interface ImmediateSpellEffect {
  type: 'reveal_card' | 'swap_card' | 'skip_to_showdown' | 'force_action' | 'deduct_stamina';
  data: Record<string, unknown>;
}

// ==================== INITIAL STATE ====================

export const createInitialPokerSpellState = (): PokerSpellState => ({
  activeSpells: [],
  playerBluffTokens: 0,
  opponentBluffTokens: 0,
  playerStaminaShield: 0,
  opponentStaminaShield: 0,
  playerEchoBetReady: false,
  opponentEchoBetReady: false,
  playerShadowFoldActive: false,
  opponentShadowFoldActive: false,
  playerFoldCurseActive: false,
  opponentFoldCurseActive: false,
  playerVoidStareActive: false,
  opponentVoidStareActive: false,
  runTwiceActive: false,
  playerNornsGlimpseActive: false,
  opponentNornsGlimpseActive: false,
  playerAllInAura: 0,
  opponentAllInAura: 0,
  ragnarokGambitActive: false,
  playerDestinyOverrideReady: false,
  opponentDestinyOverrideReady: false,
  revealedPlayerCards: [],
  revealedOpponentCards: []
});

// ==================== VALIDATION ====================

export const canCastPokerSpell = (
  spell: PokerSpellCard,
  casterMana: number,
  currentPhase: string
): { canCast: boolean; reason?: string } => {
  if (casterMana < spell.manaCost) {
    return { canCast: false, reason: `Not enough mana (need ${spell.manaCost}, have ${casterMana})` };
  }
  
  const effect = spell.pokerSpellEffect;
  
  if (effect.timing === 'pre_deal' && currentPhase !== 'SPELL_PET') {
    return { canCast: false, reason: 'Can only cast before dealing' };
  }
  
  if (effect.timing === 'on_river' && currentPhase !== 'DESTINY') {
    return { canCast: false, reason: 'Can only cast on the River' };
  }
  
  return { canCast: true };
};

// ==================== EFFECT RESOLUTION ====================

export const resolvePokerSpellEffect = (
  spell: PokerSpellCard,
  caster: 'player' | 'opponent',
  currentState: PokerSpellState,
  context: {
    playerHoleCards: PokerCard[];
    opponentHoleCards: PokerCard[];
    deck: PokerCard[];
  }
): SpellCastResult => {
  const effect = spell.pokerSpellEffect;
  const stateChanges: Partial<PokerSpellState> = {};
  const immediateEffects: ImmediateSpellEffect[] = [];
  
  switch (effect.effectType) {
    case 'bluff_rune':
      return resolveBluffRune(caster, currentState);
    
    case 'fate_peek':
      return resolveFatePeek(caster, currentState, context);
    
    case 'stamina_shield':
      return resolveStaminaShield(caster, currentState, effect.value ?? 1);
    
    case 'hole_swap':
      return resolveHoleSwap(caster, currentState, context);
    
    case 'echo_bet':
      return resolveEchoBet(caster, currentState);
    
    case 'shadow_fold':
      return resolveShadowFold(caster, currentState);
    
    case 'run_twice':
      return resolveRunTwice(currentState);
    
    case 'river_rewrite':
      return resolveRiverRewrite(currentState);
    
    case 'norns_glimpse':
      return resolveNornsGlimpse(caster, currentState);
    
    case 'fold_curse':
      return resolveFoldCurse(caster, currentState);
    
    case 'blood_bet':
      return resolveBloodBet(caster, currentState);
    
    case 'void_stare':
      return resolveVoidStare(caster, currentState);
    
    case 'all_in_aura':
      return resolveAllInAura(caster, currentState, effect.value ?? 0.1);
    
    case 'ragnarok_gambit':
      return resolveRagnarokGambit(currentState);
    
    case 'destiny_override':
      return resolveDestinyOverride(caster, currentState);
    
    default:
      return {
        success: false,
        message: `Unknown spell effect: ${effect.effectType}`,
        stateChanges: {}
      };
  }
};

// ==================== INDIVIDUAL SPELL RESOLVERS ====================

const resolveBluffRune = (
  caster: 'player' | 'opponent',
  currentState: PokerSpellState
): SpellCastResult => {
  const key = caster === 'player' ? 'playerBluffTokens' : 'opponentBluffTokens';
  return {
    success: true,
    message: `${caster === 'player' ? 'You' : 'Opponent'} gained a Bluff token`,
    stateChanges: {
      [key]: currentState[key] + 1
    }
  };
};

const resolveFatePeek = (
  caster: 'player' | 'opponent',
  currentState: PokerSpellState,
  context: { opponentHoleCards: PokerCard[]; playerHoleCards: PokerCard[] }
): SpellCastResult => {
  const targetCards = caster === 'player' ? context.opponentHoleCards : context.playerHoleCards;
  const revealKey = caster === 'player' ? 'revealedOpponentCards' : 'revealedPlayerCards';
  const currentRevealed = currentState[revealKey];
  
  const unrevealed = targetCards.filter((_, i) => !currentRevealed.includes(i));
  if (unrevealed.length === 0) {
    return {
      success: false,
      message: 'All opponent cards are already revealed',
      stateChanges: {}
    };
  }
  
  const revealIndex = Math.floor(Math.random() * unrevealed.length);
  const cardIndex = targetCards.indexOf(unrevealed[revealIndex]);
  
  return {
    success: true,
    message: `Revealed opponent's hole card`,
    stateChanges: {
      [revealKey]: [...currentRevealed, cardIndex]
    },
    immediateEffects: [{
      type: 'reveal_card',
      data: { target: caster === 'player' ? 'opponent' : 'player', cardIndex }
    }]
  };
};

const resolveStaminaShield = (
  caster: 'player' | 'opponent',
  currentState: PokerSpellState,
  value: number
): SpellCastResult => {
  const key = caster === 'player' ? 'playerStaminaShield' : 'opponentStaminaShield';
  return {
    success: true,
    message: `${caster === 'player' ? 'You' : 'Opponent'} gained ${value} STA shield`,
    stateChanges: {
      [key]: currentState[key] + value
    }
  };
};

const resolveHoleSwap = (
  caster: 'player' | 'opponent',
  currentState: PokerSpellState,
  context: { playerHoleCards: PokerCard[]; opponentHoleCards: PokerCard[] }
): SpellCastResult => {
  const playerCardIndex = Math.floor(Math.random() * context.playerHoleCards.length);
  const opponentCardIndex = Math.floor(Math.random() * context.opponentHoleCards.length);
  
  return {
    success: true,
    message: `Swapped a hole card with opponent`,
    stateChanges: {},
    immediateEffects: [{
      type: 'swap_card',
      data: { playerCardIndex, opponentCardIndex }
    }]
  };
};

const resolveEchoBet = (
  caster: 'player' | 'opponent',
  currentState: PokerSpellState
): SpellCastResult => {
  const key = caster === 'player' ? 'playerEchoBetReady' : 'opponentEchoBetReady';
  return {
    success: true,
    message: `${caster === 'player' ? 'Your' : 'Opponent\'s'} next bet action will be repeated for free`,
    stateChanges: {
      [key]: true
    }
  };
};

const resolveShadowFold = (
  caster: 'player' | 'opponent',
  currentState: PokerSpellState
): SpellCastResult => {
  const key = caster === 'player' ? 'playerShadowFoldActive' : 'opponentShadowFoldActive';
  return {
    success: true,
    message: `${caster === 'player' ? 'Your' : 'Opponent\'s'} fold will hide their hand`,
    stateChanges: {
      [key]: true
    }
  };
};

const resolveRunTwice = (currentState: PokerSpellState): SpellCastResult => {
  return {
    success: true,
    message: 'If all-in is called, community cards will be dealt twice',
    stateChanges: {
      runTwiceActive: true
    }
  };
};

const resolveRiverRewrite = (currentState: PokerSpellState): SpellCastResult => {
  return {
    success: true,
    message: 'You may reroll the River card',
    stateChanges: {}
  };
};

const resolveNornsGlimpse = (
  caster: 'player' | 'opponent',
  currentState: PokerSpellState
): SpellCastResult => {
  const key = caster === 'player' ? 'playerNornsGlimpseActive' : 'opponentNornsGlimpseActive';
  return {
    success: true,
    message: `${caster === 'player' ? 'You' : 'Opponent'} can peek at the next community card`,
    stateChanges: {
      [key]: true
    }
  };
};

const resolveFoldCurse = (
  caster: 'player' | 'opponent',
  currentState: PokerSpellState
): SpellCastResult => {
  const key = caster === 'player' ? 'playerFoldCurseActive' : 'opponentFoldCurseActive';
  return {
    success: true,
    message: `If opponent folds, they lose 1 additional STA`,
    stateChanges: {
      [key]: true
    }
  };
};

const resolveBloodBet = (
  caster: 'player' | 'opponent',
  currentState: PokerSpellState
): SpellCastResult => {
  return {
    success: true,
    message: `Paid 1 STA. Opponent must match your bet or fold`,
    stateChanges: {},
    immediateEffects: [
      {
        type: 'deduct_stamina',
        data: { target: caster, amount: 1 }
      },
      {
        type: 'force_action',
        data: { target: caster === 'player' ? 'opponent' : 'player', options: ['match', 'fold'] }
      }
    ]
  };
};

const resolveVoidStare = (
  caster: 'player' | 'opponent',
  currentState: PokerSpellState
): SpellCastResult => {
  const key = caster === 'player' ? 'playerVoidStareActive' : 'opponentVoidStareActive';
  return {
    success: true,
    message: `Opponent's next Bluff token will be nullified`,
    stateChanges: {
      [key]: true
    }
  };
};

const resolveAllInAura = (
  caster: 'player' | 'opponent',
  currentState: PokerSpellState,
  value: number
): SpellCastResult => {
  const key = caster === 'player' ? 'playerAllInAura' : 'opponentAllInAura';
  return {
    success: true,
    message: `Your next all-in gains +${value}× damage multiplier`,
    stateChanges: {
      [key]: currentState[key] + value
    }
  };
};

const resolveRagnarokGambit = (currentState: PokerSpellState): SpellCastResult => {
  return {
    success: true,
    message: 'All cards revealed! Skipping to showdown...',
    stateChanges: {
      ragnarokGambitActive: true,
      revealedPlayerCards: [0, 1],
      revealedOpponentCards: [0, 1]
    },
    immediateEffects: [{
      type: 'skip_to_showdown',
      data: {}
    }]
  };
};

const resolveDestinyOverride = (
  caster: 'player' | 'opponent',
  currentState: PokerSpellState
): SpellCastResult => {
  const key = caster === 'player' ? 'playerDestinyOverrideReady' : 'opponentDestinyOverrideReady';
  return {
    success: true,
    message: `${caster === 'player' ? 'You' : 'Opponent'} will choose the River from 3 options`,
    stateChanges: {
      [key]: true
    }
  };
};

// ==================== HELPER FUNCTIONS ====================

export const consumeBluffToken = (
  state: PokerSpellState,
  owner: 'player' | 'opponent',
  opponentHasVoidStare: boolean
): { newState: PokerSpellState; success: boolean; message: string } => {
  const tokenKey = owner === 'player' ? 'playerBluffTokens' : 'opponentBluffTokens';
  const voidStareKey = owner === 'player' ? 'opponentVoidStareActive' : 'playerVoidStareActive';
  
  if (state[tokenKey] <= 0) {
    return { newState: state, success: false, message: 'No Bluff tokens available' };
  }
  
  const newState = { ...state, [tokenKey]: state[tokenKey] - 1 };
  
  if (opponentHasVoidStare && state[voidStareKey]) {
    newState[voidStareKey] = false;
    return { newState, success: false, message: 'Bluff token was nullified by Void Stare!' };
  }
  
  return { newState, success: true, message: 'Bluff token activated!' };
};

export const applyStaminaShield = (
  state: PokerSpellState,
  owner: 'player' | 'opponent',
  staPenalty: number
): { newState: PokerSpellState; reducedPenalty: number } => {
  const shieldKey = owner === 'player' ? 'playerStaminaShield' : 'opponentStaminaShield';
  const shield = state[shieldKey];
  
  if (shield <= 0) {
    return { newState: state, reducedPenalty: staPenalty };
  }
  
  const absorbed = Math.min(shield, staPenalty);
  const newState = { ...state, [shieldKey]: shield - absorbed };
  
  return { newState, reducedPenalty: staPenalty - absorbed };
};

export const getExtraFoldPenalty = (
  state: PokerSpellState,
  foldingPlayer: 'player' | 'opponent'
): number => {
  const curseKey = foldingPlayer === 'player' ? 'opponentFoldCurseActive' : 'playerFoldCurseActive';
  return state[curseKey] ? 1 : 0;
};

export const clearCombatSpellEffects = (): PokerSpellState => {
  return createInitialPokerSpellState();
};
