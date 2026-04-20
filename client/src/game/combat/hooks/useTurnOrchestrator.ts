/**
 * useTurnOrchestrator - React hook for phase coordination
 * 
 * ARCHITECTURE: Thin wrapper around the TurnOrchestrator for React integration.
 * This hook ONLY tracks phase state - combat logic stays in existing systems.
 * 
 * Use this when you need to:
 * - Know what combat phase is active
 * - React to phase transitions
 * - Sequence phase completion
 * 
 * INTEGRATION:
 * - Uses global orchestrator by default (shared across components)
 * - Set useGlobal=false for isolated instances (testing)
 * - onPhaseChange callback fires on every phase transition
 * 
 * PHASE FLOW:
 * POKER_RESOLUTION → MINION_COMBAT → END_OF_TURN → COMPLETE
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { 
  TurnOrchestrator, 
  TurnPhase, 
  TurnContext,
  turnOrchestrator as globalOrchestrator
} from '../../flow/TurnOrchestrator';

export interface UseTurnOrchestratorReturn {
  currentPhase: TurnPhase;
  context: TurnContext;
  turnNumber: number;
  isPhase: (phase: TurnPhase) => boolean;
  startTurn: (turnNumber: number, currentPlayer: 'player' | 'opponent') => void;
  completePhase: () => TurnPhase | null;
  skipToPhase: (phase: TurnPhase) => void;
  reset: () => void;
}

export interface UseTurnOrchestratorOptions {
  useGlobal?: boolean;
  onPhaseChange?: (from: TurnPhase, to: TurnPhase, context: TurnContext) => void;
}

export function useTurnOrchestrator(
  options: UseTurnOrchestratorOptions = {}
): UseTurnOrchestratorReturn {
  const { useGlobal = true, onPhaseChange } = options;
  
  const orchestratorRef = useRef<TurnOrchestrator>(
    useGlobal ? globalOrchestrator : new TurnOrchestrator()
  );
  
  const [currentPhase, setCurrentPhase] = useState<TurnPhase>(
    orchestratorRef.current.getCurrentPhase()
  );
  const [context, setContext] = useState<TurnContext>(
    orchestratorRef.current.getContext()
  );

  useEffect(() => {
    const unsubscribe = orchestratorRef.current.subscribe((from, to, ctx) => {
      setCurrentPhase(to);
      setContext(ctx);
      onPhaseChange?.(from, to, ctx);
    });

    return unsubscribe;
  }, [onPhaseChange]);

  const isPhase = useCallback((phase: TurnPhase): boolean => {
    return orchestratorRef.current.isPhase(phase);
  }, []);

  const startTurn = useCallback((turnNumber: number, currentPlayer: 'player' | 'opponent') => {
    orchestratorRef.current.startTurn(turnNumber, currentPlayer);
    setCurrentPhase(orchestratorRef.current.getCurrentPhase());
    setContext(orchestratorRef.current.getContext());
  }, []);

  const completePhase = useCallback((): TurnPhase | null => {
    return orchestratorRef.current.completePhase();
  }, []);

  const skipToPhase = useCallback((phase: TurnPhase) => {
    orchestratorRef.current.skipToPhase(phase);
  }, []);

  const reset = useCallback(() => {
    orchestratorRef.current.reset();
    setCurrentPhase(orchestratorRef.current.getCurrentPhase());
    setContext(orchestratorRef.current.getContext());
  }, []);

  return {
    currentPhase,
    context,
    turnNumber: context.turnNumber,
    isPhase,
    startTurn,
    completePhase,
    skipToPhase,
    reset
  };
}
