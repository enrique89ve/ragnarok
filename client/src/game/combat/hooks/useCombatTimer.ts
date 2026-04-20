import { useEffect, useRef } from 'react';
import { CombatPhase, CombatAction, PokerCombatState } from '../../types/PokerCombatTypes';
import { getPokerCombatAdapterState, getActionPermissions } from '../../hooks/usePokerCombatAdapter';
import { getSmartAIAction } from '../modules/SmartAI';
import { useGameStore } from '../../stores/gameStore';
import { COMBAT_DEBUG } from '../debugConfig';
import { debug } from '../../config/debugConfig';
import { proceduralAudio } from '../../audio/proceduralAudio';
import type { BattlePopupAction, BattlePopupTarget } from '../components/HeroBattlePopup';

interface UseCombatTimerOptions {
  combatState: PokerCombatState | null;
  isActive: boolean;
  updateTimer: (newTime: number) => void;
  addHeroBattlePopup?: (params: { action: BattlePopupAction; target: BattlePopupTarget; text: string; subtitle?: string }) => void;
}

export function useCombatTimer(options: UseCombatTimerOptions): void {
  const { combatState, isActive, updateTimer, addHeroBattlePopup } = options;
  const nestedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cardGameMulliganActive = useGameStore(state => state.gameState?.mulligan?.active);

  useEffect(() => {
    if (!combatState || !isActive) return;
    if (combatState.phase === CombatPhase.MULLIGAN) return;
    if (combatState.phase === CombatPhase.SPELL_PET) return;
    if (cardGameMulliganActive) return;
    
    if (combatState.player.isReady) {
      debug.combat('[Timer] SKIP: Player already ready (isReady=true)');
      return;
    }
    
    if (combatState.isAllInShowdown) {
      debug.combat('[Timer] SKIP: All-in showdown in progress - auto-advance handles phases');
      return;
    }
    
    const timer = setInterval(() => {
      const mulliganStillActive = useGameStore.getState().gameState?.mulligan?.active;
      if (mulliganStillActive) return;

      const freshState = getPokerCombatAdapterState().combatState;
      if (!freshState) return;
      
      if (freshState.phase === CombatPhase.MULLIGAN || 
          freshState.phase === CombatPhase.SPELL_PET ||
          freshState.player.isReady ||
          freshState.isAllInShowdown) {
        debug.combat('[Timer] SKIP in interval: phase=', freshState.phase, 'playerReady=', freshState.player.isReady, 'allIn=', freshState.isAllInShowdown);
        return;
      }
      
      if (freshState.turnTimer > 0) {
        const newTime = freshState.turnTimer - 1;
        if (newTime === 10) {
          proceduralAudio.play('timer_warning');
        }
        updateTimer(newTime);
      } else {
        const permissions = getActionPermissions(freshState, true);
        
        let autoAction = CombatAction.DEFEND;
        if (permissions?.hasBetToCall) {
          autoAction = CombatAction.BRACE;
          addHeroBattlePopup?.({ action: 'brace', target: 'player', text: 'Brace', subtitle: 'Time expired' });
        } else {
          addHeroBattlePopup?.({ action: 'defend', target: 'player', text: 'Defend', subtitle: 'Time expired' });
        }
        
        const phaseBeforeAutoAction = freshState.phase;
        
        getPokerCombatAdapterState().performAction(freshState.player.playerId, autoAction);
        
        if (nestedTimerRef.current) clearTimeout(nestedTimerRef.current);
        nestedTimerRef.current = setTimeout(() => {
          const stateAfterAction = getPokerCombatAdapterState().combatState;
          if (!stateAfterAction || stateAfterAction.opponent.isReady) return;
          
          if (stateAfterAction.phase !== phaseBeforeAutoAction) {
            return;
          }
          
          if (stateAfterAction.phase === CombatPhase.RESOLUTION || stateAfterAction.foldWinner) {
            return;
          }
          
          const aiDecision = getSmartAIAction(stateAfterAction, false);
          getPokerCombatAdapterState().performAction(stateAfterAction.opponent.playerId, aiDecision.action, aiDecision.betAmount);
        }, 500);
      }
    }, 1000);
    
    return () => {
      clearInterval(timer);
      if (nestedTimerRef.current) {
        clearTimeout(nestedTimerRef.current);
        nestedTimerRef.current = null;
      }
    };
  }, [combatState?.phase, combatState?.player?.isReady, combatState?.isAllInShowdown, isActive, updateTimer, cardGameMulliganActive, addHeroBattlePopup]);
}
