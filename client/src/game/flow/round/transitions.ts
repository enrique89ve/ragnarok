/*
  Pure (state, event) → state' transition function.

  Contract:
    - Total: exhaustive over every (tag, type) pair via a final
      `never` assignment.
    - Pure: no side effects, no clock, no I/O.
    - Idempotent on invalid events: returns the same state reference
      (object identity) so canTransition() can compare with `===`.

  Rules of thumb when extending:
    - A new tag → add a case branch + cover it in tests.
    - A new event → add it inside the right tag's case + add a test
      asserting it gets ignored from every OTHER tag.
*/

import type { RoundFlowState, FlowEvent } from './types';

export function nextState(
	state: RoundFlowState,
	event: FlowEvent
): RoundFlowState {
	switch (state.tag) {
		case 'cinematic': {
			if (event.type !== 'CINEMATIC_DONE') return state;
			return event.next.kind === 'intro'
				? { tag: 'mission_intro', mission: event.next.mission }
				: { tag: 'chess' };
		}

		case 'mission_intro': {
			if (event.type !== 'INTRO_DONE') return state;
			return { tag: 'chess' };
		}

		case 'chess': {
			if (event.type === 'COMBAT_TRIGGERED') {
				return { tag: 'vs_screen', pieces: event.pieces };
			}
			if (event.type === 'GAME_ENDED') {
				return {
					tag: 'game_over',
					result: event.result,
					sub: event.initialSub,
				};
			}
			return state;
		}

		case 'vs_screen': {
			if (event.type !== 'VS_COMPLETE') return state;
			return { tag: 'poker_combat', handoff: event.handoff };
		}

		case 'poker_combat': {
			if (event.type !== 'COMBAT_RESOLVED') return state;
			return { tag: 'chess' };
		}

		case 'game_over': {
			if (event.type !== 'GAME_OVER_ADVANCE') return state;
			return { ...state, sub: event.nextSub };
		}

		default: {
			const _exhaustive: never = state;
			return _exhaustive;
		}
	}
}
