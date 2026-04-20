/**
 * PokerSpellSlice - Poker Spell state and actions
 * 
 * Manages Poker Spell casting, resolution, and active effects during combat.
 * Works in conjunction with pokerSpellUtils for pure effect resolution.
 */

import { StateCreator } from 'zustand';
import { 
  PokerSpellSlice,
  PokerSpellSliceState,
  UnifiedCombatStore 
} from './types';
import { PokerSpellCard } from '../../types/CardTypes';
import {
  PokerSpellState,
  SpellCastResult,
  createInitialPokerSpellState,
  resolvePokerSpellEffect,
  canCastPokerSpell as utilCanCastPokerSpell,
  consumeBluffToken as utilConsumeBluffToken,
  applyStaminaShield as utilApplyStaminaShield,
  getExtraFoldPenalty as utilGetExtraFoldPenalty,
  clearCombatSpellEffects
} from '../../utils/poker/pokerSpellUtils';

const initialState: PokerSpellSliceState = {
  pokerSpellState: null,
  pendingPokerSpells: [],
  isSpellPetPhase: false,
  destinyOverrideOptions: []
};

export const createPokerSpellSlice: StateCreator<
  UnifiedCombatStore,
  [],
  [],
  PokerSpellSlice
> = (set, get) => ({
  ...initialState,

  initializePokerSpells: () => {
    set({
      pokerSpellState: createInitialPokerSpellState(),
      pendingPokerSpells: [],
      isSpellPetPhase: false,
      destinyOverrideOptions: []
    });
  },

  canCastPokerSpell: (spell: PokerSpellCard, casterMana: number): { canCast: boolean; reason?: string } => {
    const state = get();
    const currentPhase = state.isSpellPetPhase ? 'SPELL_PET' : 'UNKNOWN';
    return utilCanCastPokerSpell(spell, casterMana, currentPhase);
  },

  castPokerSpell: (spell: PokerSpellCard, caster: 'player' | 'opponent'): SpellCastResult => {
    const state = get();
    const pokerSpellState = state.pokerSpellState;
    
    if (!pokerSpellState) {
      return {
        success: false,
        message: 'Poker spell state not initialized',
        stateChanges: {}
      };
    }
    
    const pokerCombatState = state.pokerCombatState;
    if (!pokerCombatState) {
      return {
        success: false,
        message: 'No active poker combat',
        stateChanges: {}
      };
    }
    
    const result = resolvePokerSpellEffect(
      spell,
      caster,
      pokerSpellState,
      {
        playerHoleCards: pokerCombatState.player.holeCards,
        opponentHoleCards: pokerCombatState.opponent.holeCards,
        deck: state.pokerDeck
      }
    );
    
    if (result.success) {
      set({
        pokerSpellState: { ...pokerSpellState, ...result.stateChanges }
      });
      
      state.addLogEntry({
        id: `spell-${Date.now()}`,
        timestamp: Date.now(),
        type: 'spell',
        message: `${caster === 'player' ? 'Player' : 'Opponent'} cast ${spell.name}: ${result.message}`,
        details: { spellId: spell.id, effectType: spell.pokerSpellEffect.effectType }
      });
      
      if (result.immediateEffects) {
        for (const effect of result.immediateEffects) {
          if (effect.type === 'skip_to_showdown') {
            state.setPokerPhase('SHOWDOWN');
          }
          if (effect.type === 'deduct_stamina' && effect.data) {
            const target = effect.data.target as 'player' | 'opponent';
            const amount = (effect.data.amount as number) || 1;
            const combatState = state.pokerCombatState;
            if (combatState) {
              const targetPlayer = target === 'player' ? combatState.player : combatState.opponent;
              targetPlayer.pet.stats.currentStamina = Math.max(0, targetPlayer.pet.stats.currentStamina - amount);
              set({ pokerCombatState: { ...combatState } });
            }
          }
        }
      }
    }
    
    return result;
  },

  queuePokerSpell: (spell: PokerSpellCard) => {
    set(state => ({
      pendingPokerSpells: [...state.pendingPokerSpells, spell]
    }));
  },

  clearPokerSpellQueue: () => {
    set({ pendingPokerSpells: [] });
  },

  consumeBluffToken: (owner: 'player' | 'opponent'): { success: boolean; message: string } => {
    const state = get();
    const pokerSpellState = state.pokerSpellState;
    
    if (!pokerSpellState) {
      return { success: false, message: 'No spell state' };
    }
    
    const voidStareKey = owner === 'player' ? 'opponentVoidStareActive' : 'playerVoidStareActive';
    const result = utilConsumeBluffToken(pokerSpellState, owner, pokerSpellState[voidStareKey]);
    
    set({ pokerSpellState: result.newState });
    
    return { success: result.success, message: result.message };
  },

  applyStaminaShield: (owner: 'player' | 'opponent', penalty: number): number => {
    const state = get();
    const pokerSpellState = state.pokerSpellState;
    
    if (!pokerSpellState) {
      return penalty;
    }
    
    const result = utilApplyStaminaShield(pokerSpellState, owner, penalty);
    
    set({ pokerSpellState: result.newState });
    
    return result.reducedPenalty;
  },

  getExtraFoldPenalty: (foldingPlayer: 'player' | 'opponent'): number => {
    const state = get();
    const pokerSpellState = state.pokerSpellState;
    
    if (!pokerSpellState) {
      return 0;
    }
    
    return utilGetExtraFoldPenalty(pokerSpellState, foldingPlayer);
  },

  setSpellPetPhase: (active: boolean) => {
    set({ isSpellPetPhase: active });
  },

  setDestinyOverrideOptions: (options: string[]) => {
    set({ destinyOverrideOptions: options });
  },

  selectDestinyOverride: (cardKey: string) => {
    const state = get();
    
    if (state.destinyOverrideOptions.includes(cardKey)) {
      state.addLogEntry({
        id: `destiny-${Date.now()}`,
        timestamp: Date.now(),
        type: 'spell',
        message: `Destiny Override: Chose ${cardKey} as the River card`,
        details: { selectedCard: cardKey }
      });
    }
    
    set({ destinyOverrideOptions: [] });
  },

  resetPokerSpells: () => {
    set({
      pokerSpellState: null,
      pendingPokerSpells: [],
      isSpellPetPhase: false,
      destinyOverrideOptions: []
    });
  }
});
