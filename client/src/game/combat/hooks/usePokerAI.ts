import { useCallback, useEffect, useRef } from 'react';
import { CombatAction, CombatPhase, PokerCombatState } from '../../types/PokerCombatTypes';
import { getPokerCombatAdapterState } from '../../hooks/usePokerCombatAdapter';
import { getSmartAIAction } from '../modules/SmartAI';
import { useGameStore } from '../../stores/gameStore';
import { COMBAT_DEBUG } from '../debugConfig';
import { debug } from '../../config/debugConfig';
import { ALL_NORSE_HEROES } from '../../data/norseHeroes';
import type { BattlePopupAction, BattlePopupTarget } from '../components/HeroBattlePopup';
import { useMatchStore } from '../../match/store';
import { deriveLegalPokerAiAction } from '../decision/pokerAiDecisionPolicy';
import {
  derivePokerAiConfigFromMatch,
  escalatePokerAiConfigForPhase,
} from '../decision/pokerAiMatchConfig';
import {
  getPokerActionPresentation,
  POKER_AI_ACTION_SETTLE_DELAY_MS,
} from '../decision/pokerActionPresentation';
import { emitBettingAction } from '../vfx/events';

interface UsePokerAIOptions {
  combatState: PokerCombatState | null;
  isActive: boolean;
  aiResponseInProgressRef: React.MutableRefObject<boolean>;
  addHeroBattlePopup?: (params: { action: BattlePopupAction; target: BattlePopupTarget; text: string; subtitle?: string }) => void;
}

const AI_RESPONSE_DELAY_MS = 600;
const AI_TIMEOUT_MS = 5000;

function getOpponentHeroName(combatState: PokerCombatState): string {
  const heroId = combatState.opponent.pet.norseHeroId;
  const hero = heroId ? ALL_NORSE_HEROES[heroId] : null;
  return hero?.name || 'Opponent';
}

/**
 * Simplified AI hook that uses activePlayerId as the single source of truth.
 *
 * This follows the same pattern as professional poker engines:
 * - One field (activePlayerId) determines whose turn it is
 * - AI reacts when activePlayerId matches the opponent's ID
 * - No complex inference from isReady flags
 */
export function usePokerAI(options: UsePokerAIOptions): void {
  const { combatState, isActive, aiResponseInProgressRef, addHeroBattlePopup } = options;
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cardGameMulliganActive = useGameStore(state => state.gameState?.mulligan?.active);
  const opponentPlayerId = combatState?.opponent.playerId;
  const activePlayerId = combatState?.activePlayerId;
  const combatPhase = combatState?.phase;
  const foldWinner = combatState?.foldWinner;
  const isAllInShowdown = combatState?.isAllInShowdown;
  const currentBet = combatState?.currentBet;
  const actionsThisRound = combatState?.actionsThisRound;

  /*
    Poker AI config comes from MatchContext, not campaignStore.
    Single has no mission profile and no rewards — SmartAI default.
    Campaign uses the mission's authored aiProfile + difficulty captured at
    match setup, so a leftover currentMission cannot leak into Single.
  */
  const activeMatch = useMatchStore(s => s.activeMatch);
  const aiConfig = derivePokerAiConfigFromMatch(activeMatch);
  const aiConfigRef = useRef(aiConfig);
  aiConfigRef.current = aiConfig;

  const presentOpponentAction = useCallback((
    sourceState: PokerCombatState,
    action: CombatAction,
    hpCommitment?: number,
  ) => {
    const feedback = getPokerActionPresentation({
      actor: 'opponent',
      action,
      amount: hpCommitment,
      actorName: getOpponentHeroName(sourceState),
    });
    if (feedback.showPopup) {
      addHeroBattlePopup?.({
        action: feedback.action,
        target: feedback.target,
        text: feedback.text,
        subtitle: feedback.subtitle,
      });
    }

    emitBettingAction({
      phase: sourceState.phase,
      action,
      side: 'opponent',
      hpCommitment,
    });
  }, [addHeroBattlePopup]);

  useEffect(() => {
    let lastSetTime = 0;

    const checkStuckRef = () => {
      if (aiResponseInProgressRef.current) {
        const now = Date.now();
        if (lastSetTime === 0) {
          lastSetTime = now;
          return;
        }
        if (now - lastSetTime >= AI_TIMEOUT_MS) {
          if (COMBAT_DEBUG.AI) debug.warn('[AI Watchdog] Resetting stuck aiResponseInProgressRef');
          aiResponseInProgressRef.current = false;
          lastSetTime = 0;
        }
      } else {
        lastSetTime = 0;
      }
    };

    watchdogTimerRef.current = setInterval(checkStuckRef, 1000);

    return () => {
      if (watchdogTimerRef.current) {
        clearInterval(watchdogTimerRef.current);
      }
    };
  }, [aiResponseInProgressRef]);

  useEffect(() => {
    if (!opponentPlayerId || !combatPhase || !isActive) return;

    if (cardGameMulliganActive) {
      if (COMBAT_DEBUG.AI) debug.ai('[AI Effect] Blocked: card game mulligan still active');
      return;
    }

    const aiPlayerId = opponentPlayerId;
    const isAITurn = activePlayerId === aiPlayerId;

    if (!isAITurn) {
      if (COMBAT_DEBUG.AI) debug.ai('[AI Effect] Not AI turn, activePlayerId:', activePlayerId);
      return;
    }

    const isBettingPhase =
      combatPhase === CombatPhase.PRE_FLOP ||
      combatPhase === CombatPhase.FAITH ||
      combatPhase === CombatPhase.FORESIGHT ||
      combatPhase === CombatPhase.DESTINY;

    if (!isBettingPhase) {
      if (COMBAT_DEBUG.AI) debug.ai('[AI Effect] Not a betting phase:', combatPhase);
      return;
    }

    if (foldWinner || isAllInShowdown) {
      if (COMBAT_DEBUG.AI) debug.ai('[AI Effect] Game over (fold or all-in showdown)');
      return;
    }

    if (aiResponseInProgressRef.current) {
      if (COMBAT_DEBUG.AI) debug.ai('[AI Effect] AI action already in progress');
      return;
    }

    if (COMBAT_DEBUG.AI) {
      debug.ai('[AI Effect] AI turn detected, will act in', AI_RESPONSE_DELAY_MS, 'ms', {
        phase: combatPhase,
        activePlayerId,
        currentBet,
        actionsThisRound
      });
    }

    aiResponseInProgressRef.current = true;

    aiTimerRef.current = setTimeout(() => {
      try {
        const mulliganStillActive = useGameStore.getState().gameState?.mulligan?.active;
        if (mulliganStillActive) {
          aiResponseInProgressRef.current = false;
          return;
        }

        const adapter = getPokerCombatAdapterState();
        const freshState = adapter.combatState;

        if (!freshState) {
          aiResponseInProgressRef.current = false;
          return;
        }

        if (freshState.activePlayerId !== aiPlayerId) {
          if (COMBAT_DEBUG.AI) debug.ai('[AI Effect] No longer AI turn after delay');
          aiResponseInProgressRef.current = false;
          return;
        }

        if (freshState.foldWinner || freshState.isAllInShowdown ||
            freshState.phase === CombatPhase.RESOLUTION) {
          aiResponseInProgressRef.current = false;
          return;
        }

        // Boss escalation is campaign-only: single has no authored config.
        const escalatedConfig = escalatePokerAiConfigForPhase(
          aiConfigRef.current,
          freshState.phase,
        );

        if (COMBAT_DEBUG.AI) {
          debug.ai('[AI Effect] AI making decision now', { aiConfig: escalatedConfig });
        }
        const aiDecision = getSmartAIAction(freshState, false, escalatedConfig);
        if (COMBAT_DEBUG.AI) debug.ai('[AI Effect] AI decision:', aiDecision);
        const legalDecision = deriveLegalPokerAiAction({
          combatState: freshState,
          aiPlayerId,
          proposed: aiDecision,
        });
        if (legalDecision.wasAdjusted && COMBAT_DEBUG.AI) {
          debug.ai('[AI Effect] Adjusted illegal AI poker decision:', {
            proposedAction: legalDecision.proposedAction,
            action: legalDecision.action,
            hpCommitment: legalDecision.hpCommitment,
          });
        }

        adapter.performAction(aiPlayerId, legalDecision.action, legalDecision.hpCommitment);

        presentOpponentAction(freshState, legalDecision.action, legalDecision.hpCommitment);

        setTimeout(() => {
          const adapterAfterAI = getPokerCombatAdapterState();
          if (adapterAfterAI.combatState &&
              adapterAfterAI.combatState.player.isReady &&
              adapterAfterAI.combatState.opponent.isReady &&
              adapterAfterAI.combatState.phase !== CombatPhase.RESOLUTION) {
            adapterAfterAI.maybeCloseBettingRound();
          }
          aiResponseInProgressRef.current = false;
        }, POKER_AI_ACTION_SETTLE_DELAY_MS);

      } catch (error) {
        if (COMBAT_DEBUG.AI) debug.error('[AI Effect] ERROR:', error);
        debug.warn('[AI Effect] SmartAI failed, using emergency fallback decision');

        try {
          const fallbackAdapter = getPokerCombatAdapterState();
          const fallbackState = fallbackAdapter.combatState;

          if (fallbackState && fallbackState.activePlayerId === aiPlayerId) {
            const aiPlayer = fallbackState.opponent;
            const aiHP = aiPlayer.pet.stats.currentHealth;
            const betToCall = Math.max(0, fallbackState.currentBet - aiPlayer.hpCommitted);
            const hasBet = betToCall > 0;

            let fallbackAction: CombatAction;
            let fallbackBetAmount = 0;

            if (hasBet && aiHP < betToCall) {
              fallbackAction = CombatAction.BRACE;
            } else if (!hasBet) {
              fallbackAction = CombatAction.DEFEND;
            } else {
              fallbackAction = CombatAction.ENGAGE;
            }

            debug.warn('[AI Effect] Fallback decision:', fallbackAction);
            const fallbackIntent = deriveLegalPokerAiAction({
              combatState: fallbackState,
              aiPlayerId,
              proposed: {
                action: fallbackAction,
                betAmount: fallbackBetAmount,
                reasoning: 'Emergency fallback decision',
              },
            });
            fallbackAdapter.performAction(aiPlayerId, fallbackIntent.action, fallbackIntent.hpCommitment);
            presentOpponentAction(fallbackState, fallbackIntent.action, fallbackIntent.hpCommitment);

            setTimeout(() => {
              const adapterAfterFallback = getPokerCombatAdapterState();
              if (adapterAfterFallback.combatState &&
                  adapterAfterFallback.combatState.player.isReady &&
                  adapterAfterFallback.combatState.opponent.isReady &&
                  adapterAfterFallback.combatState.phase !== CombatPhase.RESOLUTION) {
                adapterAfterFallback.maybeCloseBettingRound();
              }
              aiResponseInProgressRef.current = false;
            }, POKER_AI_ACTION_SETTLE_DELAY_MS);
          } else {
            aiResponseInProgressRef.current = false;
          }
        } catch (fallbackError) {
          debug.error('[AI Effect] Fallback also failed:', fallbackError);
          aiResponseInProgressRef.current = false;
        }
      }
    }, AI_RESPONSE_DELAY_MS);

    return () => {
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
        aiResponseInProgressRef.current = false;
      }
    };
  }, [
    activePlayerId,
    actionsThisRound,
    aiResponseInProgressRef,
    cardGameMulliganActive,
    combatPhase,
    currentBet,
    foldWinner,
    isActive,
    isAllInShowdown,
    opponentPlayerId,
    presentOpponentAction,
  ]);
}
