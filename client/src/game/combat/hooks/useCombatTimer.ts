import { useEffect, useRef } from 'react';
import { CombatPhase, CombatAction, PokerCombatState } from '../../types/PokerCombatTypes';
import { getPokerCombatAdapterState } from '../../hooks/usePokerCombatAdapter';
import { useGameStore } from '../../stores/gameStore';
import { usePeerStore } from '../../stores/peerStore';
import { debug } from '../../config/debugConfig';
import { proceduralAudio } from '../../audio/proceduralAudio';
import type { BattlePopupAction, BattlePopupTarget } from '../components/HeroBattlePopup';
import {
  getCanonicalPokerActionNowMs,
  getPokerTurnRemainingSeconds,
} from '../../../../../shared/p2p-wire/pokerTurnClock';
import { derivePokerDecisionView } from '../decision/pokerDecisionView';
import { getPokerActionDefinition } from '../decision/pokerActionCatalog';
import { derivePokerTurnPolicy, type PokerOpponentKind } from '../decision/pokerTurnPolicy';
import { derivePokerTimeoutIntent } from '../rules/pokerActionRules';
import { resolvePokerTurnAnnouncement } from '../decision/pokerTurnAnnouncement';
import type { PokerActionOrigin } from '../../../../../shared/p2p-wire/combat';
import { computePokerCombatStateHash } from '../../p2p/phaseBoundaryRoot';
import { commitNextP2PCanonicalAction } from '../../p2p/canonicalActionOrder';
import { recordMove } from '../../../data/blockchain/transcriptBuilder';
import { localPlayerId } from '../../../data/blockchain/playerIdentity';
import { getNFTBridge } from '../../nft';

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
    decisionId?: string;
  }) => Promise<boolean>;
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
  // A timeout decision is asynchronous in P2P (it must be signed before the
  // local reducer runs). Keep an in-flight reservation separate from the
  // terminal `expired` marker so a rejected/stale send can be retried on the
  // next tick or after transport recovery.
  const timeoutSendPendingTurnIdRef = useRef<string | null>(null);
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
        if (timeoutSendPendingTurnIdRef.current === freshState.turnId) {
          return;
        }
        const timeoutIntent = derivePokerTimeoutIntent(freshState);
        if (!timeoutIntent) return;
        const isLocalActor = timeoutIntent.actorId === freshState.player.playerId;
        // Only the actor's browser may author the timeout. The other peer waits
        // for that signed decision instead of resolving the same turn locally;
        // otherwise the arriving envelope would see a post-timeout pre-hash.
        if (!isLocalActor) return;
        const actorId = timeoutIntent.actorId;
          const autoAction = timeoutIntent.action;
          const decisionId = `${freshState.turnId}:${actorId}:${Date.now()}`;
        const previousState = freshState;
        const previousStateHash = isP2PCombat ? computePokerCombatStateHash(previousState) ?? undefined : undefined;
        if (isP2PCombat) {
          // Keep the absolute deadline live while disconnected, but wait for
          // transport recovery before authoring the timeout. The next tick can
          // then retry with the same pre-state hash.
          if (!p2pTransportConnected || !previousStateHash) return;
          if (usePeerStore.getState().p2pIntegrityError !== null) {
            expiredTurnIdRef.current = freshState.turnId;
            return;
          }
          timeoutSendPendingTurnIdRef.current = freshState.turnId;
          let sendPromise: Promise<boolean> | undefined;
          try {
            sendPromise = sendPokerActionRef.current?.({
              playerId: actorId,
              action: autoAction,
              origin: 'timeout',
              turnId: freshState.turnId,
              prevStateHash: previousStateHash,
              decisionId,
            });
          } catch (error) {
            debug.warn('[Timer] P2P timeout send threw before signing', error);
            sendPromise = undefined;
          }
          if (!sendPromise) {
            timeoutSendPendingTurnIdRef.current = null;
            return;
          }
          void sendPromise.then((sent) => {
            // A false result means no canonical decision was sent (for
            // example, the session was still authorizing). Leave the turn
            // unexpired so the next tick can retry with the same deadline.
            if (!sent) return;
            const latestState = getPokerCombatAdapterState().combatState;
            if (
              !latestState
              || latestState.turnId !== previousState.turnId
              || computePokerCombatStateHash(latestState) !== previousStateHash
              || usePeerStore.getState().p2pIntegrityError !== null
            ) {
              debug.warn('[Timer] P2P timeout became stale while signing; local reducer not applied');
              expiredTurnIdRef.current = freshState.turnId;
              return;
            }
            const committedTimeoutState = getPokerCombatAdapterState().combatState;
            getPokerCombatAdapterState().performAction(
              actorId,
              autoAction,
              undefined,
              'timeout',
              getCanonicalPokerActionNowMs({
                origin: 'timeout',
                deadlineAtMs: committedTimeoutState?.turnDeadlineAtMs ?? null,
              }),
            );
            const appliedState = getPokerCombatAdapterState().combatState;
            if (!appliedState || appliedState === previousState) {
              expiredTurnIdRef.current = freshState.turnId;
              return;
            }
            const canonicalOrder = commitNextP2PCanonicalAction({
              actionId: decisionId,
              actorId: usePeerStore.getState().myPeerId ?? '',
            });
            if (canonicalOrder === null) {
              usePeerStore.getState().setP2pIntegrityError('Game integrity diverged. Actions are paused until the match is left. (local_poker_canonical_order_unavailable)');
              return;
            }
            const recorded = recordMove('poker_action', {
              action: autoAction,
              origin: 'timeout',
              turnId: previousState.turnId,
              decisionId,
            }, localPlayerId({
              hiveUsername: getNFTBridge().getUsername(),
              myPeerId: usePeerStore.getState().myPeerId,
            }), canonicalOrder);
            if (!recorded) {
              usePeerStore.getState().setP2pIntegrityError('Game integrity diverged. Actions are paused until the match is left. (local_poker_transcript_unavailable)');
              return;
            }
            expiredTurnIdRef.current = freshState.turnId;
            addHeroBattlePopupRef.current?.({
              action: autoAction,
              target: 'player',
              text: getPokerActionDefinition(autoAction).label,
              subtitle: 'Time expired',
            });
            getPokerCombatAdapterState().maybeCloseBettingRound();
          }).catch((error) => {
            debug.warn('[Timer] P2P timeout signing/send rejected; retrying', error);
          }).finally(() => {
            if (timeoutSendPendingTurnIdRef.current === freshState.turnId) {
              timeoutSendPendingTurnIdRef.current = null;
            }
          });
          return;
        }

        getPokerCombatAdapterState().performAction(actorId, autoAction, undefined, 'timeout');
        const appliedState = getPokerCombatAdapterState().combatState;
        if (!appliedState || appliedState === previousState) return;
        addHeroBattlePopupRef.current?.({
          action: autoAction,
          target: 'player',
          text: getPokerActionDefinition(autoAction).label,
          subtitle: 'Time expired',
        });
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
