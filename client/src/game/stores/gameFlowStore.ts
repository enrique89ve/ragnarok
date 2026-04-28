/*
  GameFlowStore — round-level FSM Zustand wrapper.

  Holds a single `current: RoundFlowState | null` and exposes start/
  dispatch/clear actions that delegate to the pure FSM in
  `client/src/game/flow/round/`. The store does NOT own any
  transition logic — it is just the React-facing carrier so phase
  components can subscribe via selectors.

  Design notes:
    - No persist. Round-flow is intra-match ephemeral; reentering
      /game from /warband or /campaign should produce a clean slate,
      not rehydrate a half-finished match.
    - Module-load cleanup wipes the v1 'ragnarok-game-flow' localStorage
      payload (legacy GameFlowManager-backed shape) so users with stale
      v1 data don't carry orphaned keys forever.
    - dispatch() ignores events when current is null. Callers must
      start() before dispatching — there is no implicit boot.
*/

import { create } from 'zustand';
import type {
	RoundFlowState,
	FlowEvent,
	InitialFlowInput,
} from '../flow/round/types';
import { initialState } from '../flow/round/types';
import { nextState } from '../flow/round/transitions';

const LEGACY_STORAGE_KEY = 'ragnarok-game-flow';

if (typeof localStorage !== 'undefined') {
	try {
		localStorage.removeItem(LEGACY_STORAGE_KEY);
	} catch {
		// localStorage can throw in private mode / disabled storage —
		// failure to clean up legacy data is not fatal.
	}
}

export type GameFlowStore = {
	readonly current: RoundFlowState | null;
	readonly start: (input: InitialFlowInput) => void;
	readonly dispatch: (event: FlowEvent) => void;
	readonly clear: () => void;
};

export const useGameFlowStore = create<GameFlowStore>()((set) => ({
	current: null,

	start: (input) => {
		set({ current: initialState(input) });
	},

	dispatch: (event) => {
		set((s) =>
			s.current === null ? s : { current: nextState(s.current, event) }
		);
	},

	clear: () => {
		set({ current: null });
	},
}));

/* ============================================================
   Selectors — colocated for ergonomic, type-safe consumption.
   ============================================================ */

export function selectFlowState(s: GameFlowStore): RoundFlowState | null {
	return s.current;
}

export function selectFlowTag(s: GameFlowStore): RoundFlowState['tag'] | null {
	return s.current === null ? null : s.current.tag;
}
