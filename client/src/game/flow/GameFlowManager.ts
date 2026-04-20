/**
 * GameFlowManager - Pure TypeScript State Machine
 * 
 * Manages the complete game flow from menu to match end.
 * No React dependencies - can be used for testing, AI, and server validation.
 * 
 * Flow: MAIN_MENU → ARMY_SELECTION → CHESS_BOARD → POKER_COMBAT → MATCH_END
 */

export type GamePhase =
  | 'MAIN_MENU'
  | 'ARMY_SELECTION'
  | 'LOADING_MATCH'
  | 'CHESS_BOARD'
  | 'POKER_COMBAT'
  | 'MINION_COMBAT'
  | 'MATCH_END'
  | 'REWARDS';

export type GamePhaseTransition =
  | 'START_GAME'
  | 'SELECT_ARMY'
  | 'CONFIRM_ARMY'
  | 'START_CHESS'
  | 'INITIATE_COMBAT'
  | 'START_POKER'
  | 'END_POKER'
  | 'START_MINION_BATTLE'
  | 'END_MINION_BATTLE'
  | 'MATCH_VICTORY'
  | 'MATCH_DEFEAT'
  | 'CLAIM_REWARDS'
  | 'RETURN_TO_MENU'
  | 'REMATCH';

export interface MatchState {
  matchId: string;
  playerArmy: ArmyConfig | null;
  opponentArmy: ArmyConfig | null;
  currentRound: number;
  playerScore: number;
  opponentScore: number;
  startTime: number;
  endTime: number | null;
  winner: 'player' | 'opponent' | null;
}

export interface ArmyConfig {
  kingId: string;
  heroIds: string[];
  deckIds: number[];
}

export interface GameFlowState {
  phase: GamePhase;
  previousPhase: GamePhase | null;
  match: MatchState | null;
  isLoading: boolean;
  error: string | null;
}

const VALID_TRANSITIONS: Record<GamePhase, GamePhaseTransition[]> = {
  MAIN_MENU: ['START_GAME', 'SELECT_ARMY'],
  ARMY_SELECTION: ['CONFIRM_ARMY', 'RETURN_TO_MENU'],
  LOADING_MATCH: ['START_CHESS'],
  CHESS_BOARD: ['INITIATE_COMBAT', 'MATCH_VICTORY', 'MATCH_DEFEAT'],
  POKER_COMBAT: ['END_POKER', 'MATCH_VICTORY', 'MATCH_DEFEAT'],
  MINION_COMBAT: ['END_MINION_BATTLE', 'MATCH_VICTORY', 'MATCH_DEFEAT'],
  MATCH_END: ['CLAIM_REWARDS', 'RETURN_TO_MENU', 'REMATCH'],
  REWARDS: ['RETURN_TO_MENU', 'REMATCH'],
};

const TRANSITION_TARGET: Record<GamePhaseTransition, GamePhase> = {
  START_GAME: 'ARMY_SELECTION',
  SELECT_ARMY: 'ARMY_SELECTION',
  CONFIRM_ARMY: 'LOADING_MATCH',
  START_CHESS: 'CHESS_BOARD',
  INITIATE_COMBAT: 'POKER_COMBAT',
  START_POKER: 'POKER_COMBAT',
  END_POKER: 'CHESS_BOARD',
  START_MINION_BATTLE: 'MINION_COMBAT',
  END_MINION_BATTLE: 'CHESS_BOARD',
  MATCH_VICTORY: 'MATCH_END',
  MATCH_DEFEAT: 'MATCH_END',
  CLAIM_REWARDS: 'REWARDS',
  RETURN_TO_MENU: 'MAIN_MENU',
  REMATCH: 'ARMY_SELECTION',
};

export class GameFlowManager {
  private state: GameFlowState;
  private listeners: Set<(state: GameFlowState) => void> = new Set();

  constructor(initialPhase: GamePhase = 'MAIN_MENU') {
    this.state = {
      phase: initialPhase,
      previousPhase: null,
      match: null,
      isLoading: false,
      error: null,
    };
  }

  getState(): GameFlowState {
    return { ...this.state };
  }

  getPhase(): GamePhase {
    return this.state.phase;
  }

  getMatch(): MatchState | null {
    return this.state.match ? { ...this.state.match } : null;
  }

  canTransition(transition: GamePhaseTransition): boolean {
    const validTransitions = VALID_TRANSITIONS[this.state.phase];
    return validTransitions.includes(transition);
  }

  getValidTransitions(): GamePhaseTransition[] {
    return [...VALID_TRANSITIONS[this.state.phase]];
  }

  transition(transition: GamePhaseTransition): boolean {
    if (!this.canTransition(transition)) {
      this.state.error = `Invalid transition: ${transition} from ${this.state.phase}`;
      this.notifyListeners();
      return false;
    }

    const targetPhase = TRANSITION_TARGET[transition];
    this.state.previousPhase = this.state.phase;
    this.state.phase = targetPhase;
    this.state.error = null;

    if (transition === 'CONFIRM_ARMY') {
      this.state.isLoading = true;
    } else if (transition === 'START_CHESS') {
      this.state.isLoading = false;
    }

    if (transition === 'RETURN_TO_MENU') {
      this.state.match = null;
    }

    this.notifyListeners();
    return true;
  }

  startMatch(playerArmy: ArmyConfig, opponentArmy: ArmyConfig): void {
    this.state.match = {
      matchId: this.generateMatchId(),
      playerArmy,
      opponentArmy,
      currentRound: 1,
      playerScore: 0,
      opponentScore: 0,
      startTime: Date.now(),
      endTime: null,
      winner: null,
    };
    this.notifyListeners();
  }

  incrementRound(): void {
    if (this.state.match) {
      this.state.match.currentRound++;
      this.notifyListeners();
    }
  }

  updateScore(player: 'player' | 'opponent', points: number): void {
    if (this.state.match) {
      if (player === 'player') {
        this.state.match.playerScore += points;
      } else {
        this.state.match.opponentScore += points;
      }
      this.notifyListeners();
    }
  }

  endMatch(winner: 'player' | 'opponent'): void {
    if (this.state.match) {
      this.state.match.winner = winner;
      this.state.match.endTime = Date.now();
      this.transition(winner === 'player' ? 'MATCH_VICTORY' : 'MATCH_DEFEAT');
    }
  }

  subscribe(listener: (state: GameFlowState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const currentState = this.getState();
    this.listeners.forEach((listener) => listener(currentState));
  }

  private generateMatchId(): string {
    return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  reset(): void {
    this.state = {
      phase: 'MAIN_MENU',
      previousPhase: null,
      match: null,
      isLoading: false,
      error: null,
    };
    this.notifyListeners();
  }

  serialize(): string {
    return JSON.stringify(this.state);
  }

  deserialize(json: string): boolean {
    try {
      const parsed = JSON.parse(json) as GameFlowState;
      this.state = parsed;
      this.notifyListeners();
      return true;
    } catch {
      return false;
    }
  }
}

export const gameFlowManager = new GameFlowManager();
