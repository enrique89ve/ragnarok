import { useEffect, useRef } from 'react';
import { CombatPhase, CombatAction, PokerCombatState } from '../../types/PokerCombatTypes';
import { getPokerCombatAdapterState, getActionPermissions } from '../../hooks/usePokerCombatAdapter';
import { useGameStore } from '../../stores/gameStore';
import { debug } from '../../config/debugConfig';
import { proceduralAudio } from '../../audio/proceduralAudio';
import type { BattlePopupAction, BattlePopupTarget } from '../components/HeroBattlePopup';
import { getPokerTurnRemainingSeconds } from '../../../../../shared/p2p-wire/pokerTurnClock';
import { derivePokerDecisionView } from '../decision/pokerDecisionView';
import { getPokerActionDefinition } from '../decision/pokerActionCatalog';
import { derivePokerTurnPolicy, type PokerOpponentKind } from '../decision/pokerTurnPolicy';

interface UseCombatTimerOptions {
  combatState: PokerCombatState | null;
  isActive: boolean;
  updateTimer: (newTime: number) => void;
  isP2PCombat?: boolean;
  opponentKind?: PokerOpponentKind | null;
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
    remainingMs?: number;
  }) => void;
  confirmMulligan?: () => void;
  addHeroBattlePopup?: (params: { action: BattlePopupAction; target: BattlePopupTarget; text: string; subtitle?: string }) => void;
}

export function useCombatTimer(options: UseCombatTimerOptions): void {
  const { combatState, isActive, updateTimer, isP2PCombat = false, opponentKind = null, sendPokerAction, sendPokerTurnStarted, confirmMulligan, addHeroBattlePopup } = options;
  const announcedTurnIdRef = useRef<string | null>(null);
  const expiredTurnIdRef = useRef<string | null>(null);
  const mulliganDeadlineRef = useRef<{ readonly key: string; readonly deadlineAtMs: number } | null>(null);

  const cardGameMulliganActive = useGameStore(state => state.gameState?.mulligan?.active);

  useEffect(() => {
    if (!combatState || !isActive) return;
    if (combatState.phase === CombatPhase.MULLIGAN) {
      if (!cardGameMulliganActive) return;
      const mulliganKey = `${combatState.combatId}:${combatState.handNumber}`;
      const existingDeadline = mulliganDeadlineRef.current?.key === mulliganKey
        ? mulliganDeadlineRef.current
        : { key: mulliganKey, deadlineAtMs: Date.now() + 60_000 };
      mulliganDeadlineRef.current = existingDeadline;
      const timer = setInterval(() => {
        const mulligan = useGameStore.getState().gameState?.mulligan;
        if (!mulligan?.active || mulligan.playerReady) return;
        if (Date.now() < existingDeadline.deadlineAtMs) return;
        confirmMulligan?.();
      }, 250);
      return () => clearInterval(timer);
    }
    mulliganDeadlineRef.current = null;
    if (cardGameMulliganActive) return;

    if (combatState.isAllInShowdown) {
      debug.combat('[Timer] SKIP: All-in showdown in progress - auto-advance handles phases');
      return;
    }

    const turnPolicy = derivePokerTurnPolicy({
      activePlayerId: combatState.activePlayerId,
      localPlayerId: combatState.player.playerId,
      remotePlayerId: combatState.opponent.playerId,
      isP2PCombat,
      opponentKind,
    });

    if (isP2PCombat && combatState.turnId && announcedTurnIdRef.current !== combatState.turnId) {
      announcedTurnIdRef.current = combatState.turnId;
      if (combatState.activePlayerId) {
        const nowMs = Date.now();
        const decisionView = derivePokerDecisionView({
          combatState,
          isP2PCombat,
          nowMs,
        });
        const remainingMs = combatState.turnDeadlineAtMs === null
          ? decisionView.remainingSeconds * 1_000
          : Math.max(0, combatState.turnDeadlineAtMs - nowMs);
        if (turnPolicy.shouldBroadcastTurnStart) {
          sendPokerTurnStarted?.({
            combatId: combatState.combatId,
            turnId: combatState.turnId,
            phase: combatState.phase,
					activePlayerId: combatState.activePlayerId,
					actionsThisRound: combatState.actionsThisRound,
					durationMs: turnPolicy.turnClockPolicy.durationMs,
            remainingMs,
          });
        }
      }
    }

    if (!turnPolicy.shouldTickTimer) return;

    const timer = setInterval(() => {
      const mulliganStillActive = useGameStore.getState().gameState?.mulligan?.active;
      if (mulliganStillActive) return;

      const freshState = getPokerCombatAdapterState().combatState;
      if (!freshState) return;
      
      if (freshState.phase === CombatPhase.MULLIGAN || freshState.isAllInShowdown) {
        debug.combat('[Timer] SKIP in interval: phase=', freshState.phase, 'allIn=', freshState.isAllInShowdown);
        return;
      }

      const freshTurnPolicy = derivePokerTurnPolicy({
        activePlayerId: freshState.activePlayerId,
        localPlayerId: freshState.player.playerId,
        remotePlayerId: freshState.opponent.playerId,
        isP2PCombat,
        opponentKind,
      });

      if (!freshTurnPolicy.shouldTickTimer) return;

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
        if (!freshTurnPolicy.shouldAutoActOnTimeout) return;
        if (isP2PCombat && freshState.turnId && expiredTurnIdRef.current === freshState.turnId) {
          return;
        }
        const permissions = getActionPermissions(freshState, true);

        let autoAction = CombatAction.DEFEND;
        if (permissions?.hasBetToCall) {
          autoAction = CombatAction.BRACE;
          addHeroBattlePopup?.({
            action: CombatAction.BRACE,
            target: 'player',
            text: getPokerActionDefinition(CombatAction.BRACE).label,
            subtitle: 'Time expired',
          });
        } else {
          addHeroBattlePopup?.({
            action: CombatAction.DEFEND,
            target: 'player',
            text: getPokerActionDefinition(CombatAction.DEFEND).label,
            subtitle: 'Time expired',
          });
        }

        const previousState = freshState;
        getPokerCombatAdapterState().performAction(freshState.player.playerId, autoAction);
        const appliedState = getPokerCombatAdapterState().combatState;
        if (!appliedState || appliedState === previousState) return;

        if (freshState.turnId) expiredTurnIdRef.current = freshState.turnId;
        if (isP2PCombat) {
          sendPokerAction?.({
            playerId: freshState.player.playerId,
            action: autoAction,
            turnId: freshState.turnId,
          });
        }
        getPokerCombatAdapterState().maybeCloseBettingRound();
      }
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [
    combatState?.combatId,
    combatState?.phase,
    combatState?.turnId,
    combatState?.turnDeadlineAtMs,
    combatState?.activePlayerId,
    combatState?.actionsThisRound,
    combatState?.player?.isReady,
    combatState?.player?.playerId,
    combatState?.opponent?.playerId,
    combatState?.isAllInShowdown,
    isActive,
    updateTimer,
    isP2PCombat,
    opponentKind,
    sendPokerAction,
    sendPokerTurnStarted,
    confirmMulligan,
    cardGameMulliganActive,
    addHeroBattlePopup,
	]);
}
