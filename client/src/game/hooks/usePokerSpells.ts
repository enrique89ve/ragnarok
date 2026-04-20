/**
 * usePokerSpells Hook
 * 
 * React hook for Poker Spell UI logic during the Spell/Pet phase.
 * Handles spell casting, validation, previews, and UI state.
 * 
 * Architecture: HOOK layer - React logic only, delegates to store and utils.
 */

import { useCallback, useMemo } from 'react';
import { useUnifiedCombatStore } from '../stores/unifiedCombatStore';
import { PokerSpellCard } from '../types/CardTypes';

interface PokerSpellState {
  playerBluffTokens: number;
  opponentBluffTokens: number;
  playerStaminaShield: number;
  opponentStaminaShield: number;
  revealedPlayerCards: number[];
  revealedOpponentCards: number[];
}

interface SpellCastResult {
  success: boolean;
  message: string;
  stateChanges: Partial<PokerSpellState>;
}

interface UsePokerSpellsResult {
  activeSpells: PokerSpellState | null;
  isSpellPetPhase: boolean;
  pendingSpells: PokerSpellCard[];
  playerBluffTokens: number;
  opponentBluffTokens: number;
  playerStaminaShield: number;
  opponentStaminaShield: number;
  revealedPlayerCards: number[];
  revealedOpponentCards: number[];
  destinyOverrideOptions: string[];
  
  canCast: (spell: PokerSpellCard, casterMana: number) => { canCast: boolean; reason?: string };
  castSpell: (spell: PokerSpellCard, caster: 'player' | 'opponent') => SpellCastResult;
  queueSpell: (spell: PokerSpellCard) => void;
  clearQueue: () => void;
  
  consumeBluffToken: (owner: 'player' | 'opponent') => { success: boolean; message: string };
  getStaminaShieldReduction: (owner: 'player' | 'opponent', penalty: number) => number;
  getFoldPenalty: (foldingPlayer: 'player' | 'opponent') => number;
  
  setSpellPhase: (active: boolean) => void;
  selectDestinyCard: (cardKey: string) => void;
  reset: () => void;
}

export const usePokerSpells = (): UsePokerSpellsResult => {
  const pokerSpellState = useUnifiedCombatStore(state => state.pokerSpellState);
  const isSpellPetPhase = useUnifiedCombatStore(state => state.isSpellPetPhase);
  const pendingSpells = useUnifiedCombatStore(state => state.pendingPokerSpells);
  const destinyOverrideOptions = useUnifiedCombatStore(state => state.destinyOverrideOptions);
  
  const storeCanCastPokerSpell = useUnifiedCombatStore(state => state.canCastPokerSpell);
  const castPokerSpell = useUnifiedCombatStore(state => state.castPokerSpell);
  const queuePokerSpell = useUnifiedCombatStore(state => state.queuePokerSpell);
  const clearPokerSpellQueue = useUnifiedCombatStore(state => state.clearPokerSpellQueue);
  const storeConsumeBluffToken = useUnifiedCombatStore(state => state.consumeBluffToken);
  const applyStaminaShield = useUnifiedCombatStore(state => state.applyStaminaShield);
  const getExtraFoldPenalty = useUnifiedCombatStore(state => state.getExtraFoldPenalty);
  const setSpellPetPhase = useUnifiedCombatStore(state => state.setSpellPetPhase);
  const selectDestinyOverride = useUnifiedCombatStore(state => state.selectDestinyOverride);
  const resetPokerSpells = useUnifiedCombatStore(state => state.resetPokerSpells);
  
  const playerBluffTokens = pokerSpellState?.playerBluffTokens ?? 0;
  const opponentBluffTokens = pokerSpellState?.opponentBluffTokens ?? 0;
  const playerStaminaShield = pokerSpellState?.playerStaminaShield ?? 0;
  const opponentStaminaShield = pokerSpellState?.opponentStaminaShield ?? 0;
  const revealedPlayerCards = pokerSpellState?.revealedPlayerCards ?? [];
  const revealedOpponentCards = pokerSpellState?.revealedOpponentCards ?? [];
  
  const canCast = useCallback((spell: PokerSpellCard, casterMana: number) => {
    return storeCanCastPokerSpell(spell, casterMana);
  }, [storeCanCastPokerSpell]);
  
  const castSpell = useCallback((spell: PokerSpellCard, caster: 'player' | 'opponent') => {
    return castPokerSpell(spell, caster);
  }, [castPokerSpell]);
  
  const queueSpell = useCallback((spell: PokerSpellCard) => {
    queuePokerSpell(spell);
  }, [queuePokerSpell]);
  
  const clearQueue = useCallback(() => {
    clearPokerSpellQueue();
  }, [clearPokerSpellQueue]);
  
  const consumeBluffToken = useCallback((owner: 'player' | 'opponent') => {
    return storeConsumeBluffToken(owner);
  }, [storeConsumeBluffToken]);
  
  const getStaminaShieldReduction = useCallback((owner: 'player' | 'opponent', penalty: number) => {
    return applyStaminaShield(owner, penalty);
  }, [applyStaminaShield]);
  
  const getFoldPenalty = useCallback((foldingPlayer: 'player' | 'opponent') => {
    const basePenalty = 1;
    const extraPenalty = getExtraFoldPenalty(foldingPlayer);
    return basePenalty + extraPenalty;
  }, [getExtraFoldPenalty]);
  
  const setSpellPhase = useCallback((active: boolean) => {
    setSpellPetPhase(active);
  }, [setSpellPetPhase]);
  
  const selectDestinyCard = useCallback((cardKey: string) => {
    selectDestinyOverride(cardKey);
  }, [selectDestinyOverride]);
  
  const reset = useCallback(() => {
    resetPokerSpells();
  }, [resetPokerSpells]);
  
  return {
    activeSpells: pokerSpellState,
    isSpellPetPhase,
    pendingSpells,
    playerBluffTokens,
    opponentBluffTokens,
    playerStaminaShield,
    opponentStaminaShield,
    revealedPlayerCards,
    revealedOpponentCards,
    destinyOverrideOptions,
    canCast,
    castSpell,
    queueSpell,
    clearQueue,
    consumeBluffToken,
    getStaminaShieldReduction,
    getFoldPenalty,
    setSpellPhase,
    selectDestinyCard,
    reset
  };
};

export default usePokerSpells;
