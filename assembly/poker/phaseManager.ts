/**
 * PhaseManager for AssemblyScript.
 * Port of client/src/game/combat/modules/PhaseManager.ts
 * Pure state machine for combat phase transitions.
 */

import {
	PHASE_FIRST_STRIKE,
	PHASE_MULLIGAN,
	PHASE_SPELL_PET,
	PHASE_PRE_FLOP,
	PHASE_FAITH,
	PHASE_FORESIGHT,
	PHASE_DESTINY,
	PHASE_RESOLUTION,
	ROUND_PREFLOP,
	ROUND_FLOP,
	ROUND_TURN,
	ROUND_RIVER,
} from '../types/PokerTypes';

const PHASE_ORDER: i32[] = [
	PHASE_FIRST_STRIKE,
	PHASE_MULLIGAN,
	PHASE_SPELL_PET,
	PHASE_PRE_FLOP,
	PHASE_FAITH,
	PHASE_FORESIGHT,
	PHASE_DESTINY,
	PHASE_RESOLUTION,
];

/** Get the next phase in sequence */
export function getNextPhase(currentPhase: i32): i32 {
	for (let i = 0; i < PHASE_ORDER.length - 1; i++) {
		if (PHASE_ORDER[i] == currentPhase) {
			return PHASE_ORDER[i + 1];
		}
	}
	return PHASE_RESOLUTION;
}

/** Map phase to betting round (-1 = no betting in this phase) */
export function getBettingRound(phase: i32): i32 {
	if (phase == PHASE_PRE_FLOP) return ROUND_PREFLOP;
	if (phase == PHASE_FAITH) return ROUND_FLOP;
	if (phase == PHASE_FORESIGHT) return ROUND_TURN;
	if (phase == PHASE_DESTINY) return ROUND_RIVER;
	return -1;
}

/** Is this a phase where betting occurs? */
export function isBettingPhase(phase: i32): bool {
	return phase == PHASE_PRE_FLOP
		|| phase == PHASE_FAITH
		|| phase == PHASE_FORESIGHT
		|| phase == PHASE_DESTINY;
}

/** Is this a phase where community cards are revealed? */
export function isRevealPhase(phase: i32): bool {
	return phase == PHASE_FAITH
		|| phase == PHASE_FORESIGHT
		|| phase == PHASE_DESTINY;
}

/** How many NEW community cards are revealed in this phase */
export function getCommunityCardsToReveal(phase: i32): i32 {
	if (phase == PHASE_FAITH) return 3;
	if (phase == PHASE_FORESIGHT) return 1;
	if (phase == PHASE_DESTINY) return 1;
	return 0;
}

/** Total community cards visible at the START of this phase */
export function getTotalCommunityCards(phase: i32): i32 {
	if (phase <= PHASE_SPELL_PET) return 0;
	if (phase == PHASE_PRE_FLOP) return 0;
	if (phase == PHASE_FAITH) return 3;
	if (phase == PHASE_FORESIGHT) return 4;
	return 5;
}
