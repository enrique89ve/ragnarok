/*
  Game Flow — pure TypeScript modules. No React.

  Two layers live here:
    - flow/round/ — the round-level FSM (cinematic → chess → vs →
      poker → game_over). Consumed by useGameFlowStore.
    - TurnManager / TurnOrchestrator / MinionBattleResolver — combat
      sub-systems that operate on the chess board.
*/

export {
	type RoundFlowState,
	type FlowEvent,
	type InitialFlowInput,
	type PostCinematicPlan,
	type CinematicData,
	type MissionIntroData,
	type CombatPieces,
	type CombatHandoff,
	type GameResult,
	initialState,
} from './round/types';

export { nextState } from './round/transitions';

export {
	canTransition,
	isInActiveCombat,
	isGameOver,
	isPreMatch,
} from './round/guards';

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
