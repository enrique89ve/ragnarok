import { useEffect, useRef } from 'react';
import { CombatPhase, CombatAction, PokerCombatState } from '../../types/PokerCombatTypes';
import { getPokerCombatAdapterState } from '../../hooks/usePokerCombatAdapter';
import { useGameStore } from '../../stores/gameStore';
import { debug } from '../../config/debugConfig';
import { proceduralAudio } from '../../audio/proceduralAudio';
import type { BattlePopupAction, BattlePopupTarget } from '../components/HeroBattlePopup';
import { getPokerTurnRemainingSeconds } from '../../../../../shared/p2p-wire/pokerTurnClock';
import { derivePokerDecisionView } from '../decision/pokerDecisionView';
import { getPokerActionDefinition } from '../decision/pokerActionCatalog';
import { derivePokerTurnPolicy, type PokerOpponentKind } from '../decision/pokerTurnPolicy';
import { derivePokerTimeoutIntent } from '../rules/pokerActionRules';
import { resolvePokerTurnAnnouncement } from '../decision/pokerTurnAnnouncement';
import type { PokerActionOrigin } from '../../../../../shared/p2p-wire/combat';
import { computePokerCombatStateHash } from '../../p2p/phaseBoundaryRoot';

interface UseCombatTimerOptions {
  combatState: PokerCombatState | null;
  isActive: boolean;
  updateTimer: (newTime: number) => void;
  isP2PCombat?: boolean;
  opponentKind?: PokerOpponentKind | null;
  sendPokerAction?: (input: {
    playerId: string;
    action: CombatAction;
    origin: PokerActionOrigin;
    hpCommitment?: number;
    turnId?: string | null;
    prevStateHash?: string;
  }) => void;
  sendPokerTurnStarted?: (input: {
    combatId: string;
    turnId: string;
    phase: string;
    activePlayerId: string;
    actionsThisRound: number;
    durationMs: number;
    remainingMs?: number;
  }) => boolean;
  p2pTransportConnected?: boolean;
  confirmMulligan?: () => void;
  addHeroBattlePopup?: (params: { action: BattlePopupAction; target: BattlePopupTarget; text: string; subtitle?: string }) => void;
}

export function useCombatTimer(options: UseCombatTimerOptions): void {
  const { combatState, isActive, updateTimer, isP2PCombat = false, opponentKind = null, sendPokerAction, sendPokerTurnStarted, p2pTransportConnected = true, confirmMulligan, addHeroBattlePopup } = options;
  const announcedTurnIdRef = useRef<string | null>(null);
  const expiredTurnIdRef = useRef<string | null>(null);
  const mulliganDeadlineRef = useRef<{ readonly key: string; readonly deadlineAtMs: number } | null>(null);
  // The adapter API is recreated when its selected combat state changes.
  // Keep the timer loop attached to the logical turn instead of restarting it
  // because a presentation-only countdown update changed a callback identity.
  const updateTimerRef = useRef(updateTimer);
  const sendPokerActionRef = useRef(sendPokerAction);
  const sendPokerTurnStartedRef = useRef(sendPokerTurnStarted);
  const confirmMulliganRef = useRef(confirmMulligan);
  const addHeroBattlePopupRef = useRef(addHeroBattlePopup);
  updateTimerRef.current = updateTimer;
  sendPokerActionRef.current = sendPokerAction;
  sendPokerTurnStartedRef.current = sendPokerTurnStarted;
  confirmMulliganRef.current = confirmMulligan;
  addHeroBattlePopupRef.current = addHeroBattlePopup;

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
        confirmMulliganRef.current?.();
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

    if (!isP2PCombat) {
      announcedTurnIdRef.current = null;
    }
    const announcement = isP2PCombat
      ? resolvePokerTurnAnnouncement({
          turnId: combatState.turnId,
          announcedTurnId: announcedTurnIdRef.current,
          transportConnected: p2pTransportConnected,
        })
      : null;
    if (announcement) announcedTurnIdRef.current = announcement.nextAnnouncedTurnId;
    if (isP2PCombat && announcement?.shouldSend && combatState.turnId) {
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
          const sent = sendPokerTurnStartedRef.current?.({
            combatId: combatState.combatId,
            turnId: combatState.turnId,
            phase: combatState.phase,
					activePlayerId: combatState.activePlayerId,
					actionsThisRound: combatState.actionsThisRound,
					durationMs: turnPolicy.turnClockPolicy.durationMs,
            remainingMs,
          }) ?? false;
          if (sent) announcedTurnIdRef.current = combatState.turnId;
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
        updateTimerRef.current(newTime);
      } else {
        updateTimerRef.current(0);
        if (!freshTurnPolicy.shouldResolveTimeout || !freshState.turnId || freshState.turnDeadlineAtMs === null) return;
        if (expiredTurnIdRef.current === freshState.turnId) {
          return;
        }
        const timeoutIntent = derivePokerTimeoutIntent(freshState);
        if (!timeoutIntent) return;
        const isLocalActor = timeoutIntent.actorId === freshState.player.playerId;
        const actorId = timeoutIntent.actorId;
        const autoAction = timeoutIntent.action;
        if (autoAction === CombatAction.BRACE) {
          addHeroBattlePopupRef.current?.({
            action: CombatAction.BRACE,
            target: isLocalActor ? 'player' : 'opponent',
            text: getPokerActionDefinition(CombatAction.BRACE).label,
            subtitle: 'Time expired',
          });
        } else {
          addHeroBattlePopupRef.current?.({
            action: CombatAction.DEFEND,
            target: isLocalActor ? 'player' : 'opponent',
            text: getPokerActionDefinition(CombatAction.DEFEND).label,
            subtitle: 'Time expired',
          });
        }

        const previousState = freshState;
        const previousStateHash = isP2PCombat ? computePokerCombatStateHash(previousState) ?? undefined : undefined;
        getPokerCombatAdapterState().performAction(actorId, autoAction, undefined, 'timeout');
        const appliedState = getPokerCombatAdapterState().combatState;
        if (!appliedState || appliedState === previousState) return;

        expiredTurnIdRef.current = freshState.turnId;
        if (isP2PCombat && isLocalActor) {
          sendPokerActionRef.current?.({
            playerId: actorId,
            action: autoAction,
            origin: 'timeout',
            turnId: freshState.turnId,
            prevStateHash: previousStateHash,
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
    isP2PCombat,
    opponentKind,
    p2pTransportConnected,
    cardGameMulliganActive,
	]);
}
