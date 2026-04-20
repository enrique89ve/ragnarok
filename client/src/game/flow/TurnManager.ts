/**
 * TurnManager - Pure TypeScript Turn Control
 * 
 * Manages turn order, timers, and turn-based effects.
 * No React dependencies.
 */

export type TurnOwner = 'player' | 'opponent';

export interface TurnState {
  currentTurn: TurnOwner;
  turnNumber: number;
  turnStartTime: number;
  turnTimeLimit: number;
  timeRemaining: number;
  isPaused: boolean;
  actionsThisTurn: number;
  maxActionsPerTurn: number;
}

export interface TurnEvent {
  type: 'TURN_START' | 'TURN_END' | 'ACTION_TAKEN' | 'TIME_WARNING' | 'TIME_EXPIRED';
  turn: TurnOwner;
  turnNumber: number;
  timestamp: number;
}

export class TurnManager {
  private state: TurnState;
  private timerInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(event: TurnEvent) => void> = new Set();

  constructor(
    firstTurn: TurnOwner = 'player',
    turnTimeLimit: number = 90,
    maxActionsPerTurn: number = 1
  ) {
    this.state = {
      currentTurn: firstTurn,
      turnNumber: 1,
      turnStartTime: Date.now(),
      turnTimeLimit,
      timeRemaining: turnTimeLimit,
      isPaused: false,
      actionsThisTurn: 0,
      maxActionsPerTurn,
    };
  }

  getState(): TurnState {
    return { ...this.state };
  }

  getCurrentTurn(): TurnOwner {
    return this.state.currentTurn;
  }

  isPlayerTurn(): boolean {
    return this.state.currentTurn === 'player';
  }

  getTurnNumber(): number {
    return this.state.turnNumber;
  }

  getTimeRemaining(): number {
    return this.state.timeRemaining;
  }

  canTakeAction(): boolean {
    return this.state.actionsThisTurn < this.state.maxActionsPerTurn;
  }

  takeAction(): boolean {
    if (!this.canTakeAction()) {
      return false;
    }

    this.state.actionsThisTurn++;
    this.emit({
      type: 'ACTION_TAKEN',
      turn: this.state.currentTurn,
      turnNumber: this.state.turnNumber,
      timestamp: Date.now(),
    });

    return true;
  }

  startTurn(turn: TurnOwner): void {
    this.state.currentTurn = turn;
    this.state.turnStartTime = Date.now();
    this.state.timeRemaining = this.state.turnTimeLimit;
    this.state.actionsThisTurn = 0;
    this.state.isPaused = false;

    this.emit({
      type: 'TURN_START',
      turn,
      turnNumber: this.state.turnNumber,
      timestamp: Date.now(),
    });

    this.startTimer();
  }

  endTurn(): TurnOwner {
    this.stopTimer();

    const endedTurn = this.state.currentTurn;
    this.emit({
      type: 'TURN_END',
      turn: endedTurn,
      turnNumber: this.state.turnNumber,
      timestamp: Date.now(),
    });

    const nextTurn: TurnOwner = endedTurn === 'player' ? 'opponent' : 'player';
    
    if (nextTurn === 'player') {
      this.state.turnNumber++;
    }

    this.startTurn(nextTurn);
    return nextTurn;
  }

  pause(): void {
    this.state.isPaused = true;
    this.stopTimer();
  }

  resume(): void {
    this.state.isPaused = false;
    this.startTimer();
  }

  private startTimer(): void {
    this.stopTimer();

    this.timerInterval = setInterval(() => {
      if (this.state.isPaused) return;

      this.state.timeRemaining--;

      if (this.state.timeRemaining === 15) {
        this.emit({
          type: 'TIME_WARNING',
          turn: this.state.currentTurn,
          turnNumber: this.state.turnNumber,
          timestamp: Date.now(),
        });
      }

      if (this.state.timeRemaining <= 0) {
        this.emit({
          type: 'TIME_EXPIRED',
          turn: this.state.currentTurn,
          turnNumber: this.state.turnNumber,
          timestamp: Date.now(),
        });
        this.endTurn();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  subscribe(listener: (event: TurnEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: TurnEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  reset(): void {
    this.stopTimer();
    this.state = {
      currentTurn: 'player',
      turnNumber: 1,
      turnStartTime: Date.now(),
      turnTimeLimit: this.state.turnTimeLimit,
      timeRemaining: this.state.turnTimeLimit,
      isPaused: false,
      actionsThisTurn: 0,
      maxActionsPerTurn: this.state.maxActionsPerTurn,
    };
  }

  destroy(): void {
    this.stopTimer();
    this.listeners.clear();
  }
}
