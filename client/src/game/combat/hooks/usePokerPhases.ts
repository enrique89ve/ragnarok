import { useEffect, useRef } from 'react';
import { CombatPhase, PokerCombatState } from '../../types/PokerCombatTypes';
import { getPokerCombatAdapterState } from '../../hooks/usePokerCombatAdapter';
import { useGameStore } from '../../stores/gameStore';
import { debug } from '../../config/debugConfig';

// SPELL_PET phase duration in milliseconds - time for players to play cards
const SPELL_PET_PHASE_DURATION_MS = 2500;

interface UsePokerPhasesOptions {
  combatState: PokerCombatState | null;
  isActive: boolean;
}

export function usePokerPhases(options: UsePokerPhasesOptions): void {
  const { combatState, isActive } = options;
  const allInAdvanceInProgressRef = useRef(false);
  const spellPetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cardGameMulliganActive = useGameStore(state => state.gameState?.mulligan?.active);

  useEffect(() => {
    if (!combatState || !isActive) return;
    if (combatState.phase === CombatPhase.MULLIGAN) return;
    if (combatState.phase !== CombatPhase.SPELL_PET) return;
    if (cardGameMulliganActive) {
      debug.combat('[SPELL_PET Phase] Blocked: card game mulligan still active');
      return;
    }
    
    if (spellPetTimerRef.current) {
      clearTimeout(spellPetTimerRef.current);
      spellPetTimerRef.current = null;
    }
    
    const startTime = combatState.spellPetPhaseStartTime || Date.now();
    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, SPELL_PET_PHASE_DURATION_MS - elapsed);
    
    debug.combat('[SPELL_PET Phase] Started, will advance to FAITH in', remainingTime, 'ms');
    
    spellPetTimerRef.current = setTimeout(() => {
      const mulliganStillActive = useGameStore.getState().gameState?.mulligan?.active;
      if (mulliganStillActive) {
        debug.combat('[SPELL_PET Phase] Blocked at timer fire: card game mulligan still active');
        return;
      }

      const adapter = getPokerCombatAdapterState();
      const freshState = adapter.combatState;
      
      if (!freshState || freshState.phase !== CombatPhase.SPELL_PET) {
        return;
      }
      
      debug.combat('[SPELL_PET Phase] Timing window complete, advancing to FAITH');
      
      adapter.setPlayerReady(freshState.player.playerId);
      adapter.setPlayerReady(freshState.opponent.playerId);
      adapter.maybeCloseBettingRound();
    }, remainingTime);
    
    return () => {
      if (spellPetTimerRef.current) {
        clearTimeout(spellPetTimerRef.current);
        spellPetTimerRef.current = null;
      }
    };
  }, [combatState?.phase, combatState?.spellPetPhaseStartTime, isActive, cardGameMulliganActive]);

  useEffect(() => {
    if (!combatState) return;
    if (combatState.phase === CombatPhase.MULLIGAN) return;
    if (cardGameMulliganActive) return;
    
    if (!combatState.player.isReady || !combatState.opponent.isReady) {
      return;
    }
    
    if (combatState.phase === CombatPhase.RESOLUTION) {
      return;
    }
    
    getPokerCombatAdapterState().maybeCloseBettingRound();
  }, [combatState?.phase, combatState?.player?.isReady, combatState?.opponent?.isReady, cardGameMulliganActive]);

    useEffect(() => {
      if (!combatState || !isActive) return;
      if (!combatState.isAllInShowdown) return;
      if (cardGameMulliganActive) return;
      
      debug.combat('[All-In Showdown] Active - phase:', combatState.phase, 'playerReady:', combatState.player.isReady, 'opponentReady:', combatState.opponent.isReady);
      
      if (combatState.phase === CombatPhase.RESOLUTION) {
        debug.combat('[All-In Showdown] Showdown reached, stopping auto-advance');
        return;
      }
      
      if (combatState.phase === CombatPhase.MULLIGAN) return;
      
      if (allInAdvanceInProgressRef.current) {
        debug.combat('[All-In Showdown] SKIP: Auto-advance already in progress');
        return;
      }
      
      allInAdvanceInProgressRef.current = true;
      debug.combat('[All-In Showdown] Starting 1.5s timer to advance from phase:', combatState.phase);
      
      const currentPhase = combatState.phase;
      const autoAdvanceTimer = setTimeout(() => {
        const mulliganStillActive = useGameStore.getState().gameState?.mulligan?.active;
        if (mulliganStillActive) {
          allInAdvanceInProgressRef.current = false;
          return;
        }

        const adapter = getPokerCombatAdapterState();
        const freshState = adapter.combatState;
        
        if (!freshState || freshState.phase !== currentPhase) {
          allInAdvanceInProgressRef.current = false;
          return;
        }
        
        if (!freshState.isAllInShowdown) {
          allInAdvanceInProgressRef.current = false;
          return;
        }
        
        debug.combat('[All-In Showdown] Advancing from phase:', currentPhase);
        
        adapter.advancePhase();
        allInAdvanceInProgressRef.current = false;
      }, 1500);
      
      return () => {
        clearTimeout(autoAdvanceTimer);
        allInAdvanceInProgressRef.current = false;
      };
    }, [combatState?.phase, combatState?.isAllInShowdown, isActive, cardGameMulliganActive]);
}
