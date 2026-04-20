/**
 * Consolidated Zustand Stores - Export Index
 * 
 * New unified stores for game state management.
 * Components should migrate to these from scattered stores.
 */

export {
  useGameFlowStore,
  type GamePhase,
  type GamePhaseTransition,
  type MatchState,
  type ArmyConfig,
} from './gameFlowStore';

export {
  useUnifiedCombatStore,
  type CombatPhase,
  type PokerPhase,
  type PokerState,
  type ChessPieceState,
  type SharedDeckState,
  type CombatLogEntry,
} from './unifiedCombatStore';

export { useSeasonStore } from './seasonStore';

export {
  useUnifiedUIStore,
  type AnimationType,
  type AnnouncementType,
  type Animation,
  type ActionAnnouncement,
  type TargetingState,
  type ActivityLogEntry,
  type TooltipState,
  type ModalState,
  getAnnouncementConfig,
  fireAnnouncement,
} from './unifiedUIStore';
