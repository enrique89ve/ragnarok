/**
 * Game Flow Module Exports
 * 
 * Pure TypeScript modules for game logic - no React dependencies.
 */

export {
  GameFlowManager,
  gameFlowManager,
  type GamePhase,
  type GamePhaseTransition,
  type GameFlowState,
  type MatchState,
  type ArmyConfig,
} from './GameFlowManager';

export {
  TurnManager,
  type TurnOwner,
  type TurnState,
  type TurnEvent,
} from './TurnManager';

export {
  MinionBattleResolver,
  minionBattleResolver,
  type MinionState,
  type HeroState,
  type BattlefieldState,
  type CombatResult,
  type StatusEffect,
} from './MinionBattleResolver';

export {
  TurnOrchestrator,
  turnOrchestrator,
  type TurnPhase,
  type TurnContext,
  type PhaseChangeListener,
} from './TurnOrchestrator';
