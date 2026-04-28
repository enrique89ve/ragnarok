/*
  Pure invariants and predicates over RoundFlowState.

  All functions are total, side-effect free, and safe to call from
  render code. They derive their answer from the discriminator alone
  — no hidden context, no clock.
*/

import type { RoundFlowState, FlowEvent } from './types';
import { nextState } from './transitions';

/*
  True iff `event` would cause `state` to transition to a NEW state.
  Implemented via reference equality against `nextState` — invalid
  transitions return the same state object by contract, so `!==` is
  the canonical check.
*/
export function canTransition(
	state: RoundFlowState,
	event: FlowEvent
): boolean {
	return nextState(state, event) !== state;
}

/*
  True during the active combat handoff (VS screen and poker phases).
  Useful for suppressing chess-side input during the duel.
*/
export function isInActiveCombat(state: RoundFlowState): boolean {
	return state.tag === 'vs_screen' || state.tag === 'poker_combat';
}

/*
  True on any game_over sub-state. Phase components should usually
  branch on `state.tag` directly; this exists for callers that only
  care about "is the round finished?" without sub-routing.
*/
export function isGameOver(state: RoundFlowState): boolean {
	return state.tag === 'game_over';
}

/*
  True for the pre-chess narrative phases (cinematic + mission_intro).
  Useful to gate audio cues, tutorials, or analytics that should fire
  exactly once per match before play starts.
*/
export function isPreMatch(state: RoundFlowState): boolean {
	return state.tag === 'cinematic' || state.tag === 'mission_intro';
}
