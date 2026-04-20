import { useEffect, useRef } from 'react';
import { CombatAction, CombatPhase, PokerCombatState } from '../../types/PokerCombatTypes';
import { getPokerCombatAdapterState } from '../../hooks/usePokerCombatAdapter';
import { getSmartAIAction } from '../modules/SmartAI';
import { useGameStore } from '../../stores/gameStore';
import { COMBAT_DEBUG } from '../debugConfig';
import { debug } from '../../config/debugConfig';
import { ALL_NORSE_HEROES } from '../../data/norseHeroes';
import type { BattlePopupAction, BattlePopupTarget } from '../components/HeroBattlePopup';
import { useCampaignStore, getMission } from '../../campaign';
import { profileToSmartAIConfig } from '../../campaign/campaignTypes';

interface UsePokerAIOptions {
  combatState: PokerCombatState | null;
  isActive: boolean;
  aiResponseInProgressRef: React.MutableRefObject<boolean>;
  addHeroBattlePopup?: (params: { action: BattlePopupAction; target: BattlePopupTarget; text: string; subtitle?: string }) => void;
}

const AI_RESPONSE_DELAY_MS = 600;
const AI_TIMEOUT_MS = 5000;

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

  /*
    Look up the active campaign mission to derive the AI config used in
    combat. Outside of campaign mode (PvP, dev test, etc.) `currentMission`
    is null and we fall back to SmartAI's DEFAULT_AI_CONFIG. Inside a
    campaign mission, the mission's hand-tuned AIBehaviorProfile is run
    through profileToSmartAIConfig() with the active difficulty so the
    AI actually plays differently per boss AND per difficulty tier.

    Before this fix, all 41 mission AI profiles were dead data —
    getSmartAIAction was called with no config arg so DEFAULT_AI_CONFIG
    won every time, regardless of mission or difficulty.

    A ref captures the latest value so the 600ms-deferred AI decision
    timer reads the current config when it fires, not the stale value
    from when the effect was scheduled.
  */
  const currentMissionId = useCampaignStore(s => s.currentMission);
  const currentDifficulty = useCampaignStore(s => s.currentDifficulty);
  const aiConfigRef = useRef<{ aggressiveness: number; bluffFrequency: number; tightness: number } | undefined>(undefined);
  useEffect(() => {
    if (currentMissionId) {
      const found = getMission(currentMissionId);
      if (found?.mission?.aiProfile) {
        aiConfigRef.current = profileToSmartAIConfig(found.mission.aiProfile, currentDifficulty);
      } else {
        aiConfigRef.current = undefined;
      }
    } else {
      aiConfigRef.current = undefined;
    }
  }, [currentMissionId, currentDifficulty]);

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
    if (!combatState || !isActive) return;

    if (cardGameMulliganActive) {
      if (COMBAT_DEBUG.AI) debug.ai('[AI Effect] Blocked: card game mulligan still active');
      return;
    }

    const aiPlayerId = combatState.opponent.playerId;
    const isAITurn = combatState.activePlayerId === aiPlayerId;

    if (!isAITurn) {
      if (COMBAT_DEBUG.AI) debug.ai('[AI Effect] Not AI turn, activePlayerId:', combatState.activePlayerId);
      return;
    }

    const isBettingPhase =
      combatState.phase === CombatPhase.PRE_FLOP ||
      combatState.phase === CombatPhase.FAITH ||
      combatState.phase === CombatPhase.FORESIGHT ||
      combatState.phase === CombatPhase.DESTINY;

    if (!isBettingPhase) {
      if (COMBAT_DEBUG.AI) debug.ai('[AI Effect] Not a betting phase:', combatState.phase);
      return;
    }

    if (combatState.foldWinner || combatState.isAllInShowdown) {
      if (COMBAT_DEBUG.AI) debug.ai('[AI Effect] Game over (fold or all-in showdown)');
      return;
    }

    if (aiResponseInProgressRef.current) {
      if (COMBAT_DEBUG.AI) debug.ai('[AI Effect] AI action already in progress');
      return;
    }

    if (COMBAT_DEBUG.AI) {
      debug.ai('[AI Effect] AI turn detected, will act in', AI_RESPONSE_DELAY_MS, 'ms', {
        phase: combatState.phase,
        activePlayerId: combatState.activePlayerId,
        currentBet: combatState.currentBet,
        actionsThisRound: combatState.actionsThisRound
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

        // Boss escalation — ramp aggression/bluff as poker phases advance.
        // PRE_FLOP/FAITH = early (baseline), FORESIGHT = mid (+15%),
        // DESTINY = late (+30%). Creates the cinematic feel of a boss
        // becoming more desperate as the hand plays out.
        let escalatedConfig = aiConfigRef.current;
        if (escalatedConfig) {
          const phaseEsc =
            freshState.phase === CombatPhase.DESTINY ? 0.30 :
            freshState.phase === CombatPhase.FORESIGHT ? 0.15 : 0;
          if (phaseEsc > 0) {
            escalatedConfig = {
              aggressiveness: Math.min(1, escalatedConfig.aggressiveness + phaseEsc),
              bluffFrequency: Math.min(1, escalatedConfig.bluffFrequency + phaseEsc * 0.5),
              tightness: Math.max(0, escalatedConfig.tightness - phaseEsc * 0.4),
            };
          }
        }

        if (COMBAT_DEBUG.AI) {
          debug.ai('[AI Effect] AI making decision now', { aiConfig: escalatedConfig });
        }
        const aiDecision = getSmartAIAction(freshState, false, escalatedConfig);
        if (COMBAT_DEBUG.AI) debug.ai('[AI Effect] AI decision:', aiDecision);

        adapter.performAction(aiPlayerId, aiDecision.action, aiDecision.betAmount);

        // Fire dramatic announcement for opponent poker actions
        const heroId = freshState.opponent.pet.norseHeroId;
        const hero = heroId ? ALL_NORSE_HEROES[heroId] : null;
        const heroName = hero?.name || 'Opponent';

        if (aiDecision.action === CombatAction.ATTACK) {
          const amount = aiDecision.betAmount || freshState.currentBet || 0;
          addHeroBattlePopup?.({ action: 'attack', target: 'opponent', text: `${heroName} attacks for ${amount} HP!`, subtitle: 'Match or brace!' });
        } else if (aiDecision.action === CombatAction.COUNTER_ATTACK) {
          const amount = aiDecision.betAmount || 0;
          addHeroBattlePopup?.({ action: 'counter_attack', target: 'opponent', text: `${heroName} counters ${amount} HP!`, subtitle: 'The stakes grow higher!' });
        } else if (aiDecision.action === CombatAction.ENGAGE) {
          addHeroBattlePopup?.({ action: 'engage', target: 'both', text: `${heroName} engages!`, subtitle: 'Matched your attack' });
        } else if (aiDecision.action === CombatAction.BRACE) {
          addHeroBattlePopup?.({ action: 'brace', target: 'opponent', text: `${heroName} braces!`, subtitle: 'They yield the round' });
        }

        setTimeout(() => {
          const adapterAfterAI = getPokerCombatAdapterState();
          if (adapterAfterAI.combatState &&
              adapterAfterAI.combatState.player.isReady &&
              adapterAfterAI.combatState.opponent.isReady &&
              adapterAfterAI.combatState.phase !== CombatPhase.RESOLUTION) {
            adapterAfterAI.maybeCloseBettingRound();
          }
          aiResponseInProgressRef.current = false;
        }, 100);

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
            fallbackAdapter.performAction(aiPlayerId, fallbackAction, fallbackBetAmount);

            setTimeout(() => {
              const adapterAfterFallback = getPokerCombatAdapterState();
              if (adapterAfterFallback.combatState &&
                  adapterAfterFallback.combatState.player.isReady &&
                  adapterAfterFallback.combatState.opponent.isReady &&
                  adapterAfterFallback.combatState.phase !== CombatPhase.RESOLUTION) {
                adapterAfterFallback.maybeCloseBettingRound();
              }
              aiResponseInProgressRef.current = false;
            }, 100);
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
  }, [combatState?.activePlayerId, combatState?.phase, combatState?.foldWinner,
      combatState?.isAllInShowdown, isActive, aiResponseInProgressRef, cardGameMulliganActive, addHeroBattlePopup]);
}
