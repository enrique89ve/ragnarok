import { useEffect, useRef } from 'react';
import { CombatPhase, CombatAction, PokerCombatState } from '../../types/PokerCombatTypes';
import { getPokerCombatAdapterState, getActionPermissions } from '../../hooks/usePokerCombatAdapter';
import { getSmartAIAction } from '../modules/SmartAI';
import { useGameStore } from '../../stores/gameStore';
import { debug } from '../../config/debugConfig';
import { proceduralAudio } from '../../audio/proceduralAudio';
import type { BattlePopupAction, BattlePopupTarget } from '../components/HeroBattlePopup';
import { getPokerTurnRemainingSeconds } from '../../../../../shared/p2p-wire/pokerTurnClock';
import { GameEventBus } from '../../../core/events/GameEventBus';

interface UseCombatTimerOptions {
  combatState: PokerCombatState | null;
  isActive: boolean;
  updateTimer: (newTime: number) => void;
  isP2PCombat?: boolean;
  sendPokerAction?: (input: {
    playerId: string;
    action: CombatAction;
    hpCommitment?: number;
    turnId?: string | null;
  }) => void;
  sendPokerTurnStarted?: (input: {
    combatId: string;
    turnId: string;
    phase: string;
    activePlayerId: string;
    actionsThisRound: number;
    durationMs: number;
  }) => void;
  addHeroBattlePopup?: (params: { action: BattlePopupAction; target: BattlePopupTarget; text: string; subtitle?: string }) => void;
}

export function useCombatTimer(options: UseCombatTimerOptions): void {
  const { combatState, isActive, updateTimer, isP2PCombat = false, sendPokerAction, sendPokerTurnStarted, addHeroBattlePopup } = options;
  const nestedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announcedTurnIdRef = useRef<string | null>(null);
  const expiredTurnIdRef = useRef<string | null>(null);

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
    
    if (isP2PCombat && combatState.turnId && announcedTurnIdRef.current !== combatState.turnId) {
      announcedTurnIdRef.current = combatState.turnId;
      if (combatState.activePlayerId) {
        const localPlayerTurn = combatState.activePlayerId === combatState.player.playerId;
        if (localPlayerTurn) {
          sendPokerTurnStarted?.({
            combatId: combatState.combatId,
            turnId: combatState.turnId,
            phase: combatState.phase,
            activePlayerId: combatState.activePlayerId,
            actionsThisRound: combatState.actionsThisRound,
            durationMs: combatState.maxTurnTime * 1_000,
          });
        }
        GameEventBus.emitNotification({
          level: localPlayerTurn ? 'info' : 'warning',
          message: localPlayerTurn
            ? 'Your poker decision started.'
            : 'Opponent poker decision started.',
          duration: 1800,
        });
      }
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
      
      const newTime = freshState.turnDeadlineAtMs !== null
        ? getPokerTurnRemainingSeconds({ nowMs: Date.now(), deadlineAtMs: freshState.turnDeadlineAtMs })
        : Math.max(0, freshState.turnTimer - 1);

      if (newTime > 0) {
        if (newTime === 10) {
          proceduralAudio.play('timer_warning');
        }
        updateTimer(newTime);
      } else {
        updateTimer(0);
        if (isP2PCombat && freshState.activePlayerId !== freshState.player.playerId) {
          return;
        }
        if (isP2PCombat && freshState.turnId && expiredTurnIdRef.current === freshState.turnId) {
          return;
        }
        if (freshState.turnId) expiredTurnIdRef.current = freshState.turnId;

        const permissions = getActionPermissions(freshState, true);

        let autoAction = CombatAction.DEFEND;
        if (permissions?.hasBetToCall) {
          autoAction = CombatAction.BRACE;
          addHeroBattlePopup?.({ action: 'brace', target: 'player', text: 'Brace', subtitle: 'Time expired' });
        } else {
          addHeroBattlePopup?.({ action: 'defend', target: 'player', text: 'Defend', subtitle: 'Time expired' });
        }
        
        const phaseBeforeAutoAction = freshState.phase;
        
        if (isP2PCombat) {
          sendPokerAction?.({
            playerId: freshState.player.playerId,
            action: autoAction,
            turnId: freshState.turnId,
          });
        }
        getPokerCombatAdapterState().performAction(freshState.player.playerId, autoAction);
        getPokerCombatAdapterState().maybeCloseBettingRound();

        if (isP2PCombat) return;

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
  }, [
    combatState?.combatId,
    combatState?.phase,
    combatState?.turnId,
    combatState?.turnDeadlineAtMs,
    combatState?.activePlayerId,
    combatState?.actionsThisRound,
    combatState?.player?.isReady,
    combatState?.isAllInShowdown,
    isActive,
    updateTimer,
    isP2PCombat,
    sendPokerAction,
    sendPokerTurnStarted,
    cardGameMulliganActive,
    addHeroBattlePopup,
  ]);
}
