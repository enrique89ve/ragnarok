import { useEffect, useRef } from 'react';
import { CombatPhase, PokerCombatState } from '../../types/PokerCombatTypes';
import { getPokerCombatAdapterState } from '../../hooks/usePokerCombatAdapter';
import { useGameStore } from '../../stores/gameStore';
import { debug } from '../../config/debugConfig';
import type { PokerTurnProcessMode } from '../decision/pokerTurnPolicy';
import { shouldPrepareLocalAiCards } from '../decision/pokerAiCardSetup';

interface UsePokerPhasesOptions {
  combatState: PokerCombatState | null;
  isActive: boolean;
  processMode: PokerTurnProcessMode;
}

export function usePokerPhases(options: UsePokerPhasesOptions): void {
  const { combatState, isActive, processMode } = options;
  const allInAdvanceInProgressRef = useRef(false);
  const opponentSpellPetSetupKeyRef = useRef<string | null>(null);

  const cardGameMulliganActive = useGameStore(state => state.gameState?.mulligan?.active);

  useEffect(() => {
    if (!combatState || !isActive) return;
    if (combatState.phase === CombatPhase.MULLIGAN) return;
    if (cardGameMulliganActive) {
      debug.combat('[Poker auxiliary phase] Blocked: card game mulligan still active');
      return;
    }
	const setupKey = `${combatState.combatId}:${combatState.handNumber}:${combatState.phase}:${combatState.actionsThisRound}`;
    if (!shouldPrepareLocalAiCards({
      phase: combatState.phase,
      isActive,
      isMulliganActive: Boolean(cardGameMulliganActive),
      processMode,
      setupAlreadyApplied: opponentSpellPetSetupKeyRef.current === setupKey,
    })) {
      return;
    }

    useGameStore.getState().setupOpponentSpellPetCards();
    opponentSpellPetSetupKeyRef.current = setupKey;

    const adapter = getPokerCombatAdapterState();
    const freshState = adapter.combatState;
    if (!freshState || freshState.combatId !== combatState.combatId) {
      return;
    }
  }, [combatState?.combatId, combatState?.handNumber, combatState?.phase, isActive, cardGameMulliganActive, processMode]);

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
