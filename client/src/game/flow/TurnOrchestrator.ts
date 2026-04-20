/**
 * TurnOrchestrator - Pure coordination layer for combat turn phases
 * 
 * ARCHITECTURE: This is a THIN orchestrator that only tracks phase state and transitions.
 * It does NOT implement any combat logic - that stays in existing modules:
 * - BettingEngine: Poker betting/resolution
 * - MinionBattleResolver: Combat resolution
 * - CombatEventBus: Event coordination
 * - CombatDamageService: Damage application
 * 
 * The orchestrator's only job is to answer:
 * - "What phase are we in?"
 * - "What phase comes next?"
 * - "Notify listeners when phases change"
 * 
 * Combat flow:
 * POKER_RESOLUTION → MINION_COMBAT → END_OF_TURN → COMPLETE
 * 
 * INTEGRATION POINTS:
 * - RagnarokCombatArena.tsx: Uses useTurnOrchestrator hook
 * - handleCombatEnd(): Advances from POKER_RESOLUTION to MINION_COMBAT
 * - Future: Minion combat system will advance from MINION_COMBAT to END_OF_TURN
 * 
 * @see useTurnOrchestrator.ts for React integration
 * @see RagnarokCombatArena.tsx for UI integration
 */

import { debug } from '../config/debugConfig';

export type TurnPhase = 
  | 'POKER_RESOLUTION'
  | 'MINION_COMBAT'
  | 'END_OF_TURN'
  | 'COMPLETE';

export interface TurnContext {
  turnNumber: number;
  currentPlayer: 'player' | 'opponent';
  phaseStartTime: number;
}

export type PhaseChangeListener = (
  from: TurnPhase,
  to: TurnPhase,
  context: TurnContext
) => void;

const PHASE_ORDER: readonly TurnPhase[] = [
  'POKER_RESOLUTION',
  'MINION_COMBAT',
  'END_OF_TURN',
  'COMPLETE'
] as const;

export class TurnOrchestrator {
  private currentPhase: TurnPhase = 'POKER_RESOLUTION';
  private context: TurnContext;
  private listeners: Set<PhaseChangeListener> = new Set();

  constructor() {
    this.context = this.createInitialContext();
  }

  private createInitialContext(): TurnContext {
    return {
      turnNumber: 1,
      currentPlayer: 'player',
      phaseStartTime: Date.now()
    };
  }

  getCurrentPhase(): TurnPhase {
    return this.currentPhase;
  }

  getContext(): TurnContext {
    return { ...this.context };
  }

  getTurnNumber(): number {
    return this.context.turnNumber;
  }

  isPhase(phase: TurnPhase): boolean {
    return this.currentPhase === phase;
  }

  private getNextPhase(current: TurnPhase): TurnPhase | null {
    const currentIndex = PHASE_ORDER.indexOf(current);
    if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) {
      return null;
    }
    return PHASE_ORDER[currentIndex + 1];
  }

  subscribe(listener: PhaseChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(from: TurnPhase, to: TurnPhase): void {
    this.listeners.forEach(listener => {
      try {
        listener(from, to, this.context);
      } catch (err) {
        debug.error('[TurnOrchestrator] Listener error:', err);
      }
    });
  }

  startTurn(turnNumber: number, currentPlayer: 'player' | 'opponent'): void {
    this.currentPhase = 'POKER_RESOLUTION';
    this.context = {
      turnNumber,
      currentPlayer,
      phaseStartTime: Date.now()
    };
  }

  completePhase(): TurnPhase | null {
    const previousPhase = this.currentPhase;
    const nextPhase = this.getNextPhase(this.currentPhase);

    if (nextPhase) {
      this.currentPhase = nextPhase;
      this.context.phaseStartTime = Date.now();
      this.notifyListeners(previousPhase, nextPhase);
    }

    return nextPhase;
  }

  skipToPhase(phase: TurnPhase): void {
    const previousPhase = this.currentPhase;
    if (previousPhase !== phase) {
      this.currentPhase = phase;
      this.context.phaseStartTime = Date.now();
      this.notifyListeners(previousPhase, phase);
    }
  }

  reset(): void {
    this.currentPhase = 'POKER_RESOLUTION';
    this.context = this.createInitialContext();
  }
}

export const turnOrchestrator = new TurnOrchestrator();
